// Cut-out (skeletal) dragon: pieces and joints from public/dragons/<id>/rig.json (tools/build_rig.py).
// Forward kinematics for head/wings/tail, 2-bone IK for the legs, a lateral-sequence walk
// (left hind -> left fore -> right hind -> right fore), breathing, tail sway, wing flap, sleep pose.
// Rig space: origin on the ground under the body, y up is negative, the dragon faces left.
import * as Phaser from 'phaser';
import type { SpeciesId } from './species';

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

export type RigMode = 'idle' | 'walk' | 'fly' | 'sleep';
export type StrikeKind = 'attack' | 'cast' | 'ultimate';

/**
 * Attack poses as keyframe tracks over the move's duration (t = 0..1 of `dur`). Missing channels are 0.
 * Channels (rig px / radians; the dragon faces left, so negative x = forward):
 *   lunge  torso x shift          rear  torso tilt (+ = nose up)    lift  torso y (- = up)
 *   head   head tilt (+ = up)     jaw   mouth open (0..1)            wings raise (0..1)
 *   claw   near front paw swipe forward/up (0..1)                   flap  beat the wings like flying (0..1)
 *   air    whole dragon off the ground, screen px (Dragon adds it to its altitude)
 *   spread wings thrown wide open (0..1: bigger, near wing back, far wing forward)
 *   stretch hind legs pushed out straight behind the body (0..1)
 * `hit` is the share of `dur` at which the blow lands (the game spawns the impact there).
 */
export interface Strike { dur: number; hit: number; t: number[]; [ch: string]: number[] | number }

/** Species that fight from the air: they take off when they attack and hover this high (body px)
 *  until a few seconds after their last move. Their `air` tracks are relative to the hover. */
export const COMBAT_HOVER: Partial<Record<SpeciesId, number>> = { hac_long: 95 };
type StrikeSet = Record<StrikeKind, Strike>;

export const STRIKES: Record<SpeciesId, StrikeSet> = {
  // Kì Lân: sturdy beast — claw swipes, and a head-thrust that spits a golden dragon head
  ki_lan: {
    // rear a little, swipe the front claw down
    attack: {
      dur: 0.8, hit: 0.5, t: [0, 0.3, 0.5, 0.75, 1],
      rear: [0, 0.18, -0.12, -0.04, 0], lunge: [0, 10, -32, -12, 0], head: [0, 0.25, -0.2, -0.05, 0],
      jaw: [0, 0.5, 0.3, 0.1, 0], claw: [0, 0.4, 1, 0.3, 0],
    },
    // Long Thủ Xuyên Trận: rear back, head up with the jaw wide, then thrust the head forward and spit
    cast: {
      dur: 1.2, hit: 0.55, t: [0, 0.35, 0.55, 0.75, 1],
      rear: [0, 0.22, -0.18, -0.1, 0], lunge: [0, 14, -26, -14, 0], head: [0, 0.45, -0.3, -0.15, 0],
      jaw: [0, 0.6, 1.2, 0.8, 0], stretch: [0, 0, 0.7, 0.4, 0],
    },
    // Kim Long Liên Châu: three spits in a row, bracing harder each time
    ultimate: {
      dur: 2.0, hit: 0.3, t: [0, 0.2, 0.3, 0.45, 0.55, 0.7, 0.8, 1],
      rear: [0, 0.2, -0.15, 0.15, -0.18, 0.18, -0.22, 0], lunge: [0, 10, -20, 6, -24, 6, -30, 0],
      head: [0, 0.35, -0.25, 0.3, -0.28, 0.35, -0.32, 0], jaw: [0, 0.6, 1.2, 0.5, 1.2, 0.5, 1.2, 0],
      stretch: [0, 0, 0.5, 0.2, 0.6, 0.2, 0.8, 0],
    },
  },
  // Hải Long: wingless serpent — rears its head, snaps, whips the body (used once it has skills)
  // every move: draw the head back, then pitch it forward (nose down a little) and spit from the mouth
  hai_long: {
    // Thủy Châu: a quick water orb
    attack: {
      dur: 0.85, hit: 0.5, t: [0, 0.3, 0.5, 0.75, 1],
      rear: [0, 0.12, -0.14, -0.06, 0], head: [0, 0.3, -0.22, -0.1, 0], lunge: [0, 8, -24, -10, 0], jaw: [0, 0.3, 1.1, 0.4, 0],
    },
    // Hải Triều Thủy Tiễn: a longer wind-up, three jets in a row with the head thrust forward
    cast: {
      dur: 1.5, hit: 0.4, t: [0, 0.28, 0.4, 0.55, 0.7, 1],
      rear: [0, 0.2, -0.16, -0.12, -0.16, 0], head: [0, 0.4, -0.25, -0.18, -0.25, 0],
      lunge: [0, 12, -30, -24, -30, 0], jaw: [0, 0.4, 1.2, 1, 1.2, 0], stretch: [0, 0, 0.5, 0.5, 0.5, 0],
    },
    // Long Châu Hải Thần: rise up, rear back, then dive the head forward and spit the great pearl
    ultimate: {
      dur: 1.9, hit: 0.6, t: [0, 0.3, 0.5, 0.6, 0.8, 1],
      air: [0, 40, 60, 50, 20, 0], rear: [0, 0.25, 0.32, -0.2, -0.08, 0], head: [0, 0.45, 0.55, -0.3, -0.12, 0],
      jaw: [0, 0.4, 0.8, 1.3, 0.5, 0], lunge: [0, 10, 14, -34, -14, 0],
    },
  },
  // Hắc Long: fights from the air (COMBAT_HOVER) — every move starts and ends hovering
  hac_long: {
    // rise a little, then swoop down and rake with the claws
    attack: {
      dur: 1.1, hit: 0.62, t: [0, 0.3, 0.5, 0.62, 0.8, 1],
      air: [0, 20, 25, -55, -20, 0], flap: [0, 1, 1, 1, 0.6, 0], lunge: [0, 14, 10, -46, -20, 0],
      rear: [0, 0.18, 0.2, -0.22, -0.05, 0], head: [0, 0.45, 0.35, -0.42, -0.12, 0],   // rears its head back, then strikes down
      jaw: [0, 0.2, 0.3, 0.8, 0.2, 0], claw: [0, 0.2, 0.4, 1, 0.3, 0],
    },
    // Hấp Huyết: hovers high, wings wide, a long roar that drains the enemies
    cast: {
      dur: 1.6, hit: 0.5, t: [0, 0.3, 0.5, 0.8, 1],
      air: [0, 15, 22, 15, 0], flap: [0, 1, 1, 1, 0], rear: [0, 0.2, 0.28, 0.2, 0],
      head: [0, 0.45, 0.65, 0.4, 0], jaw: [0, 0.5, 1, 0.8, 0],   // throws its head back to roar wings: [0, 1, 1, 1, 0], lunge: [0, 6, 6, 6, 0],
    },
    // Đoạt Mệnh: climbs very high, hangs, then a plunging dive that slams into the target
    ultimate: {
      dur: 2.2, hit: 0.72, t: [0, 0.35, 0.58, 0.72, 0.86, 1],
      air: [0, 70, 80, -85, -40, 0], flap: [0, 1, 1, 0.3, 0, 0], lunge: [0, 18, 20, -60, -30, 0],
      rear: [0, 0.25, 0.3, -0.35, -0.1, 0], head: [0, 0.55, 0.6, -0.48, -0.15, 0],   // looks up while climbing, head down in the dive
      jaw: [0, 0.4, 1, 1, 0.3, 0], claw: [0, 0, 0.3, 1, 0.4, 0], wings: [0, 0.2, 0.4, 1, 0.5, 0], lift: [0, 0, 0, 10, 4, 0],
    },
  },
  // Rồng Xương: heavy ground brute — rears up and slams, wide-jawed bites and roars
  // Rồng Xương: two-legged bone wyvern — its wings are its weapons
  rong_xuong: {
    // Cắn Xương: half-open the wings, lunge low with the head thrust out, snap the jaws; legs push off
    attack: {
      dur: 0.9, hit: 0.5, t: [0, 0.3, 0.5, 0.72, 1],
      wings: [0, 0.6, 0.3, 0.2, 0], rear: [0, 0.15, -0.28, -0.1, 0], lunge: [0, 14, -46, -18, 0],
      head: [0, 0.3, -0.35, -0.1, 0], jaw: [0, 1, 0.05, 0.4, 0], stretch: [0, 0, 1, 0.4, 0], lift: [0, -6, 4, 2, 0],
    },
    // Cốt Dực Cuồng Phong: throw the wings wide open, then pitch forward in one huge beat —
    // mouth gaping, legs stretched out behind — and the gust blasts the enemies back
    cast: {
      dur: 1.5, hit: 0.55, t: [0, 0.35, 0.5, 0.58, 0.8, 1],
      wings: [0, 1.3, 1.4, -1.1, -0.6, 0], spread: [0, 1, 1, 0.4, 0.2, 0],
      rear: [0, 0.25, 0.28, -0.32, -0.25, 0], lunge: [0, 18, 20, -38, -30, 0], lift: [0, -10, -12, 6, 4, 0],
      head: [0, 0.4, 0.45, -0.25, -0.2, 0], jaw: [0, 0.4, 0.6, 1, 0.9, 0], stretch: [0, 0, 0.1, 1, 0.9, 0],
    },
    // Mưa Cốt Long: leap up with wings spread wide, roar to the sky, then crash down as bones rain
    ultimate: {
      dur: 2.0, hit: 0.62, t: [0, 0.2, 0.45, 0.62, 0.8, 1],
      air: [0, 0, 60, 70, 0, 0], flap: [0, 0, 1, 1, 0, 0], spread: [0, 0.6, 1, 1, 0.3, 0],
      rear: [0, -0.1, 0.45, 0.5, -0.2, 0], head: [0, -0.1, 0.6, 0.65, -0.25, 0], jaw: [0, 0.2, 1, 1, 0.4, 0],
      lunge: [0, 8, 0, 0, -24, 0], stretch: [0, 0.4, 0.8, 0.8, 0.3, 0], lift: [0, 8, 0, 0, 8, 0],
    },
  },
  // Tuấn Long: nimble support — antler charges, graceful rises, glowing hovers
  tuan_long: {
    // lower the antlers and charge forward
    attack: {
      dur: 0.8, hit: 0.48, t: [0, 0.3, 0.48, 0.7, 1],
      lunge: [0, 18, -54, -24, 0], head: [0, -0.3, -0.38, -0.1, 0], rear: [0, -0.08, -0.12, 0, 0],
      lift: [0, 4, 0, 0, 0], jaw: [0, 0, 0.2, 0, 0],
    },
    // Hào Quang Tuyết: rise gracefully, head high, wings open, a short hover
    cast: {
      dur: 1.4, hit: 0.5, t: [0, 0.35, 0.5, 0.8, 1],
      air: [0, 30, 36, 30, 0], flap: [0, 0.5, 0.6, 0.5, 0], head: [0, 0.4, 0.45, 0.4, 0],
      rear: [0, 0.15, 0.18, 0.15, 0], wings: [0, 1, 1, 1, 0],
    },
    // Sừng Thiêng Phục Sinh: leaps up spinning its wings, hangs in a glow, lands softly
    ultimate: {
      dur: 2.0, hit: 0.55, t: [0, 0.3, 0.55, 0.8, 1],
      air: [0, 70, 90, 70, 0], flap: [0, 1, 1, 1, 0], head: [0, 0.35, 0.5, 0.35, 0],
      rear: [0, 0.2, 0.25, 0.2, 0], jaw: [0, 0.2, 0.6, 0.2, 0], wings: [0, 1, 1, 1, 0],
    },
  },
};

/** Value of keyframe track `ch` of strike `s` at u (0..1): a Catmull-Rom curve through the keys, so
 *  the motion flows through each pose instead of stopping at it (first and last keys are at rest). */
function track(s: Strike, ch: string, u: number) {
  const t = s.t, v = s[ch] as number[] | undefined;
  if (!v) return 0;
  const n = t.length;
  // tangent at key i (value per unit u); zero at both ends
  const tan = (i: number) => (i <= 0 || i >= n - 1 ? 0 : (v[i + 1] - v[i - 1]) / (t[i + 1] - t[i - 1]));
  for (let k = 1; k < n; k++) {
    if (u <= t[k]) {
      const h = t[k] - t[k - 1], f = (u - t[k - 1]) / h, f2 = f * f, f3 = f2 * f;
      return (2 * f3 - 3 * f2 + 1) * v[k - 1] + (f3 - 2 * f2 + f) * h * tan(k - 1)
        + (-2 * f3 + 3 * f2) * v[k] + (f3 - f2) * h * tan(k);
    }
  }
  return v[n - 1];
}

const STRIKE_BLEND = 0.2;
const smoothstep = (u: number) => u * u * (3 - 2 * u);   // seconds to cross-fade from the previous pose into a new strike
type LegName = 'fore_near' | 'hind_near' | 'fore_far' | 'hind_far';
type Vec = [number, number];

/** rig.json as written by tools/build_rig.py */
export interface RigData {
  name: string;
  height: number;
  motion?: { sleepTail?: [number, number, number]; wingSpread?: [number, number]; rideCloud?: boolean; flyLegs?: 'tuck' | 'dangle'; flyPitch?: number; tailWave?: number[]; hindKnee?: 'back' };
  bones: {
    name: string;
    parent: string | null;
    joint: Vec;
    origin: Vec;
    toe?: Vec;
    cap?: [string, string];   // joint cap: sits between these two bones
  }[];
}

interface Bone {
  name: string;
  parent: string | null;
  joint: Vec;
  cap?: [string, string];
  img: Phaser.GameObjects.Image;
  offset: Vec;    // rest offset from the parent's joint
  pos: Vec;
  rot: number;
  sx?: number;
  sy?: number;
}

interface Leg {
  name: LegName;
  kind: 'fore' | 'hind';
  up: Bone; lo: Bone; paw: Bone;
  len1: number; len2: number;
  rest1: number; rest2: number;
  home: Vec;      // ankle position when standing
  phase: number;
}

export const rigTextureKey = (species: SpeciesId, bone: string) => `rig_${species}_${bone}`;

export class DragonRig {
  readonly container: Phaser.GameObjects.Container;
  private bones: Record<string, Bone> = {};
  private legs: Leg[];
  private motion: { sleepTail: [number, number, number]; wingSpread: [number, number]; rideCloud?: boolean; flyLegs?: 'tuck' | 'dangle'; flyPitch?: number; tailWave?: number[]; hindKnee?: 'back' };
  walk = 0;     // 0..1 blend of the walk cycle
  fly = 0;      // 0..1 blend of flight
  sleep = 0;    // 0..1 lying down
  gait = 0;     // walk cycle phase 0..1
  t = 0;
  private act: { strike: Strike; t: number } | null = null;
  private lastA: Record<string, number> = {};                        // last frame's strike channels
  private blendFrom: { A: Record<string, number>; t: number } | null = null;
  /** Height off the ground the current strike asks for (screen px at rig scale). */
  air = 0;
  private readonly species: SpeciesId;
  private hurtT = 9;     // seconds since the last hit taken
  private tinted = false;

  constructor(scene: Phaser.Scene, data: RigData, parent: Phaser.GameObjects.Container, species: SpeciesId) {
    this.species = species;
    this.container = scene.add.container(0, 0).setScale(RIG.scale);
    parent.add(this.container);
    this.motion = { sleepTail: [0.3, 0.35, 0.3], wingSpread: [0, 0], ...data.motion } as DragonRig['motion'];
    for (const b of data.bones) {
      const img = scene.add.image(b.joint[0], b.joint[1], rigTextureKey(species, b.name)).setOrigin(b.origin[0], b.origin[1]);
      this.container.add(img);
      this.bones[b.name] = { name: b.name, parent: b.parent, joint: b.joint, cap: b.cap, img, offset: [0, 0], rot: 0, pos: [...b.joint] };
    }
    for (const b of Object.values(this.bones)) {
      const p = b.parent ? this.bones[b.parent] : null;
      if (p) b.offset = [b.joint[0] - p.joint[0], b.joint[1] - p.joint[1]];
    }
    const dir = (a: Bone, b: Bone) => Math.atan2(b.joint[1] - a.joint[1], b.joint[0] - a.joint[0]);
    // two-legged species (wyverns) simply have no fore legs
    this.legs = (['fore_near', 'hind_near', 'fore_far', 'hind_far'] as LegName[]).filter(n => this.bones[`${n}_upper`]).map(name => {
      const up = this.bones[`${name}_upper`], lo = this.bones[`${name}_lower`], paw = this.bones[`${name}_paw`];
      return {
        name, kind: name.startsWith('fore') ? 'fore' : 'hind', up, lo, paw,
        len1: Math.hypot(lo.joint[0] - up.joint[0], lo.joint[1] - up.joint[1]),
        len2: Math.hypot(paw.joint[0] - lo.joint[0], paw.joint[1] - lo.joint[1]),
        rest1: dir(up, lo), rest2: dir(lo, paw),
        home: [...paw.joint] as Vec,
        phase: RIG.phase[name],
      };
    });
  }

  /** Ground speed (screen px/s at root scale 1) that matches the feet, so they never slide. */
  static walkSpeed(rootScale: number) { return RIG.stride * RIG.scale * rootScale / RIG.cycle; }

  destroy() { this.container.destroy(); }

  /** Play this species' attack pose; returns it (duration, hit time). */
  strike(kind: StrikeKind) {
    const strike = STRIKES[this.species][kind];
    this.act = { strike, t: 0 };
    // chained into another strike: start from wherever the body is now, not from rest
    this.blendFrom = { A: { ...this.lastA }, t: 0 };
    return strike;
  }

  get striking() { return this.act !== null; }

  /** Flinch: knocked back a little and flash red. */
  hurt() { this.hurtT = 0; }

  update(dt: number, mode: RigMode) {
    this.t += dt;
    const towards = (v: number, target: number, rate = RIG.blendRate) =>
      v + Math.sign(target - v) * Math.min(Math.abs(target - v), dt * rate);
    this.walk = towards(this.walk, mode === 'walk' ? 1 : 0);
    this.fly = towards(this.fly, mode === 'fly' ? 1 : 0);
    this.sleep = towards(this.sleep, mode === 'sleep' ? 1 : 0, RIG.sleepRate);
    if (this.walk > 0) this.gait = (this.gait + dt / RIG.cycle) % 1;

    // attack pose channels (all 0 when not striking)
    const A: Record<string, number> = { lunge: 0, rear: 0, lift: 0, head: 0, jaw: 0, wings: 0, claw: 0, flap: 0, air: 0, spread: 0, stretch: 0 };
    if (this.act) {
      this.act.t += dt;
      const u = this.act.t / this.act.strike.dur;
      if (u >= 1) this.act = null;
      else for (const ch of Object.keys(A)) A[ch] = track(this.act.strike, ch, u);
    }
    if (this.blendFrom) {
      this.blendFrom.t += dt;
      const w = smoothstep(Math.min(1, this.blendFrom.t / STRIKE_BLEND));
      for (const ch of Object.keys(A)) A[ch] = (this.blendFrom.A[ch] ?? 0) * (1 - w) + A[ch] * w;
      if (w >= 1) this.blendFrom = null;
    }
    this.lastA = A;
    this.air = A.air;
    this.hurtT += dt;
    const hurt = this.hurtT < 0.35 ? Math.sin(Math.PI * this.hurtT / 0.35) : 0;
    const flash = this.hurtT < 0.18;
    if (flash !== this.tinted) {
      this.tinted = flash;
      for (const b of Object.values(this.bones)) {
        if (flash) b.img.setTint(0xff7a7a); else b.img.clearTint();
      }
    }

    const t = this.t, g = this.gait, W = this.walk, F = Math.max(this.fly, A.flap), ground = 1 - F;
    const Z = this.sleep * this.sleep * (3 - 2 * this.sleep);   // eased
    const B = this.bones;

    // wing beat 0..1..0 (1 = wings up); the down-stroke is quicker than the up-stroke, like a bird
    const beat = (time: number) => {
      const fp = (time * RIG.flapRate) % 1;
      return fp < 0.4 ? 0.5 + 0.5 * Math.cos(Math.PI * fp / 0.4) : 0.5 - 0.5 * Math.cos(Math.PI * (fp - 0.4) / 0.6);
    };
    const flapUp = beat(t);

    // torso: breathing (slow and deep asleep), walk bob, lift on each down-stroke, lie down to sleep
    const breathe = Math.sin(t * 2 * Math.PI / (3 + 2 * Z));
    const bob = W * 2.5 * Math.cos(4 * Math.PI * g) * ground;
    const flapLift = F * 7 * (1 - flapUp);
    B.torso.pos = [B.torso.joint[0] + A.lunge + 12 * hurt,
      B.torso.joint[1] + breathe * (1.6 + 1.4 * Z) * (1 - W) + bob - flapLift + Z * RIG.lieDown + A.lift];
    B.torso.rot = 0.012 * breathe * (1 - W) + W * 0.015 * Math.sin(2 * Math.PI * g) - F * 0.1 + Z * 0.04 + A.rear - 0.06 * hurt + F * (this.motion.flyPitch ?? 0);

    // head: look around when idle, counter-bob walking, bob with each beat flying, chin down asleep
    this.local('head', (0.04 * Math.sin(t * 0.7) * (1 - W) + W * 0.04 * Math.sin(4 * Math.PI * g + 1.2)) * (1 - Z)
      + F * (0.06 + 0.07 * flapUp + 0.6 * (this.motion.flyPitch ?? 0)) - Z * 0.32 + A.head);

    // crest (species that have one): flutters in the breeze, bobs with the steps, streams back on each
    // wing beat in flight, lies flat asleep
    if (B.crest) {
      this.local('crest', (0.05 * Math.sin(t * 2.3) + 0.03 * Math.sin(t * 5.1)) * (1 - F) * (1 - Z)
        + W * 0.07 * Math.sin(4 * Math.PI * g - 0.8) + F * (0.12 + 0.22 * (1 - flapUp)) + Z * 0.18 - 0.12 * A.rear);
    }

    // jaw (species that have one): breathes slightly open, yawns while lying down to sleep
    if (B.jaw) {
      const yawn = Math.max(0, Math.sin(Math.PI * Math.min(1, this.sleep * 1.4)));
      this.local('jaw', -(0.03 * (1 + breathe) * (1 - Z) + 0.45 * yawn * (mode === 'sleep' ? 1 : 0) + F * 0.12 * (1 - flapUp) + 0.5 * A.jaw));
    }

    // wings. Flight: flip through the root (scaleY 1 -> -0.55: up, edge-on, below the body) with a
    // small turn, so it beats instead of swinging around a point in the air. The far wing beats a
    // little later and fans a bit wider so it never hides exactly behind the near wing.
    const spread = this.motion.wingSpread;   // per-species V spread on the ground (radians)
    for (const [k, name, lag, fan] of [[0, 'wing_near', 0, 0], [1, 'wing_far', 0.12, 0.16]] as const) {
      if (!B[name]) continue;   // a species may have only one visible wing
      const up = beat(t - lag);
      const rest = 0.03 * breathe * (1 - Z) + W * 0.04 * Math.sin(2 * Math.PI * g) + Z * 0.28;
      this.local(name, (rest + spread[k] * (1 - Z)) * (1 - F) + F * (0.25 * (1 - up) - 0.1 + fan * up) - 0.35 * A.wings * (1 - F)
        + A.spread * (k === 0 ? 0.35 : -0.45));
      B[name].sy = ((1 - F) * (1 - 0.25 * Z) + F * (-0.55 + 1.55 * up)) * (1 + 0.18 * A.spread);
      B[name].sx = (1 - F * 0.12 * (1 - up)) * (1 + 0.12 * A.spread);
    }

    // tail: travelling wave, faster walking, streaming back in flight, resting/curled asleep
    // cloud riders: the long body undulates like a swimming Eastern dragon instead of streaming back
    const R = this.motion.rideCloud ? F : 0;
    const wave = (k: number, amp: number) => amp * Math.sin(t * (1.6 + 2.5 * W - 0.8 * Z + 1.4 * R) - k * 0.9);
    const curl = this.motion.sleepTail, back = F - R;
    // tails have 1 to 4 pieces (a one-piece tail swishes a little more)
    const one = B.tail_mid ? 0 : 1;
    const tw = this.motion.tailWave ?? [1, 1, 1, 1];   // per-species sway of each tail piece
    if (B.tail_base) this.local('tail_base', tw[0] * (wave(0, 0.05 + 0.04 * W + 0.06 * R + one * 0.07) - back * 0.15) + Z * curl[0]);
    if (B.tail_mid) this.local('tail_mid', tw[1] * (wave(1, 0.08 + 0.05 * W + 0.1 * R) - back * 0.1) + Z * curl[1]);
    if (B.tail_tip) this.local('tail_tip', tw[2] * (wave(2, 0.12 + 0.06 * W + 0.14 * R) + back * 0.1) + Z * curl[2]);
    if (B.tail_fan) this.local('tail_fan', tw[3] * (wave(3, 0.14 + 0.06 * W + 0.12 * R) + back * 0.08) + Z * curl[2] * 0.5);   // 4-piece tails

    // legs: IK to an ankle target (planted, walk cycle, folded asleep, or tucked in flight)
    for (const L of this.legs) {
      const hip = this.place(L.up.name);
      let [tx, ty] = L.home;
      let pawTilt = 0;
      if (W > 0) {
        const phi = (g - L.phase + 1) % 1, S = RIG.stride;
        if (phi < RIG.duty) {                       // stance: slide back at ground speed
          tx += (-S / 2 + S * phi / RIG.duty) * W;
        } else {                                    // swing: lift and reach forward
          const u = (phi - RIG.duty) / (1 - RIG.duty), e = u * u * (3 - 2 * u), s = Math.sin(Math.PI * u);
          tx += (S / 2 - S * e) * W;
          ty -= RIG.lift[L.kind] * s * W;
          pawTilt = -0.55 * s * W;                 // toes hang down a little in the air
        }
      }
      if (A.stretch > 0 && L.kind === 'hind') {     // legs pushed out straight behind the body
        tx += 30 * A.stretch; pawTilt += 0.25 * A.stretch;
      }
      if (A.claw > 0 && L.name === 'fore_near') {   // swipe: near front paw reaches forward and up
        tx -= 34 * A.claw; ty -= 26 * A.claw; pawTilt -= 0.6 * A.claw;
      }
      if (Z > 0) {                                  // asleep: front paws forward, hind legs folded
        const fold = L.kind === 'fore' ? [hip[0] - 32, L.home[1]] : [hip[0] + 4, L.home[1]];
        tx += (fold[0] - tx) * Z; ty += (fold[1] - ty) * Z;
      }
      if (F > 0 && !this.motion.rideCloud) {        // flying: paws pulled up and back under the belly
                                                    // (cloud riders keep standing on their cloud)
        if (this.motion.flyLegs === 'dangle') {
          // legs hang stretched down and back, swaying gently out of step with each other
          // hind legs reach (almost) full length so the knee stays straight instead of folding
          const reach = (L.kind === 'fore' ? 0.92 : 0.995) * (L.len1 + L.len2), sway = Math.sin(t * 2.4 + L.phase * 2 * Math.PI);
          // hind legs trail well back, in line with the body, so they read as stretched out, not crouched
          const a = (L.kind === 'fore' ? 0.35 : 1.05) + 0.12 * sway;   // angle back from straight down
          const hang = [hip[0] + reach * Math.sin(a), hip[1] + reach * Math.cos(a)];
          tx += (hang[0] - tx) * F; ty += (hang[1] - ty) * F;
          pawTilt += F * ((L.kind === 'fore' ? 0.5 : 1.1) + 0.15 * sway);   // toes point back
        } else {
          const tuck = [hip[0] + (L.kind === 'fore' ? 14 : 24), hip[1] + 0.55 * (L.len1 + L.len2)];
          tx += (tuck[0] - tx) * F; ty += (tuck[1] - ty) * F;
          pawTilt += F * (L.kind === 'fore' ? 0.9 : 0.6);
        }
      }
      this.solveLeg(L, hip, [tx, ty], pawTilt);
    }

    // joint caps sit on the child's joint, turned half way between the two pieces
    for (const b of Object.values(B)) {
      if (!b.cap) continue;
      const [pa, ch] = b.cap.map(n => B[n]);
      b.pos = ch.pos;
      b.rot = (pa.rot + ch.rot) / 2;
    }
    for (const b of Object.values(B)) b.img.setPosition(b.pos[0], b.pos[1]).setRotation(b.rot).setScale(b.sx ?? 1, b.sy ?? 1);
  }

  /** FK: bone rotation relative to its parent; position follows the parent's joint. */
  private local(name: string, angle: number) {
    const b = this.bones[name];
    b.pos = this.place(name);
    b.rot = this.bones[b.parent!].rot + angle;
  }

  /** Where a bone's joint is, given its parent's current pose. */
  private place(name: string): Vec {
    const b = this.bones[name], p = this.bones[b.parent!];
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    return [p.pos[0] + b.offset[0] * c - b.offset[1] * s, p.pos[1] + b.offset[0] * s + b.offset[1] * c];
  }

  private solveLeg(L: Leg, hip: Vec, target: Vec, pawTilt: number) {
    const [hx, hy] = hip;
    let dx = target[0] - hx, dy = target[1] - hy;
    let d = Math.hypot(dx, dy);
    const max = L.len1 + L.len2 - 0.01;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }   // out of reach: stretch towards it
    const base = Math.atan2(dy, dx);
    // hindKnee 'back': the art draws the hind knee bent the other way (Kì Lân); bending it forward
    // would turn the shin far off its drawn angle and open a gap at the knee
    const bend = L.kind === 'hind' && this.motion.hindKnee === 'back' ? 1 : RIG.bend[L.kind];
    const off = Math.acos(Math.max(-1, Math.min(1, (L.len1 ** 2 + d * d - L.len2 ** 2) / (2 * L.len1 * d))));
    // pick the solution whose middle joint points the right way
    const [kx, ky, a1] = [base + off, base - off]
      .map(a => [hx + L.len1 * Math.cos(a), hy + L.len1 * Math.sin(a), a])
      .sort((p, q) => bend * (q[0] - p[0]))[0];
    const ax = hx + dx, ay = hy + dy;
    L.up.pos = [hx, hy]; L.up.rot = a1 - L.rest1;
    L.lo.pos = [kx, ky]; L.lo.rot = Math.atan2(ay - ky, ax - kx) - L.rest2;
    L.paw.pos = [ax, ay]; L.paw.rot = pawTilt;
  }

  /** World position of a point on the head image, given as a share of its width/height. */
  private onHead(fx: number, fy: number) {
    const img = this.bones.head.img;
    const m = img.getWorldTransformMatrix();
    return m.transformPoint((fx - img.originX) * img.width, (fy - img.originY) * img.height);
  }

  /** Roughly where the mouth is (projectiles and breath start here). */
  mouthWorld() { return this.onHead(0.1, 0.62); }

  /** Just above the head (for the sleeping "z"). */
  headWorld() { return this.onHead(0.3, 0.05); }

  /** Pixel-accurate hit test in world coordinates. */
  hit(x: number, y: number, scene: Phaser.Scene) {
    if (!this.container.visible) return false;
    return Object.values(this.bones).some(({ img }) => {
      const pt = img.getLocalPoint(x, y);
      if (pt.x < 0 || pt.y < 0 || pt.x >= img.width || pt.y >= img.height) return false;
      return (scene.textures.getPixelAlpha(Math.floor(pt.x), Math.floor(pt.y), img.texture.key) ?? 0) > 60;
    });
  }
}
