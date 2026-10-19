// Dragon rig: pieces, joints, IK, walk, flight, breathing and strikes.
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

/** Alpha masks of the rig textures, read once per texture: scene.textures.getPixelAlpha redraws the
 *  frame into a canvas on every call, which made tapping a dragon stutter. */
const ALPHA = new Map<string, { w: number; data: Uint8ClampedArray }>();
function pixels(scene: Phaser.Scene, key: string) {
  let m = ALPHA.get(key);
  if (!m) {
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(src, 0, 0);
    m = { w: c.width, data: g.getImageData(0, 0, c.width, c.height).data };
    ALPHA.set(key, m);
  }
  return m;
}
function alphaAt(scene: Phaser.Scene, key: string, x: number, y: number) {
  const m = pixels(scene, key);
  return m.data[(y * m.w + x) * 4 + 3] ?? 0;
}

/** Eyes on each species' head.png, as shares of the image: centre, half-size, tilt (radians).
 *  Used for eyelids that close when the dragon sleeps and blink now and then. Species not listed
 *  have no eyelids (Rồng Xương is a skull; Hắc Long, Thần Long, Kì Lân, Rồng Vàng/Bạc left as drawn). */
/** How far the mouth interior pieces are drawn open (rad), see tools/rig_jaw.py. */
const MOUTH_OPEN = 0.6;

const EYES: Partial<Record<SpeciesId, { x: number; y: number; rx: number; ry: number; tilt?: number }[]>> = {
  tuan_long: [{ x: 0.155, y: 0.645, rx: 0.045, ry: 0.034 }],
  tu_xa_long: [{ x: 0.335, y: 0.48, rx: 0.058, ry: 0.062 }],
  // (the phoenix heads were redrawn with a separate beak, tools/rig_jaw.py: eyes re-measured)
  phuong_hoang_lua: [{ x: 0.318, y: 0.484, rx: 0.071, ry: 0.067 }],
  phuong_hoang_bang: [{ x: 0.347, y: 0.481, rx: 0.073, ry: 0.072 }],
};

export class DragonRig {
  readonly container: Phaser.GameObjects.Container;
  private bones: Record<string, Bone> = {};
  private legs: Leg[];
  private motion: { sleepTail: [number, number, number]; wingSpread: [number, number]; rideCloud?: boolean; flyLegs?: 'tuck' | 'dangle'; flyPitch?: number; tailWave?: number[]; hindKnee?: 'back'; swingTilt?: number; rigidLegs?: boolean; stride?: number; flyHang?: [number, number]; slither?: boolean; foreArms?: boolean; stance?: [number, number]; armPose?: [[number, number], [number, number]] };
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
    this.makeLids(scene, species);
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
    this.lift = { fore: legLen * RIG.lift.fore, hind: legLen * RIG.lift.hind };
  }

  /** rig px a planted foot travels per walk cycle, and how high a swinging paw rises */
  private stride: number;
  private lift: { fore: number; hind: number };

  /** Eyelids: a skin-coloured lid drawn over each eye, growing down from the top of the eye. */
  private lids: { img: Phaser.GameObjects.Image; eye: { x: number; y: number; rx: number; ry: number; tilt?: number } }[] = [];
  private blinkT = Phaser.Math.FloatBetween(2, 5);
  private makeLids(scene: Phaser.Scene, species: SpeciesId) {
    const head = this.bones.head?.img;
    if (!head) return;
    const px = pixels(scene, head.texture.key), W = head.width, H = head.height;
    (EYES[species] ?? []).forEach((e, k) => {
      const key = `lid_${species}_${k}`;
      const w = Math.max(6, Math.round(2 * e.rx * W)), h = Math.max(4, Math.round(2 * e.ry * H));
      if (!scene.textures.exists(key)) {
        // skin colour: average of a few pixels just above the eye
        let r = 0, g = 0, b = 0, n = 0;
        for (let dx = -e.rx * 0.6; dx <= e.rx * 0.6; dx += e.rx * 0.3) {
          const sx = Math.round((e.x + dx) * W), sy = Math.round((e.y - e.ry * 1.9) * H);
          const o = (sy * px.w + sx) * 4;
          if ((px.data[o + 3] ?? 0) > 200) { r += px.data[o]; g += px.data[o + 1]; b += px.data[o + 2]; n++; }
        }
        const skin = n ? Phaser.Display.Color.GetColor(r / n, g / n, b / n) : 0x888888;
        const dark = n ? Phaser.Display.Color.GetColor(r / n * 0.35, g / n * 0.35, b / n * 0.35) : 0x222222;
        const gr = scene.make.graphics({ x: 0, y: 0 }, false);
        gr.fillStyle(skin, 1).fillEllipse(w / 2 + 1, h / 2 + 1, w, h);
        gr.lineStyle(Math.max(1.5, h * 0.12), dark, 0.9).beginPath()
          .arc(w / 2 + 1, h / 2 + 1 - h * 0.1, w * 0.46, Math.PI * 0.12, Math.PI * 0.88, false).strokePath();
        gr.generateTexture(key, w + 2, h + 2); gr.destroy();
      }
      const img = scene.add.image(0, 0, key).setOrigin(0.5, 0).setVisible(false);
      this.container.add(img);
      this.container.moveAbove(img, head);
      this.lids.push({ img, eye: e });
    });
  }

  private updateLids(dt: number, Z: number, mode: string) {
    if (!this.lids.length) return;
    // blink every few seconds while awake
    let blink = 0;
    if ((this.blinkT -= dt) < 0) {
      blink = Math.sin(Math.PI * Math.min(1, -this.blinkT / 0.18));
      if (this.blinkT < -0.18) this.blinkT = Phaser.Math.FloatBetween(2.5, 6);
    }
    const shut = Math.max(Math.min(1, Z * 1.3), mode === 'sleep' ? Z : 0, blink);
    const head = this.bones.head.img, W = head.width, H = head.height;
    const c = Math.cos(head.rotation), s = Math.sin(head.rotation);
    for (const { img, eye } of this.lids) {
      const lx = (eye.x - head.originX) * W, ly = (eye.y - eye.ry - head.originY) * H;
      img.setPosition(head.x + lx * c - ly * s, head.y + lx * s + ly * c)
        .setRotation(head.rotation + (eye.tilt ?? 0)).setScale(1, shut).setVisible(shut > 0.02);
    }
  }

  /** Ground speed (screen px/s at root scale 1) that matches the feet, so they never slide. */
  walkSpeed(rootScale: number) { return this.stride * RIG.scale * rootScale / RIG.cycle; }

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
    const flash = this.hurtT >= 0.18 ? 'none' : this.whiteHit && this.hurtT < 0.06 ? 'white' : 'red';
    if (flash !== this.tinted) {
      this.tinted = flash;
      for (const b of Object.values(this.bones)) {
        if (flash === 'white') b.img.setTintFill(0xffffff);
        else if (flash === 'red') b.img.setTint(0xff7a7a);
        else b.img.clearTint();
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
    this.local('head', (this.motion.slither ? -0.06 * W * Math.sin(4 * Math.PI * g + 0.6) : 0) + (0.04 * Math.sin(t * 0.7) * (1 - W) + W * 0.04 * Math.sin(4 * Math.PI * g + 1.2)) * (1 - Z)
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
      // mouth interior (tools/rig_jaw.py): drawn open MOUTH_OPEN rad; its floor follows the jaw while
      // its roof turns up behind the head, and it fades out as the jaw closes
      if (B.mouth) {
        const open = Math.max(0, B.head.rot - B.jaw.rot);
        this.local('mouth', MOUTH_OPEN - open);
        B.mouth.img.setAlpha(Math.min(1, Math.max(0, (open - 0.08) / 0.12)));   // not while just breathing (jaw ~0.03-0.06)
      }
    }

    // wings
    const spread = this.motion.wingSpread;
    // both wings beat together (the far one used to trail behind, which read as lopsided)
    for (const [k, name, lag, fan] of [[0, 'wing_near', 0, 0], [1, 'wing_far', 0, 0]] as const) {
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
    // tail phase is integrated (speed x dt), not speed x total time: changing the speed (walk -> sleep)
    // used to jump the phase and flick the tail
    this.tailPhase += dt * (1.6 + 2.5 * W - 0.8 * Z + 1.4 * R);
    const idleWave = (k: number, amp: number) => amp * Math.sin(this.tailPhase - k * 0.9);
    // slither (legless serpents): crawling, a bigger wave runs from the neck to the tail locked to the
    // gait, so the body pushes the serpent forward instead of the legs
    const S = this.motion.slither ? W : 0;
    const wave = (k: number, amp: number) => (1 - S) * idleWave(k, amp) + S * (0.45 * amp + 0.035) * Math.sin(2 * Math.PI * 2 * g - k * 1.2);   // gentle: the bends add up along the chain
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
      const arm = L.kind === 'fore' && this.motion.foreArms;
      if (arm) {
        // arms: walking, each swings against the hind leg on its own side (near arm forward while the
        // near leg steps back); standing, a slow sway with the breath, the two arms out of step
        const walkSw = Math.sin(2 * Math.PI * (g + (L.name === 'fore_near' ? 0.5 : 0)));
        const idleSw = Math.sin(t * 1.7 + (L.name === 'fore_near' ? 0 : 1.3));
        const sw = W * walkSw + (1 - W) * idleSw;
        const [px, py] = this.motion.armPose?.[L.name === 'fore_near' ? 0 : 1] ?? [0, 0];
        tx += px; ty += py;
        tx += (4 + 10 * W) * sw;
        ty -= (2 + 4 * W) * Math.max(0, sw);
        pawTilt += 0.18 * sw;
      } else {
        // standing: the far feet stand a little apart from the near ones (both a step toward the tail:
        // a far hind foot stepped forward wedged under the belly) so all legs show, instead of each far leg hiding behind its near twin
        if (L.name.endsWith('_far')) tx += (this.motion.stance ?? [48, 40])[L.kind === 'fore' ? 0 : 1] * (1 - W);
      }
      if (!arm && W > 0) {
        const phi = (g - L.phase + 1) % 1, S = this.stride;
        if (phi < RIG.duty) {
          tx += (-S / 2 + S * phi / RIG.duty) * W;
        } else {
          const u = (phi - RIG.duty) / (1 - RIG.duty), e = u * u * (3 - 2 * u), s = Math.sin(Math.PI * u);
          tx += (S / 2 - S * e) * W;
          ty -= this.lift[L.kind] * s * W;
          pawTilt = -(this.motion.swingTilt ?? 0.55) * s * W;
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
        if (this.motion.flyLegs !== 'tuck') {   // default: legs hang stretched out (no tucking)
          const reach = (L.kind === 'fore' ? 0.92 : 0.995) * (L.len1 + L.len2), sway = Math.sin(t * 2.4 + L.phase * 2 * Math.PI);
          const hang = this.motion.flyHang ?? [0.35, 1.05];
          const a = hang[L.kind === 'fore' ? 0 : 1] + 0.12 * sway;
          const foot = [hip[0] + reach * Math.sin(a), hip[1] + reach * Math.cos(a)];
          tx += (foot[0] - tx) * F; ty += (foot[1] - ty) * F;
          pawTilt += F * 0.08 * sway;   // paws stay stretched in line with the shin (follow below)
        } else {
          const tuck = [hip[0] + (L.kind === 'fore' ? 14 : 24), hip[1] + 0.55 * (L.len1 + L.len2)];
          tx += (tuck[0] - tx) * F; ty += (tuck[1] - ty) * F;
          pawTilt += F * (L.kind === 'fore' ? 0.9 : 0.6);
        }
      }
      const bend = L.kind === 'hind' && this.motion.hindKnee === 'back' ? 1 : RIG.bend[L.kind];
      const stretched = F > 0 && !this.motion.rideCloud && this.motion.flyLegs !== 'tuck' ? F : 0;
      if (this.motion.rigidLegs) {
        // one solid leg: point it from the hip toward the foot target, and lift the whole leg
        // instead of bending a knee when the foot comes off the ground
        const rise = Math.max(0, L.home[1] - ty);
        const len = Math.hypot(L.home[0] - L.up.joint[0], L.home[1] - L.up.joint[1]);
        const a = Math.atan2(len, tx - hip[0]);
        L.up.pos = [hip[0], hip[1] - rise * 0.8];
        L.up.rot = a - Math.atan2(len, L.home[0] - L.up.joint[0]) - 0.0 + (this.bones.torso.rot);
        L.lo.pos = L.paw.pos = [tx, ty]; L.lo.rot = L.paw.rot = 0;
        continue;
      }
      solveLeg(L, hip, [tx, ty], pawTilt, bend, stretched);
    }

    // joint caps
    for (const b of Object.values(B)) {
      if (!b.cap) continue;
      const [pa, ch] = b.cap.map(n => B[n]);
      b.pos = ch.pos;
      // halfway along the shorter arc: a plain average flips by 180 degrees when the angles wrap
      b.rot = pa.rot + Math.atan2(Math.sin(ch.rot - pa.rot), Math.cos(ch.rot - pa.rot)) / 2;
    }
    for (const b of Object.values(B)) b.img.setPosition(b.pos[0], b.pos[1]).setRotation(b.rot).setScale(b.sx ?? 1, b.sy ?? 1);
    this.updateLids(dt, Z, mode);
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
