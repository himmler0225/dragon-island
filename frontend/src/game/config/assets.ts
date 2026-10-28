// Asset URLs: every image and sound the game loads goes through here.
//
// The art lives in a Supabase Storage bucket (`assets`) so it is not tied to the git repo and
// can grow without a redeploy. `NEXT_PUBLIC_ASSET_BASE` is the bucket's public URL; when it is
// not set (local dev without Supabase, CI, tests) the paths fall back to the files in
// `public/`, so nothing breaks.
//
// A path here is relative to the bucket root, e.g. 'dragons/black_dragon/rig.json'.
// `assetUrl` never touches the network, so it is safe to call at module scope.
const BASE = process.env.NEXT_PUBLIC_ASSET_BASE?.replace(/\/+$/, '') ?? '';

/** True when the game reads its art from Supabase rather than from `public/`. */
export const usingRemoteAssets = BASE !== '';

/**
 * The URL of an asset: the Supabase bucket when configured, the local file otherwise.
 * `path` is relative to the bucket root, without a leading slash.
 */
export const assetUrl = (path: string) => (BASE ? `${BASE}/${path.replace(/^\/+/, '')}` : `/${path.replace(/^\/+/, '')}`);

/** The path of an asset inside the bucket, e.g. 'dragons/black_dragon/rig.json'. */
export const assetPath = (path: string) => path.replace(/^\/+/, '');
