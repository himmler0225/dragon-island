// World layout: canvas size, world width, island geometry helpers.

// Point and Resource are defined here (not re-exported from types.ts) to avoid moduleResolution issues.
export type Point = [number, number];
export type Resource = 'gold' | 'exp' | 'stone';

// One screen (the viewport); the world is ISLANDS.length screens wide.
export const W = 1280;
export const H = 860;

export const smooth = (u: number) => u * u * (3 - 2 * u);
export const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
export const bump = (t: number, a: number, b: number) =>
  (t < a || t > b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));

export const WORLD_W = W * 3;   // 3 islands

/** Island centre in the world: one island per screen, side by side. */
export const islandCentre = (i: number): Point => [W / 2 + i * W, H / 2 + 10];

// ---- ISLANDS / IslandDef / BuildingType come from islands.ts ----
export { ISLANDS } from './islands';
export type { IslandDef } from './islands';
export type { BuildingType } from './islands';
