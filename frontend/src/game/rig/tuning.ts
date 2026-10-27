// RIG constants object: walk cycle, leg geometry, blend rates, sleep pose.
import type { LegName } from './types';

export const RIG = {
  scale: 0.5,          // rig.json is exported at 2x the on-screen size
  cycle: 1.5,          // seconds per walk cycle
  // one stride for every dragon (rigs are normalised to the same body size, see build_rig TARGET_BODY),
  // so they all cover ground alike; lift stays a share of each one's leg length
  stride: 145,         // rig px a planted foot travels per cycle: long, unhurried steps
  duty: 0.6,           // share of the cycle a foot is on the ground
  lift: { fore: 0.4, hind: 0.32 },   // x hind-leg length: the fore paws step high, the hind ones push off
  // walking with confidence: chest and head carried up, a firm dip on every footfall, shoulders rolling
  strut: { chest: 0.035, head: 0.07, dip: 3.8, roll: 0.025 },
  // ...and fluid: the body surges a little with each step (rig px), the head stays steady against the
  // shoulder roll (share cancelled), the swinging paw lifts early and sets down softly
  flow: { surge: 3, steady: 0.6, early: 0.75 },
  phase: { hind_near: 0, fore_near: 0.25, hind_far: 0.5, fore_far: 0.75 } as Record<LegName, number>,
  bend: { fore: 1, hind: -1 },   // +1: middle joint points back (elbow), -1: forward (stifle)
  blendRate: 4,        // how fast walk/fly blend in and out (per second): soft starts and stops
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
