// Rig tweaks: hand adjustments to a dragon's pieces made in the rig editor (/dev/rig-editor) and kept in the
// backend's database (GET / PUT /api/rig-tweaks). Each one draws a piece shifted (dx, dy: rig px, in the piece's
// own frame, so it moves with it), turned (rot: radians, about its joint) and scaled, on top of whatever pose the
// rig gives it: the animation is untouched. Loaded once when the game starts; no backend, no tweaks.
import * as Phaser from 'phaser';
import type { SpeciesId } from '../config/species';
import { rigTextureKey } from './types';

export interface Tweak { dx: number; dy: number; rot: number; scale: number; flipX?: boolean }
/** Not a piece: its `scale` is the whole dragon's size (x the built size). */
export const SIZE_KEY = '__size';
export type BoneTweaks = Record<string, Tweak>;

/** The backend API (NEXT_PUBLIC_API_URL; in development the local NestJS server). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')
  ?? (process.env.NODE_ENV !== 'production' ? 'http://localhost:4000/api' : '');

const store: Partial<Record<SpeciesId, BoneTweaks>> = {};
/** Eraser masks (rig editor): species -> bone -> an image the size of the piece's, opaque where the outline is painted away. */
const masks: Partial<Record<SpeciesId, Record<string, HTMLImageElement>>> = {};

const decode = (url: string) => new Promise<HTMLImageElement | null>(res => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = url;
});
let loading: Promise<void> | null = null;

/** Fetch every species' tweaks for the game (once; later calls reuse it). Never throws, gives up after `timeoutMs`;
 *  a failed load is not kept, so the next call tries again. */
export function loadTweaks(timeoutMs = 6000): Promise<void> {
  if (!API_URL) return Promise.resolve();
  loading ??= (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(`${API_URL}/rig-tweaks`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return;
      const { data } = await res.json() as { data: Partial<Record<SpeciesId, BoneTweaks>> };
      Object.assign(store, data);
      const mres = await fetch(`${API_URL}/rig-tweaks/masks`, { signal: ctrl.signal }).catch(() => null);
      const mdata = mres?.ok ? ((await mres.json()) as { data: Record<string, Record<string, string>> }).data : {};
      for (const [id, bones] of Object.entries(mdata)) for (const [bone, url] of Object.entries(bones)) {
        const img = await decode(url);
        if (img) (masks[id as SpeciesId] ??= {})[bone] = img;
      }
    } catch { loading = null; /* no backend: the rigs as built (tried again next time) */ }
  })();
  return loading;
}

/** Fetch the tweaks again, dropping unsaved changes (rig editor). */
export async function reloadTweaks() {
  loading = null;
  for (const k of Object.keys(store) as SpeciesId[]) for (const b of Object.keys(store[k]!)) delete store[k]![b];
  for (const k of Object.keys(masks) as SpeciesId[]) delete masks[k];
  await loadTweaks();
}

/** The save of a species was refused: it was saved elsewhere since it was loaded (`current`: that save's version). */
export class OutdatedError extends Error {
  constructor(readonly current: string) { super('Con rồng này vừa được lưu ở nơi khác (tab khác?) sau khi bạn tải nó'); }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(`${API_URL}${path}`, init); }
  catch { throw new Error(`không kết nối được backend (${API_URL}). Backend có đang chạy không?`); }
  const body = await res.json().catch(() => null) as { data?: T; error?: { code?: string; message?: string; details?: { current?: string } } } | null;
  if (res.status === 409 && body?.error?.code === 'RIG_TWEAKS_OUTDATED') throw new OutdatedError(body.error.details?.current ?? '');
  if (!res.ok || !body || body.data === undefined) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return body.data;
}

interface SpeciesData { tweaks: BoneTweaks; masks: Record<string, string>; version: string }

/** Put a species' data from the server into the live stores (in place: the rigs hold these objects). */
async function adopt(id: SpeciesId, d: SpeciesData) {
  const kept = tweaksFor(id);
  for (const k of Object.keys(kept)) delete kept[k];
  Object.assign(kept, d.tweaks);
  const imgs: Record<string, HTMLImageElement> = {};
  for (const [bone, url] of Object.entries(d.masks)) {
    const img = await decode(url);
    if (img) imgs[bone] = img;
  }
  masks[id] = imgs;
}

/** The rig editor's load of one species, straight from the server (no cache, no time limit): its tweaks and masks
 *  replace what the stores held. Resolves with its version (for the next save); throws when it cannot be read. */
export async function fetchSpecies(id: SpeciesId): Promise<string> {
  const d = await call<SpeciesData>(`/rig-tweaks/${id}/all`);
  await adopt(id, d);
  return d.version;
}

/** The rig editor's save of one species, all at once: its tweaks and the masks that changed (png data URL, null =
 *  removed). Refused with OutdatedError if it was saved elsewhere since `baseVersion` (null: overwrite anyway).
 *  On success the stores hold exactly what the server kept; resolves with the new version. */
export async function saveSpecies(id: SpeciesId, tweaks: BoneTweaks, changedMasks: Record<string, string | null>, baseVersion: string | null): Promise<string> {
  const d = await call<SpeciesData>(`/rig-tweaks/${id}/all`, {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tweaks: Object.entries(tweaks).map(([bone, t]) => ({ bone, ...t })), masks: changedMasks, baseVersion }),
  });
  await adopt(id, d);
  return d.version;
}

/** A species' tweaks (a live object: the rig editor changes it in place). */
export const tweaksFor = (id: SpeciesId): BoneTweaks => (store[id] ??= {});

/** Save a species' tweaks (rig editor). Resolves with what the backend kept; throws on failure. */
export async function saveTweaks(id: SpeciesId, tweaks: BoneTweaks): Promise<BoneTweaks> {
  const res = await fetch(`${API_URL}/rig-tweaks/${id}`, {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tweaks: Object.entries(tweaks).map(([bone, t]) => ({ bone, ...t })) }),
  });
  const body = await res.json().catch(() => null) as { data?: BoneTweaks; error?: { message?: string } } | null;
  if (!res.ok || !body?.data) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  const kept = tweaksFor(id);
  for (const k of Object.keys(kept)) delete kept[k];
  Object.assign(kept, body.data);
  return kept;
}

/** A piece's eraser mask, if it has one. */
export const maskFor = (id: SpeciesId, bone: string): HTMLImageElement | undefined => masks[id]?.[bone];
/** A piece's paint layer (the editor's colour brush: drawn over the piece, only where it has paint), saved as the
 *  mask of bone `<bone>__paint`. */
export const PAINT = '__paint';
export const paintFor = (id: SpeciesId, bone: string): HTMLImageElement | undefined => masks[id]?.[bone + PAINT];

/** Save (a PNG data URL) or remove (null) a piece's eraser mask (rig editor). Throws on failure. */
export async function saveMask(id: SpeciesId, bone: string, png: string | null) {
  const res = await fetch(`${API_URL}/rig-tweaks/${id}/masks/${bone}`, png === null ? { method: 'DELETE' }
    : { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ png }) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (png === null) delete masks[id]?.[bone];
  else { const img = await decode(png); if (img) (masks[id] ??= {})[bone] = img; }
}

/** The piece's image with its dark outlines filled with the colour round them (what the eraser paints in): every
 *  outline pixel (much darker than the piece's usual colour) takes the average of its non-outline neighbours, growing
 *  in from the edges of each line; see-through stays see-through. */
export function healedImage(src: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const lum = (i: number) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
  const lums: number[] = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) lums.push(lum(i));
  lums.sort((a, b) => a - b);
  const cut = 0.6 * (lums[lums.length >> 1] ?? 128);   // an outline is well under the piece's median brightness
  const line = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) if (d[p * 4 + 3] > 0 && lum(p * 4) < cut) line[p] = 1;
  for (let pass = 0; pass < 40; pass++) {
    const next: [number, number, number, number][] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!line[p]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if ((dx || dy) && xx >= 0 && yy >= 0 && xx < w && yy < h) {
          const q = yy * w + xx;
          if (!line[q] && d[q * 4 + 3] > 0) { r += d[q * 4]; g += d[q * 4 + 1]; b += d[q * 4 + 2]; n++; }
        }
      }
      if (n) next.push([p, r / n, g / n, b / n]);
    }
    if (!next.length) break;
    for (const [p, r, g, b] of next) { d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b; line[p] = 0; }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** The colour brush's layer over a piece: only on the piece (its alpha is kept). */
export function drawPaint(ctx: CanvasRenderingContext2D, paint: CanvasImageSource) {
  ctx.globalCompositeOperation = 'source-atop';
  ctx.drawImage(paint, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = 'source-over';
}

/** Draw `src` with the healed image showing through `mask` (opaque = outline painted away). */
export function drawHealed(ctx: CanvasRenderingContext2D, src: CanvasImageSource, healed: HTMLCanvasElement, mask: CanvasImageSource) {
  const w = healed.width, h = healed.height;
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const t = tmp.getContext('2d')!;
  t.drawImage(healed, 0, 0);
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(mask, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0);
  // over the original only where it is painted: the outline there turns the colour round it (no hole)
  ctx.globalCompositeOperation = 'source-atop';
  ctx.drawImage(tmp, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}

const masked = new WeakMap<Phaser.Textures.TextureManager, Set<string>>();
/** Paint the eraser masks onto a species' piece images: the outlines there take the colour round them (once per
 *  game, before its rigs are built). */
export function applyRigMasks(scene: Phaser.Scene, id: SpeciesId) {
  const done = masked.get(scene.textures) ?? new Set<string>();
  masked.set(scene.textures, done);
  const bones = new Set(Object.keys(masks[id] ?? {}).map(b => b.replace(PAINT, '')));
  for (const bone of bones) {
    const mask = masks[id]?.[bone], paint = masks[id]?.[bone + PAINT];
    const key = rigTextureKey(id, bone);
    if (done.has(key) || !scene.textures.exists(key)) continue;
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d')!;
    if (mask) drawHealed(ctx, src, healedImage(src), mask);
    else ctx.drawImage(src, 0, 0);
    if (paint) drawPaint(ctx, paint);
    scene.textures.remove(key);
    scene.textures.addCanvas(key, c);
    done.add(key);
  }
}
