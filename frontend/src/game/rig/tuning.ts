// RIG constants object: walk cycle, leg geometry, blend rates, sleep pose.
import type { LegName } from './types';

export const RIG = {
  scale: 0.5,          // rig.json is exported at 2x the on-screen size
  cycle: 3.2,          // seconds per walk cycle (2026-11-20: 1.5 -> 1.7 -> 2.0 -> 2.5 -> 3.2, slow, calm steps; same stride)
  // ONE gait for every dragon (2026-11-20), the stomping walk of Khổng Tước / Hồng Ngọc Long: one leg after
  // another (no trot), short firm steps with a dip on every footfall. A rig's own motion.gait / duty / stride /
  // liftScale / swingTilt are ignored (DragonRig), so they all step alike.
  // stride: screen distance a planted foot travels per cycle (rig px at size 1): DragonRig divides it by the
  // dragon's size, so a big dragon takes the same steps as a small one
  stride: 58,
  duty: 0.6,           // share of the cycle a foot is on the ground
  liftScale: 0.48,     // x lift below: the paws come up low and set down firm (a stomp, not a prance)
  swingTilt: 0.55,     // how far a swinging paw tips its toes up
  lift: { fore: 0.4, hind: 0.32 },   // x hind-leg length: the fore paws step high, the hind ones push off
  // walking with confidence: chest and head carried up, a firm dip on every footfall, shoulders rolling
  // (2026-11-20: much softer, as Long Vương gliding on its clouds: the body rides smoothly over the steps instead of
  // dipping, rolling and surging with each one; was dip 3.8, roll 0.025, surge 4, head bob 0.04)
  strut: { chest: 0.035, head: 0.07, dip: 1.2, roll: 0.008, headBob: 0.015 },
  // ...and fluid: the body surges a little with each step (rig px), the head stays steady against the
  // shoulder roll (share cancelled), the swinging paw lifts early and sets down softly
  flow: { surge: 1.2, steady: 0.7, early: 0.7 },
  phase: { hind_near: 0, fore_near: 0.25, hind_far: 0.5, fore_far: 0.75 } as Record<LegName, number>,
  bend: { fore: 1, hind: -1 },   // +1: middle joint points back (elbow), -1: forward (stifle)
  blendRate: 2.5,      // how fast walk/fly blend in and out (per second): slow, soft starts and stops
  sleepRate: 0.9,      // lying down / getting up takes ~1 s
  lieDown: 46,         // rig px the torso sinks when asleep
  flapRate: 1.35,      // wing beats per second: slow, heavy beats
  // flight power: share of the beat spent on the downstroke, wing sweep (rad), body heave (rig px)
  // and the chest dipping into each stroke (rad)
  flap: { down: 0.3, swing: 0.5, heave: 16, pitch: 0.06 },
  // strikes: every move played this much slower than its keys (smoother), eased in over `blend` s
  strike: { tempo: 1.15, blend: 0.3 },
  // tail while striking: swish per segment (rad) at `rate` rad/s, and how much it lifts against a rear
  strikeTail: { swish: [0.05, 0.08, 0.11, 0.12], rate: 6, balance: 0.35 },
  flySplay: [0.3, -0.35] as [number, number],   // flight: near wing turned back, far wing forward (rad)
  flyFold: -0.7,       // flight: wing length at the bottom of the downstroke (< 0: swept down below the body)
};
