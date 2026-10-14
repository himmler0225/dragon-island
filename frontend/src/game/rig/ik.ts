// Inverse kinematics for a two-bone leg: given hip and ankle target, compute joint angles.
import type { Vec } from './types';
import type { Leg } from './DragonRig';

/** Solve a two-bone leg: write joint positions and rotations into `L` given `hip` and `target`. */
export function solveLeg(L: Leg, hip: Vec, target: Vec, pawTilt: number, bend: number): void {
  let dx = target[0] - hip[0], dy = target[1] - hip[1];
  let d = Math.hypot(dx, dy);
  const max = L.len1 + L.len2 - 0.01;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }   // out of reach: stretch towards it
  const base = Math.atan2(dy, dx);
  // hindKnee 'back': the art draws the hind knee bent the other way (Kì Lân); bending it forward
  // would turn the shin far off its drawn angle and open a gap at the knee
  const off = Math.acos(Math.max(-1, Math.min(1, (L.len1 ** 2 + d * d - L.len2 ** 2) / (2 * L.len1 * d))));
  // pick the solution whose middle joint points the right way
  const [kx, ky, a1] = [base + off, base - off]
    .map(a => [hip[0] + L.len1 * Math.cos(a), hip[1] + L.len1 * Math.sin(a), a])
    .sort((p, q) => bend * (q[0] - p[0]))[0];
  const ax = hip[0] + dx, ay = hip[1] + dy;
  L.up.pos = [hip[0], hip[1]]; L.up.rot = a1 - L.rest1;
  L.lo.pos = [kx, ky]; L.lo.rot = Math.atan2(ay - ky, ax - kx) - L.rest2;
  L.paw.pos = [ax, ay]; L.paw.rot = pawTilt;
}
