#!/usr/bin/env node
// Upload the game's art and sounds to a Supabase Storage bucket.
//
//   node scripts/sync-assets.mjs            # upload what changed
//   node scripts/sync-assets.mjs --all      # upload everything again
//   node scripts/sync-assets.mjs --dry      # list what would be uploaded, upload nothing
//
// Needs two environment variables (see .env.example; the npm scripts read them from .env.local):
//   SUPABASE_URL             e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  the service_role key (full access, never exposed to the browser)
//
// The files under `public/` are mirrored into the bucket with the same paths, so
// 'dragons/black_dragon/rig.json' in the bucket is served at
// <bucket public url>/dragons/black_dragon/rig.json - which is what `assetUrl()` builds.
//
// A file is skipped when the bucket already holds one of the same size, so repeated runs are
// cheap. Pass --all to ignore that and overwrite everything.

import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const BUCKET = process.env.SUPABASE_BUCKET || 'assets';

const argv = new Set(process.argv.slice(2));
const DRY = argv.has('--dry');
const ALL = argv.has('--all');

const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if ((!url || !key) && !DRY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Copy .env.example to .env.local (or export them) and run again.');
  process.exit(1);
}

/** Every file under `dir`, as paths relative to it. */
async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full, base));
    else out.push(relative(base, full).split(/[\\/]/).join('/'));
  }
  return out;
}

const headers = (extra = {}) => ({
  apikey: key,
  authorization: `Bearer ${key}`,
  ...extra,
});

/** The size the bucket already holds for this path, or null when it is not there. */
async function remoteSize(path) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'HEAD',
    headers: headers(),
  });
  // Supabase answers a missing object with 400 ("Object not found"), not 404
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`HEAD ${path}: ${res.status} ${await res.text()}`);
  const len = res.headers.get('content-length');
  return len === null ? null : Number(len);
}

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
};

/** Create the bucket (public: the game fetches the art without a token) when it does not exist yet. */
async function ensureBucket() {
  const res = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers: headers() });
  if (res.ok) {
    const bucket = await res.json();
    if (!bucket.public) console.warn(`Bucket "${BUCKET}" is private: make it public or the game cannot load the art.`);
    return;
  }
  const made = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (!made.ok) throw new Error(`create bucket ${BUCKET}: ${made.status} ${await made.text()}`);
  console.log(`Created public bucket "${BUCKET}".`);
}
if (!DRY) await ensureBucket();

const files = (await walk(PUBLIC)).sort();
let uploaded = 0, skipped = 0, failed = 0;
const t0 = Date.now();

for (const path of files) {
  const full = join(PUBLIC, path);
  const local = await stat(full);
  try {
    if (!ALL && !DRY) {
      const remote = await remoteSize(path);
      if (remote !== null && remote === local.size) { skipped++; continue; }
    }
    if (DRY) {
      console.log(`would upload  ${path}  (${local.size} B)`);
      uploaded++;
      continue;
    }
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: headers({
        'content-type': MIME[extname(path).toLowerCase()] || 'application/octet-stream',
        'x-upsert': 'true',
        'cache-control': '31536000',   // the art changes rarely: let the CDN keep it for a year
      }),
      body: createReadStream(full),
      duplex: 'half',
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    uploaded++;
    if (uploaded % 50 === 0) console.log(`  ... ${uploaded} uploaded, ${skipped} unchanged`);
  } catch (err) {
    failed++;
    console.error(`FAILED ${path}: ${err.message}`);
  }
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${files.length} files: ${uploaded} uploaded, ${skipped} unchanged, ${failed} failed (${secs}s)`);
if (url) console.log(`Public base URL: ${url}/storage/v1/object/public/${BUCKET}`);
process.exit(failed ? 1 : 0);
