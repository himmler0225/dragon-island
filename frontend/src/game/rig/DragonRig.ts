// Dragon rig: pieces, joints, IK, walk, flight, breathing and strikes.
import { SIZE_KEY, tweaksFor, type BoneTweaks } from './tweaks';
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
  alpha?: number;
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




/** The mist a cloud-rider strides on, under each paw: width (rig px), how far below the ankle it sits (share of the
 *  paw's height), its tint (the far side's dimmer), how opaque it gets at most. */
const PAW_MIST_W = 200, PAW_MIST_DROP = 0.7, PAW_MIST_TINT = 0xffffff, PAW_MIST_FAR_TINT = 0xe4ecf8, PAW_MIST_ALPHA = 1;

/** A puffy little cloud (2026-11-20: crisp, solid puffs instead of a blurred wisp): round puffs, solid to near their
 *  edge, a cool shade along the bottom and a bright rim on top, drawn once per scene. */
function mistTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('rig_paw_mist')) return 'rig_paw_mist';
  const W = 192, H = 96, tex = scene.textures.createCanvas('rig_paw_mist', W, H)!, ctx = tex.getContext();
  const puffs = [[96, 52, 30], [62, 60, 24], [130, 60, 25], [78, 42, 20], [114, 40, 22], [38, 66, 15], [156, 66, 16], [96, 66, 26]];
  // body: solid puffs with a short soft edge
  for (const [x, y, r] of puffs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.78, 'rgba(255,255,255,0.97)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // shade: the underside a little cooler and darker, so the cloud reads as a volume
  ctx.globalCompositeOperation = 'source-atop';
  const shade = ctx.createLinearGradient(0, 30, 0, H);
  shade.addColorStop(0, 'rgba(160,185,215,0)'); shade.addColorStop(0.55, 'rgba(160,185,215,0.25)'); shade.addColorStop(1, 'rgba(120,150,190,0.55)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  tex.refresh();
  return 'rig_paw_mist';
}

const TROT: Record<LegName, number> = { hind_near: 0, fore_far: 0, fore_near: 0.5, hind_far: 0.5 };

export class DragonRig {
  readonly container: Phaser.GameObjects.Container;
  private bones: Record<string, Bone> = {};
  private legs: Leg[];
  private motion: { glowColor?: number; gait?: 'trot'; duty?: number; eye?: [number, number]; eyeColor?: number; sleepTail: [number, number, number]; wingSpread: [number, number]; rideCloud?: boolean; bodyWave?: number; flyLegs?: 'tuck' | 'dangle'; flyPitch?: number; tailWave?: number[]; hindKnee?: 'back'; swingTilt?: number; rigidLegs?: boolean; stride?: number; liftScale?: number; flyHang?: [number, number]; neck?: number; fan?: number[]; headBob?: number; float?: boolean; slither?: boolean; foreArms?: boolean; stance?: [number, number]; armPose?: [[number, number], [number, number]] };
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
  /** Hand tweaks per piece (rig/tweaks.ts): a live object the rig editor changes in place. */
  private tweaks: BoneTweaks;
  /** The whole dragon's size, set in the rig editor (x the built size; 1 = as built). */
  get size() { return this.tweaks[SIZE_KEY]?.scale ?? 1; }
  /** The pieces as drawn (rig editor): name, image, current turn (rad). */
  pieces() { return Object.values(this.bones).filter(b => !b.name.endsWith('_aura')).map(b => ({ name: b.name, img: b.img, rot: b.rot })); }
  private hurtT = 9;
  private tinted: 'none' | 'white' | 'red' = 'none';
  private whiteHit = false;

  constructor(scene: Phaser.Scene, data: RigData, parent: Phaser.GameObjects.Container, species: SpeciesId) {
    this.species = species;
    this.tweaks = tweaksFor(species);
    this.container = scene.add.container(0, 0).setScale(RIG.scale);
    parent.add(this.container);
    this.motion = { sleepTail: [0.3, 0.35, 0.3], wingSpread: [0, 0], ...data.motion } as DragonRig['motion'];
    // every dragon walks with the same gait (RIG.stride/duty/liftScale/swingTilt): drop the rig's own
    for (const k of ['gait', 'duty', 'stride', 'liftScale', 'swingTilt'] as const) delete this.motion[k];
    for (const b of data.bones) {
      const img = scene.add.image(b.joint[0], b.joint[1], rigTextureKey(species, b.name)).setOrigin(b.origin[0], b.origin[1]);
      if (b.name.endsWith('_glow')) img.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);   // a wing's golden rim
      if (b.name.endsWith('_aura')) img.setBlendMode(Phaser.BlendModes.ADD);   // a halo round a piece (body_aura)
      this.container.add(img);
      this.bones[b.name] = { name: b.name, parent: b.parent, joint: b.joint, cap: b.cap, img, offset: [0, 0], rot: 0, pos: [...b.joint] };
    }
    // body_aura: every piece's halo behind the whole dragon (only the glow round the silhouette shows), following its piece
    this.auras = Object.values(this.bones).filter(b => b.name.endsWith('_aura') && this.bones[b.name.slice(0, -5)])
      .map((aura, k) => ({ aura: aura.img, base: this.bones[aura.name.slice(0, -5)].img, phase: k * 0.7 }));
    for (const { aura } of [...this.auras].reverse()) this.container.sendToBack(aura.setVisible(false));
    // bodyWave (a slithering serpent drawn in one piece): the torso is drawn as a rope that waves from the middle of
    // the body to the tail tip; the hidden torso image still places it (and takes the clicks)
    const torso = this.bones.torso;
    if (this.motion.bodyWave && torso) {
      const n = 28, w = torso.img.width;   // points along the body, centred like the rope's own
      this.rope = scene.add.rope(0, 0, torso.img.texture.key, undefined,
        Array.from({ length: n }, (_, k) => ({ x: -w / 2 + (w * k) / (n - 1), y: 0 })), true);
      this.container.addAt(this.rope, this.container.getIndex(torso.img));
      torso.img.setVisible(false);
    }
    for (const b of Object.values(this.bones)) {
      const p = b.parent ? this.bones[b.parent] : null;
      if (p) b.offset = [b.joint[0] - p.joint[0], b.joint[1] - p.joint[1]];
    }
    const dir = (a: Bone, b: Bone) => Math.atan2(b.joint[1] - a.joint[1], b.joint[0] - a.joint[0]);
    this.eyeState.lids = this.bones.head ? makeLids(scene, this.bones.head.img, species, this.container) : [];
    // a glowing eye (motion.eye): a soft light over the pupil, lit by the strike channel `glow`
    if (this.motion.eye && this.bones.head && !data.bones.some(b => b.name === 'head_attack')) {
      if (!scene.textures.exists('rig_eye_glow')) {
        const g = scene.make.graphics({}, false);
        for (let r = 32; r > 0; r -= 2) g.fillStyle(0xffffff, 0.1 + 0.7 * (1 - r / 32) ** 2).fillCircle(32, 32, r);
        g.generateTexture('rig_eye_glow', 64, 64); g.destroy();
      }
      this.eyeGlow = scene.add.image(0, 0, 'rig_eye_glow').setTint(this.motion.eyeColor ?? 0xff5a3a)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      this.container.add(this.eyeGlow);
    }
    this.eyeState.blinkT = Phaser.Math.FloatBetween(2, 5);
    this.legs = (['fore_near', 'hind_near', 'fore_far', 'hind_far'] as LegName[]).filter(n => this.bones[`${n}_upper`]).map(name => {
      const up = this.bones[`${name}_upper`], lo = this.bones[`${name}_lower`], paw = this.bones[`${name}_paw`];
      return {
        name, kind: name.startsWith('fore') ? 'fore' : 'hind', up, lo, paw,
        len1: Math.hypot(lo.joint[0] - up.joint[0], lo.joint[1] - up.joint[1]),
        len2: Math.hypot(paw.joint[0] - lo.joint[0], paw.joint[1] - lo.joint[1]),
        rest1: dir(up, lo), rest2: dir(lo, paw),
        home: [...paw.joint] as Vec,
        // trot: the legs step in diagonal pairs (near hind with far fore), an even two-beat plod
        phase: this.motion.gait === 'trot' ? TROT[name] : RIG.phase[name],
      };
    });
    // riding clouds: a faint wisp of mist under each paw (a wide haze and a brighter core), drawn just behind it,
    // shown in flight; each breathes and drifts on its own beat
    if (this.motion.rideCloud) this.pawClouds = this.legs.map((L, k) => {
      const key = mistTexture(scene), tint = L.name.endsWith('_far') ? PAW_MIST_FAR_TINT : PAW_MIST_TINT;
      const halo = scene.add.image(0, 0, key).setTint(tint).setVisible(false);
      const img = scene.add.image(0, 0, key).setTint(tint).setVisible(false);
      this.container.addAt([halo, img], this.container.getIndex(L.paw.img));
      return { L, img, halo, phase: k * 1.9 };
    });
    const hind = this.legs.find(L => L.kind === 'hind');
    const legLen = hind ? hind.len1 + hind.len2 : 90;
    const ls = RIG.liftScale;
    this.lift = this.motion.gait === 'trot'   // a trot lifts every paw as high
      ? { fore: legLen * RIG.lift.hind * ls, hind: legLen * RIG.lift.hind * ls }
      : { fore: legLen * RIG.lift.fore * ls, hind: legLen * RIG.lift.hind * ls };
  }

  /** rig px a planted foot travels per walk cycle: the same distance on screen for every dragon, whatever its size */
  private get stride() { return RIG.stride * this.strideScale / this.size; }
  private strideScale = 1;
  /** Longer (> 1) or shorter steps than the common stride (the battle field walks with longer ones). */
  setStrideScale(k: number) { this.strideScale = k; }
  private lift: { fore: number; hind: number };

  /** Eyelids: a skin-coloured lid drawn over each eye, growing down from the top of the eye. */
  private eyeState = { lids: [] as ReturnType<typeof import("./eyelids").makeLids>, blinkT: 0 };
  /** Ground speed (screen px/s at root scale 1) that matches the feet, so they never slide. */
  walkSpeed(rootScale: number) {
    // a trot: a planted paw pushes the stride back in `duty` of the cycle, so the body must cover it as fast
    // (otherwise the paws slide on the ground and the steps look long, short, long)
    const duty = this.motion.gait === 'trot' ? RIG.duty : 1;
    return this.stride * RIG.scale * this.size * rootScale / (RIG.cycle * duty);
  }

  private rope: Phaser.GameObjects.Rope | null = null;
  private wavePhase = 0;
  /** body_aura glows only in battle (BattleScene turns it on): off on the island and in the rig editor. */
  auraOn = false;
  private auras: { aura: Phaser.GameObjects.Image; base: Phaser.GameObjects.Image; phase: number }[] = [];
  private pawClouds: { L: Leg; img: Phaser.GameObjects.Image; halo: Phaser.GameObjects.Image; phase: number }[] = [];
  private eyeGlow: Phaser.GameObjects.Image | null = null;
  private shed = new Set<string>();

  /** A few golden sparks falling off a wing (on the battlefield and the islands: both have the 'spark' texture). */
  private motes(img: Phaser.GameObjects.Image) {
    const scene = img.scene;
    if (!scene.textures.exists('spark')) return;
    const m = img.getWorldTransformMatrix();
    for (let k = 0; k < 7; k++) {
      const p = m.transformPoint((Math.random() - img.originX) * img.width, (Math.random() - img.originY) * img.height);
      const s = scene.add.image(p.x, p.y, 'spark').setTint(this.motion.glowColor ?? (k % 2 ? 0xffe27a : 0xffb030)).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4100).setScale(Phaser.Math.FloatBetween(0.8, 1.6));
      scene.tweens.add({ targets: s, y: p.y + Phaser.Math.Between(40, 110), x: p.x + Phaser.Math.Between(-25, 25), alpha: 0, scale: 0.2,
        duration: Phaser.Math.Between(450, 800), ease: 'Sine.easeIn', onComplete: () => s.destroy() });
    }
  }

  destroy() { this.container.destroy(); }

  /** Draw the pieces with their hand tweaks (rig editor), like a jigsaw: a piece's tweak (shifted in its own frame,
   *  turned and scaled about its joint) carries everything hanging from it - a thigh takes its shin and paw along,
   *  the torso its head, wings and tail (not the legs: they stay on the ground); a joint cap goes with its piece. */
  private drawTweaked() {
    type Aff = [number, number, number, number, number, number];   // x' = a x + c y + e, y' = b x + d y + f
    const I: Aff = [1, 0, 0, 1, 0, 0];
    const apply = (m: Aff, x: number, y: number): Vec => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    const mul = (m: Aff, n: Aff): Aff => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3],
      m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
    // a leg is not carried by the torso: it stands on the ground (moving the body lifts it off its legs)
    const holder = (b: Bone) => b.name.endsWith('_upper') && this.legs.some(L => L.up === b) ? null
      : b.parent ?? (b.name.startsWith('cap_') && this.bones[b.name.slice(4)] ? b.name.slice(4) : null);
    const own = (b: Bone): Aff => {   // the piece's own tweak, as a move of the points that hang from it
      const tw = this.tweaks[b.name];
      if (!tw) return I;
      const c = Math.cos(b.rot), s = Math.sin(b.rot), Dx = tw.dx * c - tw.dy * s, Dy = tw.dx * s + tw.dy * c;
      const k = tw.scale, a = k * Math.cos(tw.rot), bb = k * Math.sin(tw.rot), [Px, Py] = b.pos;
      return [a, bb, -bb, a, Px + Dx - (a * Px - bb * Py), Py + Dy - (bb * Px + a * Py)];
    };
    const carried = new Map<string, Aff>();   // what a bone's pieces are moved by: its ancestors' tweaks and its own
    const chain = (name: string): Aff => {
      const hit = carried.get(name);
      if (hit) return hit;
      const b = this.bones[name], up = holder(b);
      const m = mul(up ? chain(up) : I, own(b));
      carried.set(name, m);
      return m;
    };
    // was a piece, or one it hangs from, moved by hand? (a joint cap is cut from the two pieces as built: once either
    // moves it would drag a patch of the other along, so it is hidden)
    const moved = (name: string | null): boolean => !!name && (!!this.tweaks[name] || moved(holder(this.bones[name])));
    for (const b of Object.values(this.bones)) {
      if (b.cap) {   // a cap sits between the two pieces it was cut from
        const off = b.cap.some(n => moved(n));
        b.img.setVisible(!off);
        if (off) continue;
      }
      const up = holder(b), A = up ? chain(up) : I, tw = this.tweaks[b.name];
      const c = Math.cos(b.rot), s = Math.sin(b.rot);
      const [x, y] = apply(A, b.pos[0] + (tw ? tw.dx * c - tw.dy * s : 0), b.pos[1] + (tw ? tw.dx * s + tw.dy * c : 0));
      const turn = Math.atan2(A[1], A[0]), k = Math.hypot(A[0], A[1]) * (tw?.scale ?? 1);
      b.img.setPosition(x, y).setRotation(b.rot + (tw?.rot ?? 0) + turn).setScale((b.sx ?? 1) * k, (b.sy ?? 1) * k).setFlipX(!!tw?.flipX);
    }
  }

  /** Play this species' attack pose; returns it (duration, hit time). */
  strike(kind: StrikeKind) {
    const keys = STRIKES[this.species][kind];
    const strike: Strike = { ...keys, dur: keys.dur * RIG.strike.tempo };
    this.act = { strike, t: 0 };
    this.blendFrom = { A: { ...this.lastA }, t: 0 };
    return strike;
  }

  get striking() { return this.act !== null; }

  private steps: string[] = [];
  /** The legs whose paw came down since the last call (footprints, dust). */
  takeSteps() { return this.steps.splice(0); }

  /** Front-paw stomps so far (goes up by one on each landing): callers puff dust when it changes. */
  stomps = 0;
  private stompArmed = new Set<string>();

  /** Flinch: knocked back a little and flash red. */
  /** `white`: a solid white hit-flash first (battle), then the red one. */
  hurt(white = false) { this.hurtT = 0; this.whiteHit = white; }

  /** Walk cycles per second x this; set by the caller so every species covers ground at one speed. */
  gaitRate = 1;

  update(dt: number, mode: string) {
    this.t += dt;
    const towards = (v: number, target: number, rate = RIG.blendRate) =>
      v + Math.sign(target - v) * Math.min(Math.abs(target - v), dt * rate);
    this.walk = towards(this.walk, mode === 'walk' ? 1 : 0);
    this.fly = towards(this.fly, mode === 'fly' ? 1 : 0);
    this.sleep = towards(this.sleep, mode === 'sleep' ? 1 : 0, RIG.sleepRate);
    if (this.walk > 0 || (this.motion.rideCloud && (this.fly > 0 || this.lastA.flap > 0))) {   // riding clouds: it strides in the air too
      const prev = this.gait;
      this.gait = (this.gait + dt * this.gaitRate / RIG.cycle) % 1;
      // a paw comes down when its phase wraps round
      if (this.walk > 0.5) for (const L of this.legs) if ((this.gait - L.phase + 1) % 1 < (prev - L.phase + 1) % 1) this.steps.push(L.name);
    }

    // attack pose channels (all 0 when not striking)
    const A: Record<string, number> = { lunge: 0, rear: 0, lift: 0, head: 0, jaw: 0, wings: 0, claw: 0, flap: 0, air: 0, spread: 0, stretch: 0, breath: 0, stompL: 0, stompR: 0, fan: 0, palms: 0, guns: 0, glow: 0 };
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
        if (b.name.endsWith('_aura')) continue;   // a halo keeps its colour
        if (b.img === this.bones.torso?.img && this.rope) {   // the waving body flashes too
          this.rope.tintFill = flash === 'white';
          this.rope.setColors(flash === 'none' ? 0xffffff : flash === 'white' ? 0xffffff : 0xff7a7a);
        }
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
    this.container.setScale(RIG.scale * this.size);
    // a second head drawn for strikes (head_attack, e.g. Rồng Rùa's glowing eyes): shown instead of the head while
    // the strike channel `glow` is up
    const alt = this.bones.head_attack, head = this.bones.head;
    if (alt && head) {
      alt.pos = [...head.pos]; alt.rot = head.rot; alt.sx = head.sx; alt.sy = head.sy;
      // one head at a time, never both (the two drawings differ a little: faded over each other they read as two
      // heads): the lit one as soon as the eyes light up
      const lit = A.glow > 0.3;
      alt.img.setAlpha(1).setVisible(lit);
      head.img.setVisible(!lit);
    }   // the whole dragon's size (rig editor: tweak SIZE_KEY)
    if (!Object.keys(this.tweaks).length) {
      for (const b of Object.values(this.bones)) {
        b.img.setPosition(b.pos[0], b.pos[1]).setRotation(b.rot).setScale(b.sx ?? 1, b.sy ?? 1);
        if (b.cap) b.img.setVisible(true);   // (back after the editor's tweaks are cleared)
      }
    } else this.drawTweaked();
    if (this.rope) this.waveBody(dt);
    for (const { aura, base, phase } of this.auras) {   // each halo on its piece as drawn, breathing slowly
      aura.setPosition(base.x, base.y).setRotation(base.rotation).setScale(base.scaleX, base.scaleY).setFlipX(base.flipX)
        .setVisible(base.visible && this.auraOn).setAlpha(0.6 + 0.25 * Math.sin(this.t * 1.5 + phase));
    }
    for (const { L, img, halo, phase } of this.pawClouds) {
      const paw = L.paw.img, on = this.fly > 0.01, breathe = 0.5 + 0.5 * Math.sin(this.t * 1.6 + phase);
      const x = paw.x + (0.5 - paw.originX) * paw.width + 6 * Math.sin(this.t * 0.9 + phase);
      const y = paw.y + (1 - paw.originY) * paw.height * PAW_MIST_DROP, s = (PAW_MIST_W / img.width) * (0.7 + 0.3 * this.fly);
      img.setPosition(x, y).setVisible(on).setAlpha(this.fly * PAW_MIST_ALPHA * (0.9 + 0.1 * breathe))
        .setScale(s * (0.92 + 0.12 * breathe), s * (0.7 + 0.08 * breathe));
      // the haze round it kept faint: it blurred the cloud's outline
      halo.setPosition(x - 4, y + 6).setVisible(on).setAlpha(this.fly * PAW_MIST_ALPHA * (0.18 + 0.08 * (1 - breathe)))
        .setScale(s * 1.45, s * 1.0);
    }
    for (const b of Object.values(this.bones)) {
      if (b.alpha === undefined) continue;
      b.img.setAlpha(b.alpha);
      // a wing's downstroke sheds golden motes of light
      if (b.alpha > 0.85 && !this.shed.has(b.name)) { this.shed.add(b.name); this.motes(b.img); }
      else if (b.alpha < 0.6) this.shed.delete(b.name);
    }
    this.eyeState.blinkT = updateLids(this.eyeState.lids, this.bones.head.img, this.eyeState.blinkT, dt, Z, mode);
    if (this.eyeGlow) {   // follows the eye on the head image; flickers a little while lit
      const head = this.bones.head.img, [fx, fy] = this.motion.eye!;
      const p = head.getLocalTransformMatrix().transformPoint((fx - head.originX) * head.width, (fy - head.originY) * head.height);
      const a = Math.min(1, Math.max(0, A.glow));
      this.eyeGlow.setPosition(p.x, p.y).setAlpha(a).setScale((1.5 + 0.3 * Math.sin(this.t * 22)) * (0.6 + 0.4 * a));
    }
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

  /** World position of a point on a bone's image, given as a share of its width/height. */
  boneWorld(name: string, fx: number, fy: number) {
    const img = this.bones[name].img;
    return img.getWorldTransformMatrix().transformPoint((fx - img.originX) * img.width, (fy - img.originY) * img.height);
  }

  /** The eye (motion.eye: its place on the head image; a guess without it), for glowing-eye effects. */
  eyeWorld() { const [fx, fy] = this.motion.eye ?? [0.35, 0.4]; return this.onHead(fx, fy); }

  /** Just above the head (for the sleeping "z"). */
  headWorld() { return this.onHead(0.3, 0.05); }

  /** bodyWave: lay the rope over the (hidden) torso image and ripple it: a travelling wave, still at the front (head,
   *  wings and leaf feet stay on the body there) and growing to the tail tip; strong while it slithers, a slow
   *  breathing ripple at rest. */
  private waveBody(dt: number) {
    const rope = this.rope!, img = this.bones.torso.img, w = img.width, h = img.height;
    const c = Math.cos(img.rotation), s = Math.sin(img.rotation);
    const lx = img.scaleX * (0.5 - img.originX) * w * (img.flipX ? -1 : 1), ly = img.scaleY * (0.5 - img.originY) * h;
    rope.setPosition(img.x + lx * c - ly * s, img.y + lx * s + ly * c).setRotation(img.rotation)
      .setScale(img.scaleX, img.scaleY).setFlipX(img.flipX);
    rope.flipX = img.flipX;
    const W = this.walk;
    this.wavePhase += dt * (1.2 + 3.2 * W);
    const amp = (0.025 + 0.06 * W) * h * (this.motion.bodyWave ?? 1);
    const pts = rope.points, n = pts.length;
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1), env = Math.min(1, Math.max(0, (t - 0.35) / 0.65)) ** 1.5;
      pts[k].y = amp * env * Math.sin(2 * Math.PI * 1.3 * t - this.wavePhase);
    }
    rope.setDirty();
  }

  /** Pixel-accurate hit test in world coordinates. */
  hit(x: number, y: number, scene: Phaser.Scene) {
    if (!this.container.visible) return false;
    return Object.values(this.bones).some(({ name, img }) => {
      if (name.endsWith('_glow') || name.endsWith('_aura')) return false;
      const pt = img.getLocalPoint(x, y);
      if (pt.x < 0 || pt.y < 0 || pt.x >= img.width || pt.y >= img.height) return false;
      return alphaAt(scene, img.texture.key, Math.floor(pt.x), Math.floor(pt.y)) > 60;
    });
  }
}
