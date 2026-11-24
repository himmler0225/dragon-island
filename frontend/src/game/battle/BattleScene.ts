// Battle scene.
import * as Phaser from 'phaser';
import type { SpeciesId } from '../config/species';
import { ALL_SPECIES, SPECIES_INFO, isBoss, rigUrl } from '../config/species';
import { JAW_SPECIES, NO_VFX, SKILLS, jawKey, jawUrl, vfxKey, vfxNumbers, vfxUrl } from '../skills/registry';
import type { SkillActor, SkillCtx, SkillSlot } from '../skills/types';
import { CombatFx } from '../scene/effects/combatFx';
import { makeFxTextures } from '../scene/effects/ambientFx';
import { StatusFx, loadStatusTextures } from '../scene/effects/statusFx';
import { skill } from '../skills/registry';
import { statusFromText } from '../skills/status';
import { STATUS } from '../skills/status';
import { DragonRig, type RigData } from '../rig';
import {
  ALLY_START, ALLY_STATUE, ANIM, COOLDOWN, CRIT, DIM_S, ENEMY_START, ENEMY_STATUE, FIELD_H, FIELD_W,
  FLYERS, HIGH, HUE, KNOCK_DECAY, LANES, REACH, MARCH_EASE, MARCH_SPEED, MARCH_STRIDE, MAX_TARGETS, PRIORITY, ROW_REACH, rowOf, SCALE, SPLASH, STATS,
  STATUE_GAP, STATUE_H, STATUE_Y, TEAM_CELLS,
} from './constants';
import type { BattleEvents, Side } from './types';
import type { Unit } from './units';
import { CombatScene } from './combat';
import { iceCage } from '../skills/frostDragon';
import { bloom } from '../skills/rosebudDragon';
import { drift } from '../skills/snowflightDragon';
import { rage } from '../skills/blackDragon';
import { applyRigMasks, loadTweaks } from '../rig/tweaks';

const MUSIC_KEY = 'battle_music', MUSIC_VOLUME = 0.45;

/** A pill-shaped health bar over a dragon (2026-11-20): a dark rounded frame with a faint light rim, the health
 *  in the side's colour with a glossy band on top, ticks every quarter, and the part just lost (`lag`) in pale gold
 *  draining after it. */
function unitBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, frac: number, lag: number, ally: boolean) {
  const pill = (px: number, pw: number, ph = h, py = y) => { if (pw > 0.5) g.fillRoundedRect(px, py, pw, ph, Math.min(ph / 2, pw / 2)); };
  g.fillStyle(0x0b0e18, 0.88); pill(x - 3, w + 6, h + 6, y - 3);
  g.lineStyle(1.5, 0xffffff, 0.3).strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2);
  g.fillStyle(0x262b38, 1); pill(x, w);
  if (lag > frac) { g.fillStyle(0xffe9a8, 0.9); pill(x, w * lag); }
  const low = frac < 0.3;
  const [main, light] = ally ? (low ? [0xf2b733, 0xffe38a] : [0x2fcf5a, 0x9dffb0]) : (low ? [0xff5a2a, 0xffb08a] : [0xe2332e, 0xff9a8c]);
  g.fillStyle(main, 1); pill(x, w * frac);
  g.fillStyle(light, 0.55); pill(x + 2, w * frac - 4, h * 0.38, y + 1);
  g.fillStyle(0x0b0e18, 0.55);
  for (let k = 1; k < 4; k++) g.fillRect(x + (w * k) / 4 - 0.5, y + 1, 1, h - 2);
}

/** Seconds between Băng Lộc Long's ice cages (about 3 turns). */
const CAGE_EVERY = 9;
/** Rồng Nụ Tầm Xuân's passive: seconds between its healing blooms (8% of its max HP each). */
const BLOOM_EVERY = 10;
/** Rồng Phi Tuyết's passive: seconds between its snow-wing shimmers. */
const DRIFT_EVERY = 12;

class BattleScene extends Phaser.Scene {
  private units: Unit[] = [];
  private combat!: CombatFx;
  private status!: StatusFx;
  private combatH!: CombatScene;
  private lane = { ally: 0, enemy: 0 };
  private bg!: Phaser.GameObjects.Image;
  private cx = FIELD_W / 2;
  private hpBars: Partial<Record<Side, { g: Phaser.GameObjects.Graphics; x: number; y: number; w: number; h: number }>> = {};
  private hp: Record<Side, number> = { ally: 1, enemy: 1 };
  private statues: Partial<Record<Side, Phaser.GameObjects.Image>> = {};
  /** A statue has fallen: the fight is over, every dragon stands down. */
  private over = false;
  private dimT = 0;
  private dim!: Phaser.GameObjects.Rectangle;
  constructor(private rigs: Record<SpeciesId, RigData>, private events_: BattleEvents) { super('battle'); }

  preload() {
    loadStatusTextures(this.load);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => this.events_.progress?.(p));
    this.load.image('battle_bg', '/battle/background.jpg');
    this.load.audio(MUSIC_KEY, '/audio/battle.mp3');   // cut from dragon-island-tools/assets/audio/battle_source.mp4
    for (const k of ['tower_ally', 'tower_enemy', 'tower_ground', 'hp_frame']) this.load.image(k, `/battle/${k}.png`);
    // a statue breaking (tools/slice_tower_break.py): 8 frames, 4x2 - a rubble pile cracks, bursts, flies apart, settles in dust
    this.load.spritesheet('tower_break', '/battle/tower_break.png', { frameWidth: 384, frameHeight: 512 });
    for (const id of ALL_SPECIES) {
      for (const b of this.rigs[id].bones) this.load.image(`rig_${id}_${b.name}`, `/dragons/${id}/${b.name}.png`);
      if (SKILLS[id].length && !NO_VFX.includes(id)) for (const n of vfxNumbers(id)) this.load.image(vfxKey(id, n), vfxUrl(id, n));
      if (JAW_SPECIES.includes(id)) for (const part of ['upper', 'lower'] as const) this.load.image(jawKey(id, part), jawUrl(id, part));
    }
  }

  create() {
    for (const id of ALL_SPECIES) applyRigMasks(this, id);   // the rig editor's erasing, before the dragons are built
    makeFxTextures(this);
    // battle music: loops for the whole fight (Phaser starts it once the browser allows audio)
    const music = this.sound.add(MUSIC_KEY, { loop: true, volume: MUSIC_VOLUME });
    music.play();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => music.destroy());
    this.bg = this.add.image(0, 0, 'battle_bg').setOrigin(0, 1).setDepth(-10);
    for (const side of ['ally', 'enemy'] as const) {
      const x = side === 'ally' ? ALLY_STATUE : ENEMY_STATUE;
      const img = this.add.image(x, STATUE_Y, `tower_${side}`).setOrigin(0.5, 0.97);
      img.setScale(STATUE_H / img.height).setDepth(5 + STATUE_Y / 1000);
      this.statues[side] = img;
      this.statueGround(x, STATUE_Y, img.displayWidth * 0.5);
      const top = STATUE_Y - STATUE_H - 30;
      const frame = this.add.image(x, top, 'hp_frame').setDepth(4000);
      frame.setScale(250 / frame.width);
      this.hpBars[side] = { g: this.add.graphics().setDepth(4001), x, y: top, w: 250 * 0.8, h: frame.displayHeight * 0.34 };
    }
    this.drawHp();
    this.dim = this.add.rectangle(-200, -200, FIELD_W + 400, FIELD_H + 400, 0x05040c, 0).setOrigin(0, 0).setDepth(-5);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.look(this.cx - (p.x - p.prevPosition.x) / this.cameras.main.zoom);
    });
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_: Phaser.Input.Pointer, __: unknown, dx: number, dy: number) =>
      this.look(this.cx + (Math.abs(dx) > Math.abs(dy) ? dx : dy)));
    this.combat = new CombatFx(this);
    this.combat.intensity = 0.95;
    this.combat.budget = 12;
    this.combat.size = 1.3;   // big, showy skill effects
    this.combat.blend = Phaser.BlendModes.SCREEN;
    this.status = new StatusFx(this, this.combat);
    this.combatH = new CombatScene(this);
    this.fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fit());
  }

  /** Where a statue stands: the ground broken by its weight (tower_ground: its bare middle under the statue's base,
   *  mirrored on one side so the two differ) and a soft contact shadow, so it sits in the ground, not on it. */
  private statueGround(x: number, y: number, r: number) {
    const d = this.add.image(x, y - 8, 'tower_ground').setDepth(-6.1).setOrigin(0.5, 0.49).setFlipX(x > FIELD_W / 2);
    d.setScale((r * 2 * 1.05) / (d.width * 0.53));   // that middle is about 53% of its width
    const g = this.add.graphics().setDepth(-6);   // over the field, under the dimming and everything on it
    for (let k = 0; k < 10; k++) g.fillStyle(0x24140a, 0.07).fillEllipse(x, y - 8, r * 2.5 * (1 - k * 0.06), r * 0.8 * (1 - k * 0.06));
  }

  private fit() {
    this.cameras.main.setZoom(this.scale.height / FIELD_H);
    this.look(this.cx);
  }

  look(cx: number) {
    const cam = this.cameras.main, viewW = this.scale.width / cam.zoom;
    this.cx = viewW >= FIELD_W ? FIELD_W / 2 : Phaser.Math.Clamp(cx, viewW / 2, FIELD_W - viewW / 2);
    cam.centerOn(this.cx, FIELD_H / 2);
    const bw = this.bg.width, bh = this.bg.height;
    const k = Math.max(FIELD_H / bh, (viewW * 1.25) / bw);
    this.bg.setScale(k);
    const t = viewW >= FIELD_W ? 0.5 : (this.cx - viewW / 2) / (FIELD_W - viewW);
    this.bg.setPosition(this.cx - viewW / 2 - t * (bw * k - viewW), FIELD_H + (bh * k - FIELD_H) * 0.3);
    this.events_.view?.(Math.max(0, this.cx / FIELD_W - viewW / (2 * FIELD_W)), Math.min(1, this.cx / FIELD_W + viewW / (2 * FIELD_W)));
  }

  setHp(ally: number, enemy: number) {
    this.hp = { ally, enemy };
    this.drawHp();
    if (this.over) return;
    const fallen = (['ally', 'enemy'] as const).find(side => this.hp[side] <= 0);
    if (fallen) { this.over = true; this.breakStatue(fallen); }
  }

  /** A statue at 0 HP breaks: it shakes and cracks with light, then collapses into the ground: the drawn burst
   *  (tower_break) plays over its base, rubble flying and dust rolling out; the rubble stays a while. */
  private breakStatue(side: Side) {
    const img = this.statues[side];
    if (!img) return;
    const x = img.x, base = img.y, h = img.displayHeight, w = img.displayWidth, d = img.depth;
    const glow = side === 'ally' ? 0x8fd8ff : 0xff7a4a;
    // 1. it trembles, cracks of light running up it
    this.tweens.add({ targets: img, x: { from: x - 6, to: x + 6 }, duration: 45, yoyo: true, repeat: 9, onComplete: () => img.setX(x) });
    for (let k = 0; k < 6; k++) {
      const cy = base - h * Phaser.Math.FloatBetween(0.15, 0.85), cx = x + Phaser.Math.Between(-w * 0.22, w * 0.22);
      const crack = this.add.rectangle(cx, cy, 5, Phaser.Math.Between(40, 90), glow, 1).setAngle(Phaser.Math.Between(-35, 35))
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 0.01).setScale(1, 0).setAlpha(0.95);
      this.tweens.add({ targets: crack, scaleY: 1, delay: k * 90, duration: 160, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: crack, alpha: 0, delay: 950, duration: 250, onComplete: () => crack.destroy() });
    }
    const flare = this.add.image(x, base - h * 0.5, 'glow').setTint(glow).setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 0.02).setAlpha(0).setScale(3);
    this.tweens.add({ targets: flare, alpha: 0.9, scale: 9, delay: 700, duration: 300, yoyo: true, onComplete: () => flare.destroy() });
    // 2. it breaks: sinks and crumbles away, chunks fly out and fall, dust rolls out at its foot
    this.time.delayedCall(950, () => {
      this.cameras.main.shake(380, 0.006);
      this.hpBars[side]?.g.setAlpha(0.35);
      this.tweens.add({ targets: img, y: base + h * 0.35, angle: side === 'ally' ? -6 : 6, alpha: 0, duration: 900, ease: 'Quad.easeIn' });
      // the drawn burst: the pile bursting with light, rocks flying, settling in dust (frames 2..7), over the statue's base
      if (!this.anims.exists('tower_break')) this.anims.create({ key: 'tower_break', frames: this.anims.generateFrameNumbers('tower_break', { start: 2, end: 7 }), frameRate: 9 });
      const burst = this.add.sprite(x, base + 12, 'tower_break', 2).setOrigin(0.5, 0.86).setDepth(d + 0.03).setScale((w * 1.7) / 384);
      burst.play('tower_break');
      burst.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
        this.tweens.add({ targets: burst, alpha: 0, delay: 1400, duration: 900, onComplete: () => burst.destroy() }));
      for (let k = 0; k < 8; k++) {
        const p = this.add.image(x + Phaser.Math.Between(-w * 0.4, w * 0.4), base - Phaser.Math.Between(0, 60), 'puff')
          .setTint(0xcbb89a).setAlpha(0.75).setScale(Phaser.Math.FloatBetween(4, 7)).setDepth(d + 0.04);
        this.tweens.add({ targets: p, x: p.x + (p.x - x) * 1.5, y: p.y - Phaser.Math.Between(40, 140), scale: p.scale * 2.4, alpha: 0,
          delay: k * 25, duration: Phaser.Math.Between(1100, 1700), ease: 'Sine.easeOut', onComplete: () => p.destroy() });
      }
    });
  }

  private drawHp() {
    for (const side of ['ally', 'enemy'] as const) {
      const b = this.hpBars[side];
      if (!b) continue;
      const w = b.w * Phaser.Math.Clamp(this.hp[side], 0, 1);
      const [top, mid, bot] = side === 'ally' ? [0x8ff07a, 0x31c84a, 0x1d8a33] : [0xff8a78, 0xe0362c, 0xa3171a];
      b.g.clear().fillGradientStyle(top, top, mid, mid, 1).fillRect(b.x - b.w / 2, b.y - b.h / 2, w, b.h / 2)
        .fillGradientStyle(mid, mid, bot, bot, 1).fillRect(b.x - b.w / 2, b.y, w, b.h / 2);
      // cut into TEAM_CELLS cells by thin dark gaps
      b.g.fillStyle(0x1a0c04, 0.85);
      for (let k = 1; k < TEAM_CELLS; k++) b.g.fillRect(b.x - b.w / 2 + (b.w * k) / TEAM_CELLS - 1, b.y - b.h / 2, 2, b.h);
    }
  }

  spawn(id: SpeciesId, side: Side) {
    if (this.over) return;   // the fight is over: no one else takes the field
    const y = LANES[this.lane[side]++ % LANES.length] + Phaser.Math.Between(-18, 18);
    const fly = FLYERS.includes(id);
    const [r0, r1] = REACH[id] ?? ROW_REACH[rowOf(id)];
    const root = this.add.container(side === 'ally' ? ALLY_START : ENEMY_START, y);
    const shadow = this.add.ellipse(0, 0, 180, 34, 0x2a1a08, 0).setVisible(false);   // no ring under the dragons
    const body = this.add.container(0, 0);
    root.add([shadow, body]);
    const rig = new DragonRig(this, this.rigs[id], body, id);
    rig.setStrideScale(MARCH_STRIDE);
    rig.auraOn = true;   // the full-body glow (Hắc Long, Thần Long, Bất Tử Điểu) only lights up in battle
    const cloud = !!this.rigs[id].motion?.rideCloud;
    root.setScale(side === 'ally' ? -SCALE : SCALE, SCALE).setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 160 });
    const hp = STATS[SPECIES_INFO[id].rarity] ?? 1500;
    const bar = this.add.graphics();
    const unit: Unit = {
      root, body, shadow, bar, cloud, rig, side, y, fly, id, t: Math.random() * 9,
      hp, maxHp: hp, dead: false, engaged: false, shove: 0, hop: 0, skidT: 0, go: 0, stop: 0, kick: 0, pops: [], ult: 0,
      alt: fly ? HIGH[id] ?? 150 : 0, anim: 1, drop: 1, reach: Phaser.Math.Between(r0, r1), busy: 0.2,
      cd: { basic: 0, skill: Phaser.Math.FloatBetween(1, COOLDOWN.skill), ultimate: Phaser.Math.FloatBetween(3, COOLDOWN.ultimate + 2) },
    };
    this.units.push(unit);
    this.combatH.summon(unit);
  }

  /** Stomps already puffed, per unit (DragonRig.stomps goes up by one per front-paw landing). */
  private stompSeen = new WeakMap<Unit, number>();
  /** Băng Lộc Long's passive: seconds until its next glass ice cage (the first as soon as it meets a foe). */
  private cageT = new WeakMap<Unit, number>();
  /** Rồng Nụ Tầm Xuân's passive: seconds until its next bloom (the first BLOOM_EVERY s after it meets a foe). */
  private bloomT = new WeakMap<Unit, number>();
  /** Rồng Phi Tuyết's passive: seconds until its next shimmer (the first soon after it meets a foe). */
  private driftT = new WeakMap<Unit, number>();
  /** Hắc Long's passive (Cuồng Nộ): flared once, the first time it drops under half its HP. */
  private raged = new WeakSet<Unit>();

  /** A paw came down on the march: a footprint that fades in the dirt and a puff of dust kicked up behind it. */
  private step(u: Unit, leg: string) {
    const far = leg.endsWith('_far');
    const p = u.rig.boneWorld(`${leg}_paw`, 0.5, 0.5);
    const y = u.y + (far ? -10 : 4), back = u.side === 'ally' ? -1 : 1;
    const print = this.add.ellipse(p.x, y, 34 * SCALE, 11 * SCALE, 0x3a2412, far ? 0.16 : 0.26).setDepth(-5.5);
    this.tweens.add({ targets: print, alpha: 0, delay: 500, duration: 1300, onComplete: () => print.destroy() });
    for (let k = 0; k < (far ? 2 : 3); k++) {
      const d = this.add.image(p.x, y - 4, 'puff').setTint(0xd9c39a).setAlpha(far ? 0.28 : 0.42).setDepth(u.root.depth - 0.01)
        .setScale(Phaser.Math.FloatBetween(0.45, 0.8));
      this.tweens.add({ targets: d, x: d.x + back * Phaser.Math.Between(14, 44), y: d.y - Phaser.Math.Between(6, 22), alpha: 0, scale: d.scale * 2,
        duration: Phaser.Math.Between(420, 680), ease: 'Sine.easeOut', onComplete: () => d.destroy() });
    }
  }

  /** A front paw landed: a little burst of cloud (or dust) out from under the front feet. */
  private stompPuff(u: Unit, alt: number) {
    const dir = u.side === 'ally' ? 1 : -1, x = u.root.x + dir * 70 * SCALE, y = u.y - alt + 6;
    for (let k = 0; k < 6; k++) {
      const a = Math.PI * (k / 5), r = Phaser.Math.Between(40, 80);
      const p = this.add.image(x, y, 'puff').setTint(u.cloud ? 0xf4f6ff : 0xd9c39a).setAlpha(0.8).setDepth(u.root.depth + 0.01)
        .setScale(Phaser.Math.FloatBetween(1, 1.6));
      this.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: y - Math.sin(a) * r * 0.3, alpha: 0, scale: p.scale * 1.8,
        duration: Phaser.Math.Between(350, 520), ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
  }

  private head(u: Unit) { return u.y - u.alt - 150 * SCALE; }

  private actor(u: Unit, by?: Unit): SkillActor & { mouth(): import('../skills/types').Spot; eye(): import('../skills/types').Spot; point(bone: string, fx: number, fy: number): import('../skills/types').Spot; facing: 1 | -1 } {
    const lift = () => (u.dead ? 0 : -u.body.y * SCALE);
    return {
      id: u.id,
      feet: () => ({ x: u.root.x, y: u.y }),
      chest: () => ({ x: u.root.x, y: u.y - lift() - 60 * SCALE }),
      head: () => (u.dead ? { x: u.root.x, y: this.head(u) } : (({ x, y }) => ({ x, y: y - 10 }))(u.rig.headWorld())),
      mouth: () => (u.dead ? { x: u.root.x, y: this.head(u) } : u.rig.mouthWorld()),
      eye: () => (u.dead ? { x: u.root.x, y: this.head(u) } : u.rig.eyeWorld()),
      point: (bone, fx, fy) => (u.dead ? { x: u.root.x, y: this.head(u) } : u.rig.boneWorld(bone, fx, fy)),
      get facing() { return (u.side === 'ally' ? 1 : -1) as 1 | -1; },
      hurt: () => {},
      push: dx => this.knockBack(u, dx),
      text: (text, color) => {
        if (u.dead) return;
        const n = /^-(\d+)$/.exec(text);
        if (n) {
          const crit = !!by && Math.random() < CRIT;
          const dmg = Number(n[1]) * (crit ? 2 : 1);
          u.hp -= dmg;
          const now = this.time.now;
          u.pops = u.pops.filter(t => now - t < 450);
          const headY = this.head(u) - 10;
          this.combatH.pop(u, by, crit, dmg, headY);
          this.combatH.impact(u, by, crit);
          if (u.hp <= 0) this.combatH.kill(u);
        } else {
          const hy = this.head(u) - 30;
          const t = this.add.text(u.root.x, hy, text, { fontFamily: 'system-ui, sans-serif', fontStyle: '900', fontSize: '18px', color, stroke: '#1a0d00', strokeThickness: 4, resolution: 2 }).setOrigin(0.5).setDepth(5000).setScale(1.3);
          this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
          this.tweens.add({ targets: t, y: hy - 70, alpha: 0, delay: 380, duration: 700, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
        }
        const kind = by && !u.dead ? statusFromText(by.id, text) : null;
        if (kind) this.status.apply(u, this.actor(u), kind, STATUS[kind].tick ? () => this.combatH.inflict(u, kind, this.head(u)) : undefined);
      },
    };
  }

  /** Thrown back `dx` field px (a boss barely): it slides, hops and rears up, with a burst at the hit and dust under
   *  the slide; it can't act until it has landed. */
  private knockBack(u: Unit, dx: number) {
    if (u.dead) return;
    const d = isBoss(u.id) ? dx * 0.25 : dx;
    u.shove += d * KNOCK_DECAY;
    u.stop = Math.max(u.stop, 0.4);
    const k = Math.min(1.4, Math.abs(d) / 100), lean = 0.26 * k;
    this.tweens.add({ targets: u, hop: 34 * k, duration: 150, yoyo: true, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: u.body, rotation: lean, duration: 130, yoyo: true, hold: 120, ease: 'Sine.easeOut' });
    // the blow: speed lines flying the way it is thrown, a ring round the hit
    const x = u.root.x, y = u.y - u.alt - 60 * SCALE, dir = Math.sign(d) || 1;
    const ring = this.add.circle(x, y, 24).setStrokeStyle(5, 0xffffff, 0.9).setDepth(21).setScale(0.4);
    this.tweens.add({ targets: ring, scale: 3 * k + 1, alpha: 0, duration: 340, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < 7; i++) {
      const py = y + Phaser.Math.Between(-70, 70);
      const line = this.add.rectangle(x - dir * 50, py, Phaser.Math.Between(50, 110), 4, 0xffffff, 0.85).setDepth(21);
      this.tweens.add({ targets: line, x: x + dir * Phaser.Math.Between(90, 190), scaleX: 0.2, alpha: 0, delay: i * 12, duration: 280, ease: 'Cubic.easeOut', onComplete: () => line.destroy() });
    }
  }

  private statue(side: Side): SkillActor {
    const x = side === 'ally' ? ENEMY_STATUE : ALLY_STATUE;
    return {
      id: 'black_dragon',
      feet: () => ({ x, y: STATUE_Y - 30 }), chest: () => ({ x, y: STATUE_Y - 150 }), head: () => ({ x, y: STATUE_Y - 230 }), hurt: () => {},
      text: text => {
        if (this.over || !/^-\d+$/.test(text)) return;
        this.events_.hit(side);
        const pop = this.add.text(x + (Math.random() - 0.5) * 80, STATUE_Y - STATUE_H * 0.6, text, {
          fontFamily: 'system-ui, sans-serif', fontStyle: '900', fontSize: '20px',
          color: side === 'ally' ? '#ffffff' : '#ff6b6b', stroke: '#1a0d00', strokeThickness: 5, resolution: 2,
        }).setOrigin(0.5).setDepth(5000);
        this.tweens.add({ targets: pop, scale: 1, duration: 160, ease: 'Back.easeOut' });
        this.tweens.add({ targets: pop, y: pop.y - 70, alpha: 0, delay: 380, duration: 700, ease: 'Cubic.easeIn', onComplete: () => pop.destroy() });
      },
    };
  }

  private attack(u: Unit, foe: Unit | null, slot: SkillSlot) {
    const def = skill(u.id, slot);
    u.cd[slot] = COOLDOWN[slot];
    // area moves: mates round the dragon itself, foes round the one it aims at (a long-range shot lands there)
    const near = (side: boolean, cx: number) => this.units.filter(o => !o.dead && (o.side === u.side) === side && Math.abs(o.root.x - cx) < SPLASH)
      .sort((a, b) => Math.abs(a.root.x - cx) - Math.abs(b.root.x - cx)).slice(0, MAX_TARGETS);
    const foes = near(false, foe?.root.x ?? u.root.x), mates = near(true, u.root.x);
    const targets: SkillActor[] = def.target === 'team' ? mates.map(o => this.actor(o))
      : !foe ? [this.statue(u.side)]
      : def.target === 'enemies' && def.pierce
        ? this.units.filter(o => !o.dead && o.side !== u.side && (o.root.x - u.root.x) * (u.side === 'ally' ? 1 : -1) > 0).map(o => this.actor(o, u))
      : def.target === 'enemies' ? [foe, ...foes.filter(o => o !== foe)].map(o => this.actor(o, u))
      : [this.actor(foe, u)];
    const { dur, hit } = u.rig.strike(def.anim ?? 'attack');
    if (slot !== 'basic') this.charge(u, slot === 'ultimate');
    if (slot === 'ultimate') { u.ult = dur + 2.5; this.ultimate(u, def.name, targets); }
    u.anim = ANIM[slot];
    u.busy = dur / u.anim;
    this.time.delayedCall(hit * u.busy * 1000, () => { if (!u.dead) void def.run?.(this.ctxFor(u, targets)); });
  }

  private charge(u: Unit, big: boolean) {
    const { c } = HUE[u.id], x = u.root.x, y = u.y, cy = u.y - u.alt - 60 * SCALE;
    const ring = this.add.ellipse(x, y, 260, 80).setStrokeStyle(big ? 6 : 4, c, 0.95).setDepth(4).setScale(big ? 1.4 : 1.1);
    this.tweens.add({ targets: ring, scale: 0.35, alpha: 0.2, duration: 380, ease: 'Quad.easeIn', onComplete: () => ring.destroy() });
    const aura = this.add.image(x, cy, 'glow').setBlendMode(Phaser.BlendModes.SCREEN).setTint(c).setDepth(4.9).setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: aura, scale: big ? 6 : 4, alpha: 0.75, duration: 300, yoyo: true, onComplete: () => aura.destroy() });
    for (let k = 0; k < (big ? 14 : 8); k++) {
      const a = Math.random() * Math.PI * 2, r = Phaser.Math.Between(90, 160);
      const p = this.add.image(x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, 'spark').setTint(c).setBlendMode(Phaser.BlendModes.SCREEN)
        .setDepth(21).setScale(1.6);
      this.tweens.add({ targets: p, x, y: cy, alpha: 0.3, scale: 0.6, delay: k * 18, duration: 300, ease: 'Quad.easeIn', onComplete: () => p.destroy() });
    }
  }

  private ultimate(u: Unit, name: string, targets: SkillActor[]) {
    this.dimT = DIM_S;
    const { c, mark } = HUE[u.id];
    this.time.delayedCall(700, () => targets.forEach(t => {
      const f = t.feet();
      const img = mark ? this.add.image(f.x, f.y, mark).setScale(0.42, 0.19).setBlendMode(Phaser.BlendModes.SCREEN)
        : this.add.ellipse(f.x, f.y, 200, 60, c, 0.18).setStrokeStyle(5, c, 0.9);
      img.setDepth(4).setAlpha(0);
      this.tweens.add({ targets: img, alpha: 0.85, duration: 250, yoyo: true, hold: 3200, onComplete: () => img.destroy() });
    }));
  }

  private ctxFor(u: Unit, targets: SkillActor[]): SkillCtx {
    const fx = this.combat;
    return {
      self: this.actor(u), targets,
      fx: (n, at, o) => fx.fx(vfxKey(u.id, n), at, { light: HUE[u.id].c, ...o }),
      anim: (first, count, at, o) => fx.anim(Array.from({ length: count }, (_, k) => vfxKey(u.id, first + k)), at, o),
      projectile: (n, from, to, o) => fx.callProjectile(vfxKey(u.id, n), from, to, { light: HUE[u.id].c, ...o }),
      beam: (n, from, to, o) => fx.callBeam(vfxKey(u.id, n), from, to, { light: HUE[u.id].c, ...o }),
      rift: (at, ts, onHit, o) => fx.callRift(u.id, this.rigs[u.id], at, ts, onHit, o),
      elementRain: (ts, onHit, o) => fx.callElementRain(ts, onHit, o),
      wait: ms => new Promise(res => this.time.delayedCall(ms, res)),
      // no screen shake: skills still ask for it, the camera stays still
      shake: () => {},
      bite: (at, o) => fx.callBite(u.id, at, o),
      gust: (from, dir, o) => fx.callGust(from, dir, o),
      boneRain: (at, o) => fx.callBoneRain(at, o),
      orb: (from, to, o) => fx.callOrb(from, to, o),
      splash: (at, o) => fx.callWaterSplash(at, o),
    };
  }

  update(_: number, ms: number) {
    const dt = Math.min(ms, 50) / 1000;
    this.dimT = Math.max(0, this.dimT - dt);
    this.dim?.setFillStyle(0x05040c, 0.42 * Math.min(1, this.dimT / 0.3, (DIM_S - this.dimT) / 0.12));
    for (const u of this.units) {
      if (u.dead) continue;
      u.t += dt;
      if (u.drop > 0) {
        u.rig.update(dt, u.fly ? 'fly' : 'idle');
        u.body.setY(-u.alt / SCALE);
        u.shadow.setScale((u.fly ? 0.7 : 1) * (1 - u.drop));
        u.root.setDepth(5 + u.y / 1000 + 1);
        continue;
      }
      if (u.shove) {   // sliding back from a blow, dust kicked up under it (on the ground)
        u.root.x = Phaser.Math.Clamp(u.root.x + u.shove * dt, ALLY_START - 200, ENEMY_START + 200);
        u.shove *= Math.exp(-KNOCK_DECAY * dt);
        if (Math.abs(u.shove) < 8) u.shove = 0;
        if (!u.fly && (u.skidT -= dt) <= 0) {
          u.skidT = 0.05;
          const p = this.add.image(u.root.x, u.y, 'puff').setTint(0xd9c39a).setAlpha(0.6).setDepth(u.root.depth - 0.01).setScale(Phaser.Math.FloatBetween(0.7, 1.2));
          this.tweens.add({ targets: p, y: p.y - 22, alpha: 0, scale: p.scale * 2, duration: 420, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
        }
      }
      const dir = u.side === 'ally' ? 1 : -1;
      const foe = this.combatH.foe(u, this.units);
      const stop = Math.max(u.reach, STATUE_GAP);
      const atStatue = dir > 0 ? u.root.x >= ENEMY_STATUE - stop : u.root.x <= ALLY_STATUE + stop;
      let moving = false;
      const held = u.stop > 0;
      if (held) u.stop -= dt;
      u.ult = Math.max(0, u.ult - dt);
      const frozen = held || this.status.has(u, 'freeze') || this.status.has(u, 'stun');
      for (const k of PRIORITY) u.cd[k] -= dt;
      u.busy -= dt;
      // Hắc Long's passive: under half its HP the crown of flame wraps round it, burning until it falls
      if (u.id === 'black_dragon' && !this.raged.has(u) && !u.dead && u.hp < u.maxHp * 0.5) {
        this.raged.add(u);
        void rage(this.ctxFor(u, []), () => !u.dead && !this.over, u.root.depth);
      }
      if (frozen) {
        // held in the ice
      } else if (this.over) {
        u.engaged = false;   // a statue has fallen: no more blows, everyone stands where it is
      } else if (foe || atStatue) {
        u.engaged = true;
        if (u.id === 'snowflight_dragon') {
          const left = (this.driftT.get(u) ?? 2) - dt;
          this.driftT.set(u, left <= 0 ? DRIFT_EVERY : left);
          if (left <= 0) void drift(this.ctxFor(u, []), u.root.depth);
        }
        if (u.id === 'rosebud_dragon') {
          const left = (this.bloomT.get(u) ?? BLOOM_EVERY) - dt;
          this.bloomT.set(u, left <= 0 ? BLOOM_EVERY : left);
          if (left <= 0 && u.hp < u.maxHp) {
            const heal = Math.round(u.maxHp * 0.08);
            u.hp = Math.min(u.maxHp, u.hp + heal);
            void bloom(this.ctxFor(u, []), heal, u.root.depth);
          }
        }
        if (u.id === 'frost_dragon') {
          const left = (this.cageT.get(u) ?? 0) - dt;
          this.cageT.set(u, left <= 0 ? CAGE_EVERY : left);
          if (left <= 0) void iceCage(this.ctxFor(u, []));
        }
        const slot = u.busy <= 0 ? PRIORITY.find(k => u.cd[k] <= 0) : undefined;
        if (slot) this.attack(u, foe, slot);
      } else {
        u.engaged = false;
        moving = true;
      }
      // get going / come to a stop smoothly instead of all at once
      u.go += Math.sign((moving ? 1 : 0) - u.go) * Math.min(Math.abs((moving ? 1 : 0) - u.go), dt * MARCH_EASE);
      // walkers speed up and slow down with their walk blend (feet and ground stay in step), and
      // coast the last bit of it when they stop; flyers glide at a steady speed
      // everyone marches at MARCH_SPEED; a walker's gait is sped up or slowed down to match (its own
      // stride covers walkSpeed per second at gait rate 1), so its feet stay planted
      const pace = MARCH_SPEED / u.rig.walkSpeed(SCALE);
      if (u.fly) { if (!frozen) u.root.x += dir * dt * MARCH_SPEED * u.go; }
      else if (!frozen && (moving || u.rig.walk > 0.02)) u.root.x += dir * dt * MARCH_SPEED * u.rig.walk;
      if (frozen) u.rig.update(0, u.fly ? 'fly' : 'idle');
      else if (u.fly) u.rig.update(dt * (u.busy > 0 ? u.anim : 1), 'fly');
      else u.rig.update(moving ? dt * pace : dt * (u.busy > 0 ? u.anim : 1), moving ? 'walk' : 'idle');
      const alt = u.fly ? u.alt + 8 * Math.sin(u.t * 2.4) : 0;
      for (const leg of u.rig.takeSteps()) this.step(u, leg);
      if (u.rig.stomps !== (this.stompSeen.get(u) ?? 0)) { this.stompSeen.set(u, u.rig.stomps); this.stompPuff(u, alt); }
      u.body.setY(-(alt + u.hop) / SCALE - u.rig.air);
      u.body.setX((u.side === 'ally' ? -u.kick : u.kick) / u.root.scaleX);
      u.shadow.setScale(u.fly ? 0.7 : 1);
      u.root.setDepth(5 + u.y / 1000 + (u.fly ? 1 : 0));
      u.bar.clear().setDepth(4000);
      if (u.hp < u.maxHp) {   // shown once it has been hit
        const frac = Math.max(0, u.hp / u.maxHp);
        // the part just lost lingers a moment, then drains down to the health (healing: it follows at once)
        u.hpLag = Math.max(frac, (u.hpLag ?? 1) - dt * 0.45 * Math.max(0.4, (u.hpLag ?? 1) - frac) * 4);
        const w = 110, x = u.root.x - w / 2, y = this.head(u) - (u.fly ? 0 : 10);
        unitBar(u.bar, x, y, w, 9, frac, u.hpLag, u.side === 'ally');
      }
    }
    // the boss's HP for the screen's boss bar (dead ones too: their last report is the 0)
    for (const u of this.units) {
      if (!isBoss(u.id) || u.hp === this.bossSeen.get(u)) continue;
      this.bossSeen.set(u, u.hp);
      this.events_.boss?.(Math.max(0, u.hp), u.maxHp);
    }
    this.units = this.units.filter(o => !o.dead);
  }

  /** Boss HP last reported, per boss unit. */
  private bossSeen = new WeakMap<Unit, number>();
}

export async function createBattle(parent: HTMLElement, events: BattleEvents): Promise<import('./types').BattleApi> {
  const [list] = await Promise.all([Promise.all(ALL_SPECIES.map(id => fetch(rigUrl(id)).then(r => r.json() as Promise<RigData>))), loadTweaks()]);
  const rigs = Object.fromEntries(ALL_SPECIES.map((id, i) => [id, list[i]])) as Record<SpeciesId, RigData>;
  const scene = new BattleScene(rigs, events);
  const res = Math.min(window.devicePixelRatio || 1, 2);
  const size = () => [Math.round(Math.max(1, parent.clientWidth || FIELD_W) * res), Math.round(Math.max(1, parent.clientHeight || FIELD_H) * res)] as const;
  const [w, h] = size();
  const game = new Phaser.Game({
    type: Phaser.WEBGL, parent, width: w, height: h, backgroundColor: '#0a0d14', powerPreference: 'high-performance',
    scene, scale: { mode: Phaser.Scale.NONE, zoom: 1 / res },
  });
  if (process.env.NODE_ENV !== 'production') (window as unknown as { __battle?: Phaser.Game }).__battle = game;
  const watch = new ResizeObserver(() => game.scale.resize(...size()));
  watch.observe(parent);
  await new Promise<void>(res => game.events.once(Phaser.Core.Events.READY, () => res()));
  await new Promise<void>(res => { const check = () => (scene.sys.settings.status >= Phaser.Scenes.RUNNING ? res() : setTimeout(check, 50)); check(); });
  return {
    summon: id => scene.spawn(id, 'ally'),
    enemy: id => scene.spawn(id, 'enemy'),
    setHp: (a, e) => scene.setHp(a, e),
    scrollTo: t => scene.look(t * FIELD_W),
    destroy: () => { watch.disconnect(); game.destroy(true); },
  };
}
