// Island geometry, pathfinding, and movement helpers.
import * as Phaser from 'phaser';
import { clamp01, type Point } from '../config/world';

export const LAMP = { foot: [0.37, 0.98] as [number, number], lantern: [0.769, 0.52] as [number, number], height: 78 };

/** Spiral-search the nearest free ground to `at`. */
export function closestFree(
  at: Point,
  free: (x: number, y: number, m?: number) => boolean,
): Point | null {
  if (free(at[0], at[1])) return at;
  for (let r = 20; r <= 300; r += 20) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = at[0] + Math.cos(a) * r, y = at[1] + Math.sin(a) * r * 0.6;
      if (free(x, y)) return [x, y];
    }
  }
  return null;
}

/** Pick a random free point in the walk polygon. */
export function randomPoint(
  from: Point, minDist: number, needPath: boolean,
  walk: Phaser.Geom.Polygon,
  free: (x: number, y: number) => boolean,
  pathFree: (x0: number, y0: number, x1: number, y1: number) => boolean,
): Point {
  const b = Phaser.Geom.Polygon.GetAABB(walk);
  for (let tries = 0; tries < 300; tries++) {
    const x = Phaser.Math.FloatBetween(b.x, b.right), y = Phaser.Math.FloatBetween(b.y, b.bottom);
    if (Math.hypot(x - from[0], y - from[1]) < minDist || !free(x, y)) continue;
    if (!needPath || pathFree(from[0], from[1], x, y)) return [x, y];
  }
  return from;
}

/** A via-point that minimises total path length. */
export function detour(
  from: Point, to: Point,
  walk: Phaser.Geom.Polygon,
  free: (x: number, y: number) => boolean,
  pathFree: (x0: number, y0: number, x1: number, y1: number) => boolean,
): Point | null {
  let best: Point | null = null, bestLen = Infinity;
  const b = Phaser.Geom.Polygon.GetAABB(walk);
  for (let gx = b.x; gx <= b.right; gx += 30) {
    for (let gy = b.y; gy <= b.bottom; gy += 20) {
      if (!free(gx, gy)) continue;
      const len = Math.hypot(gx - from[0], gy - from[1]) + Math.hypot(to[0] - gx, to[1] - gy);
      if (len < bestLen && pathFree(from[0], from[1], gx, gy) && pathFree(gx, gy, to[0], to[1])) {
        best = [gx, gy]; bestLen = len;
      }
    }
  }
  return best;
}

/** Check if segment from (x0,y0) to (x1,y1) is free (16-step sample). */
export function pathFree(
  x0: number, y0: number, x1: number, y1: number,
  free: (x: number, y: number) => boolean,
): boolean {
  for (let k = 1; k <= 16; k++) {
    if (!free(x0 + (x1 - x0) * k / 16, y0 + (y1 - y0) * k / 16)) return false;
  }
  return true;
}

/** Perspective depth scale: farther up the island = smaller. */
export function depthScale(y: number, top: number, bottom: number): number {
  return 0.93 + 0.12 * clamp01((y - top) / (bottom - top));
}

/** Near-point search: try a few x-offsets from `at`. */
export function nearPoint(
  at: Point, dx: number,
  free: (x: number, y: number, m?: number) => boolean,
): Point {
  for (const k of [1, 0.7, 0.45, -0.7, -1]) {
    const p: Point = [at[0] + dx * k, at[1] + 8];
    if (free(...p, 0)) return p;
  }
  return [at[0] + dx, at[1]];
}
