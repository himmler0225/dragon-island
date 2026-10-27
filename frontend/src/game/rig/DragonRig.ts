// Dragon rig: pieces, joints, IK, walk, flight, breathing and strikes.
import * as Phaser from 'phaser';
import { RIG } from './tuning';
import { track, smoothstep, STRIKES } from './strikes';
import { rigTextureKey, type RigData, type Strike, type StrikeKind, type Vec, type LegName } from './types';
import type { SpeciesId } from '../config/species';
import { alphaAt } from './alphaMask';
import { makeLids, updateLids } from './eyelids';
import { applyPose } from './pose';

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
  private motion: { sleepTail: [number, number, number]; wingSpread: [number, number]; rideCloud?: boolean; flyLegs?: 'tuck' | 'dangle'; flyPitch?: number; tailWave?: number[]; hindKnee?: 'back'; swingTilt?: number; rigidLegs?: boolean; stride?: number; liftScale?: number; flyHang?: [number, number]; neck?: number; fan?: number[]; slither?: boolean; foreArms?: boolean; stance?: [number, number]; armPose?: [[number, number], [number, number]] };
  walk = 0;     // 0..1 blend of the walk cycle
  fly = 0;      // 0..1 blend of flight
  sleep = 0;    // 0..1 lying down
  gait = 0;
  private tailPhase = 0;     // walk cycle phase 0..1
  t = 0;
  private act: { strike: Strike; t: number } | null = null;
  private lastA: Record<string, number> = {};
  private blendFrom: { A: Record<string, number>; t: number } | null = null;
  /** Height off the ground the current strike asks for (screen px at rig scale). */
  air = 0;
  private readonly species: SpeciesId;
  private hurtT = 9;
  private tinted: 'none' | 'white' | 'red' = 'none';
  private whiteHit = false;

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
    this.eyeState.lids = this.bones.head ? makeLids(scene, this.bones.head.img, species, this.container) : [];
    this.eyeState.blinkT = Phaser.Math.FloatBetween(2, 5);
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
    const hind = this.legs.find(L => L.kind === 'hind');
    const legLen = hind ? hind.len1 + hind.len2 : 90;
    this.stride = this.motion.stride ?? RIG.stride;
    const ls = this.motion.liftScale ?? 1;
    this.lift = { fore: legLen * RIG.lift.fore * ls, hind: legLen * RIG.lift.hind * ls };
  }

  /** rig px a planted foot travels per walk cycle, and how high a swinging paw rises */
  private stride: number;
  private lift: { fore: number; hind: number };

  /** Eyelids: a skin-coloured lid drawn over each eye, growing down from the top of the eye. */
  private eyeState = { lids: [] as ReturnType<typeof import("./eyelids").makeLids>, blinkT: 0 };
  /** Ground speed (screen px/s at root scale 1) that matches the feet, so they never slide. */
  walkSpeed(rootScale: number) { return this.stride * RIG.scale * rootScale / RIG.cycle; }

  destroy() { this.container.destroy(); }

  /** Play this species' attack pose; returns it (duration, hit time). */
  strike(kind: StrikeKind) {
    const keys = STRIKES[this.species][kind];
    const strike: Strike = { ...keys, dur: keys.dur * RIG.strike.tempo };
    this.act = { strike, t: 0 };
    this.blendFrom = { A: { ...this.lastA }, t: 0 };
    return strike;
  }

  get striking() { return this.act !== null; }

  /** Front-paw stomps so far (goes up by one on each landing): callers puff dust when it changes. */
  stomps = 0;
  private stompArmed = new Set<string>();

  /** Flinch: knocked back a little and flash red. */
  /** `white`: a solid white hit-flash first (battle), then the red one. */
  hurt(white = false) { this.hurtT = 0; this.whiteHit = white; }

  update(dt: number, mode: string) {
    this.t += dt;
    const towards = (v: number, target: number, rate = RIG.blendRate) =>
      v + Math.sign(target - v) * Math.min(Math.abs(target - v), dt * rate);
    this.walk = towards(this.walk, mode === 'walk' ? 1 : 0);
    this.fly = towards(this.fly, mode === 'fly' ? 1 : 0);
    this.sleep = towards(this.sleep, mode === 'sleep' ? 1 : 0, RIG.sleepRate);
    if (this.walk > 0) this.gait = (this.gait + dt / RIG.cycle) % 1;

    // attack pose channels (all 0 when not striking)
    const A: Record<string, number> = { lunge: 0, rear: 0, lift: 0, head: 0, jaw: 0, wings: 0, claw: 0, flap: 0, air: 0, spread: 0, stretch: 0, breath: 0, stompL: 0, stompR: 0, fan: 0 };
    if (this.act) {
      this.act.t += dt;
      const u = this.act.t / this.act.strike.dur;
      if (u >= 1) this.act = null;
      else for (const ch of Object.keys(A)) A[ch] = track(this.act.strike, ch, u);
    }
    if (this.blendFrom) {
      this.blendFrom.t += dt;
      const w = smoothstep(Math.min(1, this.blendFrom.t / RIG.strike.blend));
      for (const ch of Object.keys(A)) A[ch] = (this.blendFrom.A[ch] ?? 0) * (1 - w) + A[ch] * w;
      if (w >= 1) this.blendFrom = null;
    }
    // a front paw coming down hard: armed once its stomp channel is high, counted when it is back down
    for (const ch of ['stompL', 'stompR']) {
      if (A[ch] > 0.5) this.stompArmed.add(ch);
      else if (A[ch] < 0.08 && this.stompArmed.delete(ch)) this.stomps++;
    }
    this.lastA = A;
    this.air = A.air;
    this.hurtT += dt;
    const hurt = this.hurtT < 0.35 ? Math.sin(Math.PI * this.hurtT / 0.35) : 0;
    const flash = this.hurtT >= 0.18 ? 'none' : this.whiteHit && this.hurtT < 0.06 ? 'white' : 'red';
    if (flash !== this.tinted) {
      this.tinted = flash;
      for (const b of Object.values(this.bones)) {
        if (flash === 'white') b.img.setTintFill(0xffffff);
        else if (flash === 'red') b.img.setTint(0xff7a7a);
        else b.img.clearTint();
      }
    }

    const t = this.t, g = this.gait, W = this.walk, F = Math.max(this.fly, A.flap);
    const Z = this.sleep * this.sleep * (3 - 2 * this.sleep);
    this.tailPhase += dt * (1.6 + 2.5 * W - 0.8 * Z + 1.4 * (this.motion.rideCloud ? F : 0));
    // yawn: only while falling asleep, not while waking up
    const yawn = mode === 'sleep' ? Math.max(0, Math.sin(Math.PI * Math.min(1, this.sleep * 1.4))) : 0;
    applyPose(this.bones, this.legs, t, g, W, F, Z, hurt, A, this.motion, this.tailPhase, this.stride, this.lift, yawn);
    for (const b of Object.values(this.bones)) b.img.setPosition(b.pos[0], b.pos[1]).setRotation(b.rot).setScale(b.sx ?? 1, b.sy ?? 1);
    this.eyeState.blinkT = updateLids(this.eyeState.lids, this.bones.head.img, this.eyeState.blinkT, dt, Z, mode);
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
      return alphaAt(scene, img.texture.key, Math.floor(pt.x), Math.floor(pt.y)) > 60;
    });
  }
}
