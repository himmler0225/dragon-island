// Cut-out (skeletal) dragon: pieces and joints from public/dragons/<id>/rig.json (tools/build_rig.py).
// Forward kinematics for head/wings/tail, 2-bone IK for the legs, a lateral-sequence walk
// (left hind -> left fore -> right hind -> right fore), breathing, tail sway, wing flap, sleep pose.
// Rig space: origin on the ground under the body, y up is negative, the dragon faces left.
import * as Phaser from 'phaser';
import { RIG } from './tuning';
import { solveLeg } from './ik';
import { track, smoothstep, STRIKES } from './strikes';
import { rigTextureKey, type RigData, type Strike, type StrikeKind, type Vec, type LegName } from './types';
import type { SpeciesId } from '../config/species';

type Bone = {
  name: string;
  parent: string | null;
  joint: Vec;
  cap?: [string, string];
  img: Phaser.GameObjects.Image;
  offset: Vec;
  pos: Vec;
  rot: number;
  sx?: number;
  sy?: number;
};

export interface Leg {
  name: LegName;
  kind: 'fore' | 'hind';
  up: Bone; lo: Bone; paw: Bone;
  len1: number; len2: number;
  rest1: number; rest2: number;
  home: Vec;
  phase: number;
}

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
  private lastA: Record<string, number> = {};
  private blendFrom: { A: Record<string, number>; t: number } | null = null;
  /** Height off the ground the current strike asks for (screen px at rig scale). */
  air = 0;
  private readonly species: SpeciesId;
  private hurtT = 9;
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
    this.blendFrom = { A: { ...this.lastA }, t: 0 };
    return strike;
  }

  get striking() { return this.act !== null; }

  /** Flinch: knocked back a little and flash red. */
  hurt() { this.hurtT = 0; }

  update(dt: number, mode: string) {
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
      const w = smoothstep(Math.min(1, this.blendFrom.t / 0.2));
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
    const Z = this.sleep * this.sleep * (3 - 2 * this.sleep);
    const B = this.bones;

    // wing beat 0..1..0 (1 = wings up)
    const beat = (time: number) => {
      const fp = (time * RIG.flapRate) % 1;
      return fp < 0.4 ? 0.5 + 0.5 * Math.cos(Math.PI * fp / 0.4) : 0.5 - 0.5 * Math.cos(Math.PI * (fp - 0.4) / 0.6);
    };
    const flapUp = beat(t);

    // torso
    const breathe = Math.sin(t * 2 * Math.PI / (3 + 2 * Z));
    const bob = W * 2.5 * Math.cos(4 * Math.PI * g) * ground;
    const flapLift = F * 7 * (1 - flapUp);
    B.torso.pos = [B.torso.joint[0] + A.lunge + 12 * hurt,
      B.torso.joint[1] + breathe * (1.6 + 1.4 * Z) * (1 - W) + bob - flapLift + Z * RIG.lieDown + A.lift];
    B.torso.rot = 0.012 * breathe * (1 - W) + W * 0.015 * Math.sin(2 * Math.PI * g) - F * 0.1 + Z * 0.04 + A.rear - 0.06 * hurt + F * (this.motion.flyPitch ?? 0);

    // head
    this.local('head', (0.04 * Math.sin(t * 0.7) * (1 - W) + W * 0.04 * Math.sin(4 * Math.PI * g + 1.2)) * (1 - Z)
      + F * (0.06 + 0.07 * flapUp + 0.6 * (this.motion.flyPitch ?? 0)) - Z * 0.32 + A.head);

    // crest
    if (B.crest) {
      this.local('crest', (0.05 * Math.sin(t * 2.3) + 0.03 * Math.sin(t * 5.1)) * (1 - F) * (1 - Z)
        + W * 0.07 * Math.sin(4 * Math.PI * g - 0.8) + F * (0.12 + 0.22 * (1 - flapUp)) + Z * 0.18 - 0.12 * A.rear);
    }

    // jaw
    if (B.jaw) {
      const yawn = Math.max(0, Math.sin(Math.PI * Math.min(1, this.sleep * 1.4)));
      this.local('jaw', -(0.03 * (1 + breathe) * (1 - Z) + 0.45 * yawn * (mode === 'sleep' ? 1 : 0) + F * 0.12 * (1 - flapUp) + 0.5 * A.jaw));
    }

    // wings
    const spread = this.motion.wingSpread;
    for (const [k, name, lag, fan] of [[0, 'wing_near', 0, 0], [1, 'wing_far', 0.12, 0.16]] as const) {
      if (!B[name]) continue;
      const up = beat(t - lag);
      const rest = 0.03 * breathe * (1 - Z) + W * 0.04 * Math.sin(2 * Math.PI * g) + Z * 0.28;
      this.local(name, (rest + spread[k] * (1 - Z)) * (1 - F) + F * (0.25 * (1 - up) - 0.1 + fan * up) - 0.35 * A.wings * (1 - F)
        + A.spread * (k === 0 ? 0.35 : -0.45));
      B[name].sy = ((1 - F) * (1 - 0.25 * Z) + F * (-0.55 + 1.55 * up)) * (1 + 0.18 * A.spread);
      B[name].sx = (1 - F * 0.12 * (1 - up)) * (1 + 0.12 * A.spread);
    }

    // tail
    const R = this.motion.rideCloud ? F : 0;
    const wave = (k: number, amp: number) => amp * Math.sin(t * (1.6 + 2.5 * W - 0.8 * Z + 1.4 * R) - k * 0.9);
    const curl = this.motion.sleepTail, back = F - R;
    const one = B.tail_mid ? 0 : 1;
    const tw = this.motion.tailWave ?? [1, 1, 1, 1];
    if (B.tail_base) this.local('tail_base', tw[0] * (wave(0, 0.05 + 0.04 * W + 0.06 * R + one * 0.07) - back * 0.15) + Z * curl[0]);
    if (B.tail_mid) this.local('tail_mid', tw[1] * (wave(1, 0.08 + 0.05 * W + 0.1 * R) - back * 0.1) + Z * curl[1]);
    if (B.tail_tip) this.local('tail_tip', tw[2] * (wave(2, 0.12 + 0.06 * W + 0.14 * R) + back * 0.1) + Z * curl[2]);
    if (B.tail_fan) this.local('tail_fan', tw[3] * (wave(3, 0.14 + 0.06 * W + 0.12 * R) + back * 0.08) + Z * curl[2] * 0.5);

    // legs
    for (const L of this.legs) {
      const hip = this.place(L.up.name);
      let [tx, ty] = L.home;
      let pawTilt = 0;
      if (W > 0) {
        const phi = (g - L.phase + 1) % 1, S = RIG.stride;
        if (phi < RIG.duty) {
          tx += (-S / 2 + S * phi / RIG.duty) * W;
        } else {
          const u = (phi - RIG.duty) / (1 - RIG.duty), e = u * u * (3 - 2 * u), s = Math.sin(Math.PI * u);
          tx += (S / 2 - S * e) * W;
          ty -= RIG.lift[L.kind] * s * W;
          pawTilt = -0.55 * s * W;
        }
      }
      if (A.stretch > 0 && L.kind === 'hind') {
        tx += 30 * A.stretch; pawTilt += 0.25 * A.stretch;
      }
      if (A.claw > 0 && L.name === 'fore_near') {
        tx -= 34 * A.claw; ty -= 26 * A.claw; pawTilt -= 0.6 * A.claw;
      }
      if (Z > 0) {
        const fold = L.kind === 'fore' ? [hip[0] - 32, L.home[1]] : [hip[0] + 4, L.home[1]];
        tx += (fold[0] - tx) * Z; ty += (fold[1] - ty) * Z;
      }
      if (F > 0 && !this.motion.rideCloud) {
        if (this.motion.flyLegs === 'dangle') {
          const reach = (L.kind === 'fore' ? 0.92 : 0.995) * (L.len1 + L.len2), sway = Math.sin(t * 2.4 + L.phase * 2 * Math.PI);
          const a = (L.kind === 'fore' ? 0.35 : 1.05) + 0.12 * sway;
          const hang = [hip[0] + reach * Math.sin(a), hip[1] + reach * Math.cos(a)];
          tx += (hang[0] - tx) * F; ty += (hang[1] - ty) * F;
          pawTilt += F * ((L.kind === 'fore' ? 0.5 : 1.1) + 0.15 * sway);
        } else {
          const tuck = [hip[0] + (L.kind === 'fore' ? 14 : 24), hip[1] + 0.55 * (L.len1 + L.len2)];
          tx += (tuck[0] - tx) * F; ty += (tuck[1] - ty) * F;
          pawTilt += F * (L.kind === 'fore' ? 0.9 : 0.6);
        }
      }
      const bend = L.kind === 'hind' && this.motion.hindKnee === 'back' ? 1 : RIG.bend[L.kind];
      solveLeg(L, hip, [tx, ty], pawTilt, bend);
    }

    // joint caps
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
