// RIG constants object: walk cycle, leg geometry, blend rates, sleep pose.
import type { LegName } from './types';

export const RIG = {
  scale: 0.5,          // rig.json is exported at 2x the on-screen size
  cycle: 1.6,          // seconds per walk cycle
  stride: 64,          // rig px a planted foot travels per cycle
  duty: 0.62,          // share of the cycle a foot is on the ground
  lift: { fore: 28, hind: 24 },   // high enough that every swinging paw clearly leaves the ground
  phase: { hind_near: 0, fore_near: 0.25, hind_far: 0.5, fore_far: 0.75 } as Record<LegName, number>,
  bend: { fore: 1, hind: -1 },   // +1: middle joint points back (elbow), -1: forward (stifle)
  blendRate: 6,        // how fast walk/fly blend in and out (per second)
  sleepRate: 0.9,      // lying down / getting up takes ~1 s
  lieDown: 46,         // rig px the torso sinks when asleep
  flapRate: 1.7,       // wing beats per second
};
