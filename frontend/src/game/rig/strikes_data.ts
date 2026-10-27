// Per-species attack pose data: dur, hit, t (keyframe timestamps) and per-channel arrays.
import type { SpeciesId } from '../config/species';
import type { StrikeSet } from './types';

type StrikeSetFactory = () => StrikeSet;

const CHIBI: StrikeSet = {
  attack: {
    dur: 0.7, hit: 0.5, t: [0, 0.3, 0.5, 0.75, 1],
    rear: [0, 0.15, -0.12, -0.04, 0], lunge: [0, 10, -36, -12, 0], head: [0, 0.3, -0.3, -0.1, 0],
    jaw: [0, 0.6, 0.2, 0.1, 0], wings: [0, 0.4, 0.2, 0.1, 0],
  },
  cast: {
    dur: 1.1, hit: 0.5, t: [0, 0.35, 0.55, 0.8, 1],
    rear: [0, 0.3, -0.1, -0.05, 0], head: [0, 0.5, -0.25, -0.1, 0], lunge: [0, 6, -18, -8, 0],
    wings: [0, 1, 0.6, 0.3, 0], spread: [0, 0.8, 0.6, 0.3, 0], stretch: [0, 0, 0.4, 0.2, 0],
  },
  ultimate: {
    dur: 1.6, hit: 0.62, t: [0, 0.3, 0.5, 0.62, 0.8, 1],
    air: [0, 30, 45, -6, 0, 0], rear: [0, 0.3, 0.35, -0.2, -0.05, 0], head: [0, 0.5, 0.55, -0.25, -0.05, 0],
    wings: [0, 1, 1, 0.4, 0.2, 0], spread: [0, 0.8, 1, 0.5, 0.2, 0], lunge: [0, 6, 8, -24, -8, 0], lift: [0, 0, 0, 8, 4, 0],
  },
};

/** Fighting from the air (Hắc Long, Thần Long, the two phoenixes): they never dive. Wind up by beating the wings and
 *  rising a little with the head drawn back, then thrust head and chest forward to strike (breath
 *  open), recoil and settle back to the hover. */
const HOVER: StrikeSet = {
  attack: {
    dur: 1.0, hit: 0.5, t: [0, 0.25, 0.42, 0.5, 0.62, 0.8, 1],
    air: [0, 10, 16, 6, 8, 4, 0], flap: [0, 1, 1, 1, 1, 0.6, 0],
    rear: [0, 0.12, 0.2, -0.12, -0.1, -0.03, 0], head: [0, 0.25, 0.38, -0.28, -0.2, -0.06, 0],
    lunge: [0, 10, 16, -30, -22, -8, 0], jaw: [0, 0.2, 0.35, 1.1, 0.8, 0.2, 0], spread: [0, 0.4, 0.6, 0.2, 0.2, 0.1, 0],
  },
  cast: {
    dur: 1.5, hit: 0.45, t: [0, 0.2, 0.36, 0.45, 0.6, 0.75, 0.9, 1],
    air: [0, 14, 24, 14, 16, 14, 6, 0], flap: [0, 1, 1, 1, 1, 1, 0.6, 0],
    rear: [0, 0.16, 0.28, -0.14, -0.12, -0.14, -0.05, 0], head: [0, 0.3, 0.5, -0.25, -0.2, -0.25, -0.08, 0],
    lunge: [0, 10, 18, -26, -22, -26, -10, 0], jaw: [0, 0.3, 0.5, 1.2, 1.1, 1.2, 0.4, 0], spread: [0, 0.6, 1, 0.5, 0.5, 0.5, 0.2, 0],
  },
  ultimate: {
    dur: 2.2, hit: 0.6, t: [0, 0.18, 0.36, 0.5, 0.6, 0.72, 0.86, 1],
    air: [0, 20, 45, 55, 40, 34, 16, 0], flap: [0, 1, 1, 1, 1, 1, 0.6, 0], spread: [0, 0.6, 1, 1, 0.7, 0.6, 0.3, 0],
    rear: [0, 0.14, 0.3, 0.36, -0.2, -0.15, -0.05, 0], head: [0, 0.25, 0.5, 0.6, -0.32, -0.25, -0.08, 0],
    jaw: [0, 0.2, 0.5, 0.8, 1.3, 1.2, 0.4, 0], lunge: [0, 8, 14, 18, -36, -28, -10, 0],
  },
};

/** The Long Vương family (Việt Hải and the four seas). */
const LONG_VUONG: StrikeSet = {
  // the body stays still on its cloud: it stomps with both front paws at once (lift = the body dipping as
  // they land), then the head draws back a little, the mouth opens and it breathes out
  attack: { dur: 1.0, hit: 0.5, t: [0, 0.16, 0.3, 0.5, 0.75, 1],
    stompL: [0, 1, 0, 0, 0, 0], stompR: [0, 1, 0, 0, 0, 0], lift: [0, 0, 7, 0, 0, 0],
    head: [0, 0.08, 0.1, -0.12, -0.08, 0], jaw: [0, 0.1, 0.3, 1, 0.8, 0], breath: [0, 0, 0, 1, 0.8, 0] },
  cast: { dur: 1.5, hit: 0.45, t: [0, 0.16, 0.28, 0.45, 0.62, 0.8, 1],
    stompL: [0, 1.1, 0, 0, 0, 0, 0], stompR: [0, 1.1, 0, 0, 0, 0, 0], lift: [0, 0, 9, 0, 0, 0, 0],
    head: [0, 0.1, 0.12, -0.14, -0.12, -0.08, 0], jaw: [0, 0.1, 0.35, 1.15, 1.1, 0.7, 0], breath: [0, 0, 0, 1, 1, 0.6, 0] },
  // ultimate: two stomps, the second harder
  ultimate: { dur: 2.0, hit: 0.52, t: [0, 0.1, 0.2, 0.32, 0.42, 0.52, 0.7, 0.85, 1],
    stompL: [0, 1, 0, 1.3, 0, 0, 0, 0, 0], stompR: [0, 1, 0, 1.3, 0, 0, 0, 0, 0], lift: [0, 0, 7, 0, 11, 0, 0, 0, 0],
    head: [0, 0.06, 0.08, 0.12, 0.14, -0.16, -0.14, -0.08, 0], jaw: [0, 0.1, 0.1, 0.3, 0.4, 1.3, 1.25, 0.8, 0], breath: [0, 0, 0, 0, 0, 1, 1, 0.6, 0] },
};

/** Khổng Tước: basic = a peck while the tail flicks half open (arrows fly from it); skill and ultimate =
 *  crouch, jump with the tail spread wide, land (lift = crouch, air = the jump, fan = the tail opening). */
const PEACOCK: StrikeSet = {
  attack: { dur: 1.0, hit: 0.45, t: [0, 0.2, 0.45, 0.7, 1],
    fan: [0, 0.5, 0.6, 0.3, 0], head: [0, 0.15, -0.25, -0.1, 0], rear: [0, 0.05, -0.05, 0, 0] },
  cast: { dur: 1.5, hit: 0.45, t: [0, 0.15, 0.35, 0.55, 0.78, 1],
    lift: [0, 12, 0, 0, 8, 0], air: [0, 0, 70, 80, 0, 0], fan: [0, 0.2, 1, 1, 0.4, 0],
    rear: [0, 0.05, 0.15, 0.1, 0, 0], head: [0, 0.1, 0.2, 0.1, 0, 0] },
  ultimate: { dur: 2.2, hit: 0.5, t: [0, 0.14, 0.32, 0.5, 0.68, 0.84, 1],
    lift: [0, 16, 0, 0, 0, 10, 0], air: [0, 0, 110, 130, 110, 0, 0], fan: [0, 0.3, 1.2, 1.3, 1.2, 0.4, 0],
    rear: [0, 0.05, 0.2, 0.15, 0.1, 0, 0], head: [0, 0.1, 0.25, 0.2, 0.1, 0, 0] },
};

const TWIN_DRAGON: StrikeSet = {
  attack: {
    dur: 0.85, hit: 0.5, t: [0, 0.3, 0.5, 0.75, 1],
    rear: [0, 0.2, -0.15, -0.05, 0], lunge: [0, 12, -40, -14, 0], head: [0, 0.25, -0.25, -0.08, 0],
    jaw: [0, 0.7, 0.4, 0.15, 0], claw: [0, 0.6, 1, 0.3, 0], wings: [0, 0.4, 0.2, 0.1, 0],
  },
  cast: {
    dur: 1.3, hit: 0.55, t: [0, 0.35, 0.55, 0.8, 1],
    rear: [0, 0.3, -0.12, -0.06, 0], spread: [0, 1, 0.8, 0.4, 0], wings: [0, 1.1, 0.6, 0.3, 0],
    head: [0, 0.5, -0.3, -0.15, 0], jaw: [0, 0.5, 1.2, 0.8, 0], lunge: [0, 8, -20, -10, 0], stretch: [0, 0, 0.5, 0.3, 0],
  },
  ultimate: {
    dur: 2.1, hit: 0.72, t: [0, 0.3, 0.55, 0.72, 0.86, 1],
    air: [0, 60, 75, -10, 0, 0], flap: [0, 1, 1, 0.4, 0, 0], spread: [0, 0.8, 1, 0.6, 0.2, 0],
    rear: [0, 0.3, 0.35, -0.25, -0.1, 0], head: [0, 0.5, 0.55, -0.3, -0.1, 0], jaw: [0, 0.4, 1, 1, 0.3, 0],
    lunge: [0, 10, 12, -40, -16, 0], stretch: [0, 0.3, 0.2, 0, 0.4, 0], lift: [0, 0, 0, 10, 6, 0],
  },
};

export const STRIKES_DATA: Record<SpeciesId, StrikeSet | StrikeSetFactory> = {
  qilin: {
    attack: { dur: 0.8, hit: 0.5, t: [0, 0.3, 0.5, 0.75, 1], rear: [0, 0.18, -0.12, -0.04, 0], lunge: [0, 10, -32, -12, 0], head: [0, 0.25, -0.2, -0.05, 0], jaw: [0, 0.5, 0.3, 0.1, 0], claw: [0, 0.4, 1, 0.3, 0] },
    cast:   { dur: 1.2, hit: 0.55, t: [0, 0.35, 0.55, 0.75, 1], rear: [0, 0.22, -0.18, -0.1, 0], lunge: [0, 14, -26, -14, 0], head: [0, 0.45, -0.3, -0.15, 0], jaw: [0, 0.6, 1.2, 0.8, 0], stretch: [0, 0, 0.7, 0.4, 0] },
    ultimate:{ dur: 2.0, hit: 0.3, t: [0, 0.2, 0.3, 0.45, 0.55, 0.7, 0.8, 1], rear: [0, 0.2, -0.15, 0.15, -0.18, 0.18, -0.22, 0], lunge: [0, 10, -20, 6, -24, 6, -30, 0], head: [0, 0.35, -0.25, 0.3, -0.28, 0.35, -0.32, 0], jaw: [0, 0.6, 1.2, 0.5, 1.2, 0.5, 1.2, 0], stretch: [0, 0, 0.5, 0.2, 0.6, 0.2, 0.8, 0] },
  },
  sea_dragon: LONG_VUONG,
  peacock: PEACOCK,
  east_sea_dragon: LONG_VUONG,
  west_sea_dragon: LONG_VUONG,
  north_sea_dragon: LONG_VUONG,
  south_sea_dragon: LONG_VUONG,
  black_dragon: HOVER,
  bone_dragon: {
    attack: { dur: 0.9, hit: 0.5, t: [0, 0.3, 0.5, 0.72, 1], wings: [0, 0.6, 0.3, 0.2, 0], rear: [0, 0.15, -0.28, -0.1, 0], lunge: [0, 14, -46, -18, 0], head: [0, 0.3, -0.35, -0.1, 0], jaw: [0, 1, 0.05, 0.4, 0], stretch: [0, 0, 1, 0.4, 0], lift: [0, -6, 4, 2, 0] },
    cast:   { dur: 1.5, hit: 0.55, t: [0, 0.35, 0.5, 0.58, 0.8, 1], wings: [0, 1.3, 1.4, -1.1, -0.6, 0], spread: [0, 1, 1, 0.4, 0.2, 0], rear: [0, 0.25, 0.28, -0.32, -0.25, 0], lunge: [0, 18, 20, -38, -30, 0], lift: [0, -10, -12, 6, 4, 0], head: [0, 0.4, 0.45, -0.25, -0.2, 0], jaw: [0, 0.4, 0.6, 1, 0.9, 0], stretch: [0, 0, 0.1, 1, 0.9, 0] },
    ultimate:{ dur: 2.0, hit: 0.62, t: [0, 0.2, 0.45, 0.62, 0.8, 1], air: [0, 0, 60, 70, 0, 0], flap: [0, 0, 1, 1, 0, 0], spread: [0, 0.6, 1, 1, 0.3, 0], rear: [0, -0.1, 0.45, 0.5, -0.2, 0], head: [0, -0.1, 0.6, 0.65, -0.25, 0], jaw: [0, 0.2, 1, 1, 0.4, 0], lunge: [0, 8, 0, 0, -24, 0], stretch: [0, 0.4, 0.8, 0.8, 0.3, 0], lift: [0, 8, 0, 0, 8, 0] },
  },
  stag_dragon: {
    attack: { dur: 0.8, hit: 0.48, t: [0, 0.3, 0.48, 0.7, 1], lunge: [0, 18, -54, -24, 0], head: [0, -0.3, -0.38, -0.1, 0], rear: [0, -0.08, -0.12, 0, 0], lift: [0, 4, 0, 0, 0], jaw: [0, 0, 0.2, 0, 0] },
    cast:   { dur: 1.4, hit: 0.5, t: [0, 0.35, 0.5, 0.8, 1], air: [0, 30, 36, 30, 0], flap: [0, 0.5, 0.6, 0.5, 0], head: [0, 0.4, 0.45, 0.4, 0], rear: [0, 0.15, 0.18, 0.15, 0], wings: [0, 1, 1, 1, 0] },
    ultimate:{ dur: 2.0, hit: 0.55, t: [0, 0.3, 0.55, 0.8, 1], air: [0, 70, 90, 70, 0], flap: [0, 1, 1, 1, 0], head: [0, 0.35, 0.5, 0.35, 0], rear: [0, 0.2, 0.25, 0.2, 0], jaw: [0, 0.2, 0.6, 0.2, 0], wings: [0, 1, 1, 1, 0] },
  },
  celestial_dragon: HOVER,
  fire_phoenix: HOVER,
  ice_phoenix: HOVER,
  void_serpent: {
    attack:  { dur: 0.9, hit: 0.35, t: [0, 0.35, 0.7, 1], rear: [0, 0.18, 0.12, 0], head: [0, 0.35, 0.25, 0], jaw: [0, 0.6, 0.3, 0] },
    cast:    { dur: 1.2, hit: 0.3,  t: [0, 0.3, 0.75, 1], rear: [0, 0.25, 0.2, 0],   head: [0, 0.5, 0.4, 0],   jaw: [0, 1, 0.7, 0] },
    ultimate:{ dur: 1.6, hit: 0.3,  t: [0, 0.3, 0.8, 1],  rear: [0, 0.32, 0.28, 0],  head: [0, 0.6, 0.5, 0],   jaw: [0, 1.2, 0.9, 0] },
  },
  gold_dragon: TWIN_DRAGON,
  silver_dragon: TWIN_DRAGON,
  fire_dragon: CHIBI,
  earth_dragon: CHIBI,
};
