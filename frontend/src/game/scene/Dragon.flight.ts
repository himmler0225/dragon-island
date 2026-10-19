// Dragon flight helper: state type and per-frame flight physics.
// Accepts all dragon state as parameters to avoid circular imports.
import type { Point } from '../config/world';
import { clamp01, smooth } from '../config/world';
import { FLY_ALT, FLY_SPEED, LAND_S, TAKEOFF_S } from '../config/economy';

export interface DragonFlight {
  phase: 'takeoff' | 'cruise' | 'land';
  t: number;
  target: Point;
  landAt?: number;
  from?: number;
}

export function newFlight(x: number, y: number): DragonFlight {
  return { phase: 'takeoff', t: 0, target: [x, y] };
}

export interface FlightCtx {
  getX: () => number;
  getY: () => number;
  getAlt: () => number;
  depthScale: (y: number) => number;
  setAlt: (v: number) => void;
  setX: (x: number) => void;
  setY: (y: number) => void;
  turn: (dir: 1 | -1) => void;
  dir: 1 | -1;
  action: string;
  setAction: (a: string) => void;
  dustRing: (dragon: unknown) => void;
  /** Set rest duration on landing. */
  setRest: (v: number) => void;
}

/** Advance flight by dt seconds. Returns { alt } (new altitude). */
export function advanceFlight(dt: number, F: DragonFlight | null, ctx: FlightCtx): { alt: number } {
  if (!F || ctx.action !== 'fly') {
    const newAlt = Math.max(0, ctx.getAlt() - 260 * dt);
    ctx.setAlt(newAlt);
    return { alt: newAlt };
  }
  F.t += dt;
  let alt = ctx.getAlt();

  if (F.phase === 'takeoff') {
    alt = FLY_ALT * smooth(clamp01((F.t - 0.15) / (TAKEOFF_S - 0.15)));
    ctx.setAlt(alt);
    if (F.t >= TAKEOFF_S) F.phase = 'cruise';
    return { alt };
  }
  if (F.phase !== 'land' && F.t > 0.35) {
    const dx = F.target[0] - ctx.getX(), dy = F.target[1] - ctx.getY();
    const dist = Math.hypot(dx, dy);
    const step = FLY_SPEED * ctx.depthScale(ctx.getY()) * dt;
    if (dist <= step) {
      ctx.setX(F.target[0]);
      ctx.setY(F.target[1]);
      F.phase = 'land';
      F.landAt = F.t;
      F.from = ctx.getAlt();
    } else {
      ctx.setX(ctx.getX() + (dx / dist) * step);
      ctx.setY(ctx.getY() + (dy / dist) * step);
      if (Math.abs(dx) > 30 && Math.sign(dx) !== ctx.dir) ctx.turn(Math.sign(dx) as 1 | -1);
    }
  }
  if (F.phase === 'land') {
    const u = clamp01((F.t - (F.landAt ?? F.t)) / LAND_S);
    alt = (F.from ?? 0) * (1 - smooth(u));
    ctx.setAlt(alt);
    if (u >= 1) {
      ctx.setAlt(0);
      ctx.dustRing(null);
      ctx.setAction('idle');
      ctx.setRest(2);
    }
  }
  return { alt };
}
