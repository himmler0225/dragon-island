// Battle field: transparent Phaser canvas over the battle screen background.
// Winged dragons fly across; others walk. React owns mana, clock and win/loss.
import * as Phaser from 'phaser';
import { DragonRig, rigTextureKey, type RigData } from '../rig';
import { SPECIES, SPECIES_INFO, cloudKey, cloudUrl, rigUrl, type SpeciesId } from '../config/species';
import { JAW_SPECIES, NO_VFX, SKILLS, VFX_COUNT, jawKey, jawUrl, skill, vfxKey, vfxUrl } from '../skills/registry';
import type { SkillActor, SkillCtx, SkillSlot, Spot } from '../skills/types';
import { CombatFx } from '../scene/effects/combatFx';
import { makeFxTextures } from '../scene/effects/ambientFx';
import { StatusFx, loadStatusTextures } from '../scene/effects/statusFx';
import { STATUS, statusFromText, type StatusKind } from '../skills/status';

// the ground is wider than the screen (the two statues far apart): the view scrolls sideways; the
// height always fits the screen
export const FIELD_W = 2540, FIELD_H = 900;   // (extra room on the right: the wave list covers the edge)
const SCALE = 0.68;                      // dragon size on the field
const ALLY_START = 360, ENEMY_START = 2040;   // just in front of each statue
const PACE = 2.8;                          // quicker than on the islands (the gait speeds up too, so feet do not slide)
const FLY_SPEED = 135;                   // field px/s
const STATUE_GAP = 260;                  // melee dragons stop this far from the statue's centre
const LANES = [610, 690, 650, 730, 570]; // ground rows (feet y), alternated so neighbours don't overlap
const FLYERS: SpeciesId[] = ['hac_long', 'phuong_hoang_lua', 'phuong_hoang_bang', 'hai_long', 'than_long'];
const ALT = 150;                         // flying height above the ground row
// winged dragons soar higher (Hải Long rides its cloud lower)
const HIGH: Partial<Record<SpeciesId, number>> = { hac_long: 250, than_long: 250, phuong_hoang_lua: 240, phuong_hoang_bang: 240 };
// how far ahead a dragon stops to fight: melee dragons each pick their own distance so they crowd
// in around the front (no queue); the ranged ones hang back and hit from afar
const REACH: [number, number] = [110, 200];
const RANGED: SpeciesId[] = ['rong_xuong', 'hai_long'];
const RANGED_REACH: [number, number] = [380, 460];
const CLOUD_W = 470;                     // Hải Long's cloud, body px (as on the islands)
// placeholder stats by rarity
// (damage is whatever the skills deal: their "-123" numbers)
const STATS: Record<string, number> = { R: 1200, SR: 1500, SSR: 1900, UR: 2500 };
// seconds between two uses of each move; when several are ready the strongest goes first
const COOLDOWN: Record<SkillSlot, number> = { basic: 0.45, skill: 1.4, ultimate: 9 };
// how fast each move's pose plays (the basic attack is snappy; skills keep their full wind-up)
const ANIM: Record<SkillSlot, number> = { basic: 2, skill: 1.5, ultimate: 0.8 };   // ultimate: slower, heavier
const PRIORITY: SkillSlot[] = ['ultimate', 'skill', 'basic'];
const MAX_TARGETS = 3;                   // area moves hit at most this many
const SPLASH = 420;                      // area skills hit enemies this close (field px)
const ALLY_STATUE = 190, ENEMY_STATUE = 2210;   // statue centres (x)
const STATUE_Y = 790, STATUE_H = 330;   // statue base (y) and height (field px)
// the colour of each dragon's power (charge ring, damage numbers) and the mark its ultimate leaves
const HUE: Record<SpeciesId, { c: number; css: string; mark?: string }> = {
  hac_long: { c: 0xb05cff, css: '#d39bff', mark: 'status_curse_6' },
  rong_xuong: { c: 0x9a6bff, css: '#c9a6ff', mark: 'status_curse_6' },
  tu_xa_long: { c: 0xc04cff, css: '#e0a6ff', mark: 'status_curse_6' },
  ki_lan: { c: 0xff7a2a, css: '#ffb066', mark: 'status_burn_6' },
  phuong_hoang_lua: { c: 0xff6a1a, css: '#ffab5a', mark: 'status_burn_6' },
  phuong_hoang_bang: { c: 0x6fd8ff, css: '#a8ecff', mark: 'status_freeze_2' },
  tuan_long: { c: 0x8fe6ff, css: '#c4f3ff', mark: 'status_freeze_2' },
  hai_long: { c: 0x3fa8ff, css: '#8fd0ff' },
  rong_vang: { c: 0xffc83a, css: '#ffe07a' },
  than_long: { c: 0xffe27a, css: '#fff0a8' },
  rong_bac: { c: 0xd8e4ff, css: '#eef3ff' },
  rong_lua_do: { c: 0xff6a1a, css: '#ffab5a', mark: 'status_burn_6' },
  rong_dat_nau: { c: 0xd9a45a, css: '#f0cf8f' },
  rong_cay_xanh_la: { c: 0x8fdc3a, css: '#c6f08a' },
  rong_bang_xanh_bien: { c: 0x7fe0ff, css: '#bff0ff', mark: 'status_freeze_2' },
};
const CRIT = 0.15;                        // chance a blow is a critical (x2)
const STOP_MS = { hit: 60, crit: 110, ultimate: 140 };   // hit-stop: both dragons hold for a beat
const BANNER_GAP = 2.5;                   // s between two ultimate banners
const DIM_S = 1.1;                        // s the ground stays darkened during an ultimate
const DROP_H = 620;                      // summoned dragons dive in from this high above their spot
const DROP_MS = 560;

export interface BattleApi {
  /** One dragon comes out of the player's statue toward the enemy. */
  summon(id: SpeciesId): void;
  /** One enemy dragon comes out of the enemy statue. */
  enemy(id: SpeciesId): void;
  /** Statue health 0..1 (the bars over them). */
  setHp(ally: number, enemy: number): void;
  /** Centre the view on this point of the field (0..1). */
  scrollTo(t: number): void;
  destroy(): void;
}
export interface BattleEvents {
  /** a dragon fires its ultimate (the screen shows a banner) */
  ultimate?(id: SpeciesId, name: string, side: 'ally' | 'enemy'): void;
  /** a blow landed on the other side's statue */
  hit(side: 'ally' | 'enemy'): void;
  /** the part of the field in view changed (0..1 of its width) */
  view?(from: number, to: number): void;
  /** Asset loading 0..1 (the screen shows a loading bar until createBattle resolves). */
  progress?(p: number): void;
}

type Side = 'ally' | 'enemy';
interface Unit {
  root: Phaser.GameObjects.Container; body: Phaser.GameObjects.Container; shadow: Phaser.GameObjects.Ellipse;
  bar: Phaser.GameObjects.Graphics; cloud: Phaser.GameObjects.Image | null;
  id: SpeciesId; rig: DragonRig; side: Side; y: number; fly: boolean; t: number;
  hp: number; maxHp: number; dead: boolean; reach: number;
  alt: number;                           // flying height (0 = walks)
  stop: number;                          // s of hit-stop left (frozen for a beat on a blow)
  kick: number;                          // knock-back (field px, away from the attacker), springs back
  pops: number[];                        // times of its recent damage numbers (they stack, not overlap)
  ult: number;                           // s left of its ultimate (heavier hit-stop on those blows)
  drop: number;                          // 1 -> 0 while diving in from the sky after being summoned
  busy: number;                          // s left of the current move's pose
  anim: number;                          // pose playback speed of the current move
  cd: Record<SkillSlot, number>;         // s until each move is ready again
}

class BattleScene extends Phaser.Scene {
  private units: Unit[] = [];
  private combat!: CombatFx;
  private status!: StatusFx;
  private lane = { ally: 0, enemy: 0 };
  constructor(private rigs: Record<SpeciesId, RigData>, private events_: BattleEvents) { super('battle'); }

  preload() {
    loadStatusTextures(this.load);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => this.events_.progress?.(p));
    this.load.image('battle_bg', '/battle/background.jpg');
    for (const k of ['tower_ally', 'tower_enemy', 'hp_frame']) this.load.image(k, `/battle/${k}.png`);
    for (const id of SPECIES) {
      for (const b of this.rigs[id].bones) this.load.image(rigTextureKey(id, b.name), `/dragons/${id}/${b.name}.png`);
      if (this.rigs[id].motion?.rideCloud) this.load.image(cloudKey(id, 'main'), cloudUrl(id, 'main'));
      if (SKILLS[id].length && !NO_VFX.includes(id)) for (let n = 1; n <= (VFX_COUNT[id] ?? 8); n++) this.load.image(vfxKey(id, n), vfxUrl(id, n));
      if (JAW_SPECIES.includes(id)) for (const part of ['upper', 'lower'] as const) this.load.image(jawKey(id, part), jawUrl(id, part));
    }
  }

  create() {
    makeFxTextures(this);
    // the background is drawn here, not left to CSS: the effects are additive (black = clear) and need
    // real pixels under them - over a transparent canvas their black boxes showed
    this.bg = this.add.image(0, 0, 'battle_bg').setOrigin(0, 1).setDepth(-10);
    // the two statues at the two ends of the ground, a health bar over each
    for (const side of ['ally', 'enemy'] as const) {
      const x = side === 'ally' ? ALLY_STATUE : ENEMY_STATUE;
      const img = this.add.image(x, STATUE_Y, `tower_${side}`).setOrigin(0.5, 0.97);
      img.setScale(STATUE_H / img.height).setDepth(5 + STATUE_Y / 1000);
      const top = STATUE_Y - STATUE_H - 30;
      const frame = this.add.image(x, top, 'hp_frame').setDepth(4000);
      frame.setScale(250 / frame.width);
      this.hpBars[side] = { g: this.add.graphics().setDepth(4001), x, y: top, w: 250 * 0.8, h: frame.displayHeight * 0.34 };
    }
    this.drawHp();
    // darkens the ground while an ultimate plays (above the background, below the dragons)
    this.dim = this.add.rectangle(-200, -200, FIELD_W + 400, FIELD_H + 400, 0x05040c, 0).setOrigin(0, 0).setDepth(-5);
    // drag the ground (or wheel) to look along it
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.look(this.cx - (p.x - p.prevPosition.x) / this.cameras.main.zoom);
    });
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_: Phaser.Input.Pointer, __: unknown, dx: number, dy: number) => this.look(this.cx + (Math.abs(dx) > Math.abs(dy) ? dx : dy)));
    this.combat = new CombatFx(this);
    // many dragons fight at once: additive effects stacked into a white-out, so they are dimmer here
    // and capped (the islands keep full strength)
    this.combat.intensity = 0.8;
    this.combat.budget = 12;
    this.combat.size = 0.8;
    this.status = new StatusFx(this, this.combat);
    this.combat.blend = Phaser.BlendModes.SCREEN;
    this.fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fit());
  }

  /** The field's height fills the canvas; its width is wider than the view, which scrolls. */
  private fit() {
    this.cameras.main.setZoom(this.scale.height / FIELD_H);
    this.look(this.cx);
  }

  private bg!: Phaser.GameObjects.Image;
  private cx = FIELD_W / 2;   // view centre (field x)
  private hpBars: Partial<Record<Side, { g: Phaser.GameObjects.Graphics; x: number; y: number; w: number; h: number }>> = {};
  private hp: Record<Side, number> = { ally: 1, enemy: 1 };

  /** Centre the view at field x `cx` (kept inside the ground); the background follows more slowly. */
  look(cx: number) {
    const cam = this.cameras.main, viewW = this.scale.width / cam.zoom;
    this.cx = viewW >= FIELD_W ? FIELD_W / 2 : Phaser.Math.Clamp(cx, viewW / 2, FIELD_W - viewW / 2);
    cam.centerOn(this.cx, FIELD_H / 2);
    // the painting is narrower than the ground: it covers the view and slides at a slower pace
    // (parallax), so it is always full and reads as far away
    const bw = this.bg.width, bh = this.bg.height;
    const k = Math.max(FIELD_H / bh, (viewW * 1.25) / bw);
    this.bg.setScale(k);
    const t = viewW >= FIELD_W ? 0.5 : (this.cx - viewW / 2) / (FIELD_W - viewW);
    this.bg.setPosition(this.cx - viewW / 2 - t * (bw * k - viewW), FIELD_H + (bh * k - FIELD_H) * 0.3);
    const a = Math.max(0, (this.cx - viewW / 2) / FIELD_W), b = Math.min(1, (this.cx + viewW / 2) / FIELD_W);
    this.events_.view?.(a, b);
  }

  setHp(ally: number, enemy: number) {
    this.hp = { ally, enemy };
    this.drawHp();
  }

  private drawHp() {
    for (const side of ['ally', 'enemy'] as const) {
      const b = this.hpBars[side];
      if (!b) continue;
      const w = b.w * Phaser.Math.Clamp(this.hp[side], 0, 1);
      const [top, mid, bot] = side === 'ally' ? [0x8ff07a, 0x31c84a, 0x1d8a33] : [0xff8a78, 0xe0362c, 0xa3171a];
      b.g.clear().fillGradientStyle(top, top, mid, mid, 1).fillRect(b.x - b.w / 2, b.y - b.h / 2, w, b.h / 2)
        .fillGradientStyle(mid, mid, bot, bot, 1).fillRect(b.x - b.w / 2, b.y, w, b.h / 2);
    }
  }

  spawn(id: SpeciesId, side: Side) {
    const y = LANES[this.lane[side]++ % LANES.length] + Phaser.Math.Between(-18, 18);
    const [r0, r1] = RANGED.includes(id) ? RANGED_REACH : REACH;
    const fly = FLYERS.includes(id);
    const root = this.add.container(side === 'ally' ? ALLY_START : ENEMY_START, y);
    const shadow = this.add.ellipse(0, 0, 180, 34, 0x2a1a08, fly ? 0.16 : 0.28);
    const body = this.add.container(0, 0);
    root.add([shadow, body]);
    const rig = new DragonRig(this, this.rigs[id], body, id);
    let cloud: Phaser.GameObjects.Image | null = null;
    if (this.rigs[id].motion?.rideCloud) {
      cloud = this.add.image(-20, 4, cloudKey(id, 'main')).setOrigin(0.5, 0.52);
      cloud.setScale(CLOUD_W / cloud.width);
      body.addAt(cloud, 0);
    }
    // art faces left: allies go right, so they are mirrored
    root.setScale(side === 'ally' ? -SCALE : SCALE, SCALE).setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 160 });
    const hp = STATS[SPECIES_INFO[id].rarity] ?? STATS.SR;
    const bar = this.add.graphics();
    const unit: Unit = { root, body, shadow, bar, cloud, rig, side, y, fly, id, t: Math.random() * 9, hp, maxHp: hp, dead: false, stop: 0, kick: 0, pops: [], ult: 0, alt: fly ? HIGH[id] ?? ALT : 0, anim: 1, drop: 1, reach: Phaser.Math.Between(r0, r1), busy: 0.2, // staggered: dragons summoned together don't all fire their big moves on the same beat
      cd: { basic: 0, skill: Phaser.Math.FloatBetween(1, COOLDOWN.skill), ultimate: Phaser.Math.FloatBetween(3, COOLDOWN.ultimate + 2) } };
    this.units.push(unit);
    this.dive(unit);
  }

  /** Summoned: the dragon plunges out of the sky along a streak of light and lands with a shockwave. */
  private dive(u: Unit) {
    const tint = u.side === 'ally' ? 0x9fe8ff : 0xff9a7a;
    const land = u.y - u.alt;
    const streak = this.add.image(u.root.x, land - DROP_H / 2, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.3, DROP_H / 40).setAlpha(0).setDepth(19);
    this.tweens.add({ targets: streak, alpha: 0.85, duration: DROP_MS * 0.6, yoyo: true, onComplete: () => streak.destroy() });
    this.tweens.add({ targets: u, drop: 0, duration: DROP_MS, ease: 'Quad.easeIn', onComplete: () => this.land(u, land, tint) });
  }

  private land(u: Unit, y: number, tint: number) {
    const x = u.root.x;
    const flash = this.add.image(x, y - 20, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(4).setDepth(19);
    this.tweens.add({ targets: flash, scale: 0.5, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
    for (let k = 0; k < 2; k++) {
      const ring = this.add.ellipse(x, y, 90, 30).setStrokeStyle(5 - k * 2, k ? 0xffffff : tint, 0.9).setDepth(4).setScale(0.3);
      this.tweens.add({ targets: ring, scale: 2.6 + k, alpha: 0, delay: k * 90, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, r = Phaser.Math.Between(70, 130);
      const p = this.add.image(x, y, u.fly ? 'spark' : 'puff').setTint(u.fly ? tint : 0xd9c39a).setAlpha(0.85).setDepth(4)
        .setScale(u.fly ? 1.6 : Phaser.Math.FloatBetween(1.2, 2.2));
      this.tweens.add({ targets: p, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.35 - (u.fly ? 0 : 14), alpha: 0, scale: p.scale * 1.6,
        duration: Phaser.Math.Between(380, 620), ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
    u.rig.hurt();   // a squash on landing
  }

  /** The nearest live enemy in front of `u`, within reach. */
  private foe(u: Unit) {
    const dir = u.side === 'ally' ? 1 : -1;
    let best: Unit | null = null, bestD = u.reach;
    for (const o of this.units) {
      if (o.dead || o.side === u.side) continue;
      const d = (o.root.x - u.root.x) * dir;
      if (d > -40 && d < bestD) { best = o; bestD = d; }
    }
    return best;
  }

  /** Damage number: pops in big and settles, then floats up; a critical is bigger, gold, with a tag. */
  private pop(x: number, y: number, text: string, color: string, big = false) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'system-ui, sans-serif', fontStyle: '900', fontSize: big ? '40px' : '28px', color,
      stroke: '#1a0d00', strokeThickness: big ? 7 : 5, resolution: 2,
    }).setOrigin(0.5).setDepth(5000).setScale(big ? 2 : 1.6);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, delay: 380, duration: 700, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
    if (big) {
      const tag = this.add.text(x, y - 34, 'CHÍ MẠNG', {
        fontFamily: 'system-ui, sans-serif', fontStyle: 'italic 900', fontSize: '18px', color: '#fff6c8',
        stroke: '#7a2a00', strokeThickness: 5, resolution: 2,
      }).setOrigin(0.5).setDepth(5001).setAngle(-8).setScale(0.4);
      this.tweens.add({ targets: tag, scale: 1, duration: 140, ease: 'Back.easeOut' });
      this.tweens.add({ targets: tag, y: y - 104, alpha: 0, delay: 380, duration: 700, ease: 'Cubic.easeIn', onComplete: () => tag.destroy() });
    }
  }

  /** A blow lands on `u` from `by`: hit-stop for both, a white flash, a knock-back and a spark. */
  private impact(u: Unit, by: Unit | undefined, crit: boolean) {
    const ms = by && by.ult > 0 ? STOP_MS.ultimate : crit ? STOP_MS.crit : STOP_MS.hit;
    u.stop = Math.max(u.stop, ms / 1000);
    if (by && !by.dead) by.stop = Math.max(by.stop, ms / 1000);
    u.rig.hurt(true);
    u.kick = crit ? 26 : 14;
    this.tweens.add({ targets: u, kick: 0, delay: ms, duration: 260, ease: 'Back.easeOut' });
    const spark = this.add.image(u.root.x, u.y - u.alt - 60 * SCALE, 'glow').setBlendMode(Phaser.BlendModes.SCREEN)
      .setTint(by ? HUE[by.id].c : 0xffffff).setScale(crit ? 3.2 : 2.2).setDepth(21).setAlpha(0.9);
    this.tweens.add({ targets: spark, scale: 0.4, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => spark.destroy() });
  }

  private head(u: Unit) { return u.y - u.alt - 150 * SCALE; }

  private kill(u: Unit) {
    u.dead = true;
    u.bar.destroy();
    this.tweens.add({
      targets: u.root, alpha: 0, y: u.root.y + 20, duration: 600, ease: 'Quad.easeIn',
      onComplete: () => { u.rig.destroy(); u.root.destroy(); this.units = this.units.filter(o => o !== u); },
    });
    if (u.fly) this.tweens.add({ targets: u.body, y: 0, duration: 600, ease: 'Quad.easeIn' });   // falls out of the sky
  }

  /** A SkillActor view of a unit: skills aim at it and deal damage through text("-123"). */
  private actor(u: Unit, by?: Unit): SkillActor & { mouth(): Spot; facing: 1 | -1 } {
    const lift = () => (u.dead ? 0 : -u.body.y * SCALE);
    return {
      id: u.id,
      feet: () => ({ x: u.root.x, y: u.y }),
      chest: () => ({ x: u.root.x, y: u.y - lift() - 60 * SCALE }),
      head: () => (u.dead ? { x: u.root.x, y: this.head(u) } : (({ x, y }) => ({ x, y: y - 10 }))(u.rig.headWorld())),
      mouth: () => (u.dead ? { x: u.root.x, y: this.head(u) } : u.rig.mouthWorld()),
      get facing() { return (u.side === 'ally' ? 1 : -1) as 1 | -1; },
      hurt: () => {},   // the flash comes with the damage number (impact)
      text: (text, color) => {
        if (u.dead) return;
        const n = /^-(\d+)$/.exec(text);
        if (n) {
          const crit = !!by && Math.random() < CRIT;
          const dmg = Number(n[1]) * (crit ? 2 : 1);
          u.hp -= dmg;
          // stacked: numbers that land close together climb instead of overlapping
          const now = this.time.now;
          u.pops = u.pops.filter(t => now - t < 450);
          const lift = u.pops.length * 26;
          u.pops.push(now);
          this.pop(u.root.x + (Math.random() - 0.5) * 30, this.head(u) - 10 - lift, `-${dmg}`,
            crit ? '#ffd84d' : by ? HUE[by.id].css : u.side === 'ally' ? '#ff6b6b' : '#ffffff', crit);
          this.impact(u, by, crit);
          if (u.hp <= 0) this.kill(u);
        } else this.combat.floatText(u.root.x, this.head(u) - 30, text, color);
        const kind = by && !u.dead ? statusFromText(by.id, text) : null;
        if (kind) this.inflict(u, kind);
      },
    };
  }

  /** Status effect on a unit: freeze holds it still (update), burn / curse hurt it every second. */
  private inflict(u: Unit, kind: StatusKind) {
    const a = this.actor(u);
    const host = { chest: a.chest, feet: a.feet, head: a.head, gone: () => u.dead };
    const tick = STATUS[kind].tick;
    this.status.apply(u, host, kind, tick ? () => {
      if (u.dead) return;
      u.hp -= tick;
      this.pop(u.root.x + (Math.random() - 0.5) * 30, this.head(u) - 10, `-${tick}`, kind === 'burn' ? '#ffab5a' : '#d39bff');
      if (u.hp <= 0) this.kill(u);
    } : undefined);
  }

  /** The other side's statue as a target: damage on it goes to the React HP bar. */
  private statue(side: Side): SkillActor {
    const x = side === 'ally' ? ENEMY_STATUE : ALLY_STATUE;
    return {
      id: 'hac_long', feet: () => ({ x, y: 760 }), chest: () => ({ x, y: 640 }), head: () => ({ x, y: 560 }), hurt: () => {},
      text: text => {
        if (!/^-\d+$/.test(text)) return;
        this.events_.hit(side);
        this.pop(x + (Math.random() - 0.5) * 80, STATUE_Y - STATUE_H * 0.6, text, side === 'ally' ? '#ffffff' : '#ff6b6b');
      },
    };
  }

  /** Use a move (the real skill with its effects) and start its cooldown. */
  private attack(u: Unit, foe: Unit | null, slot: SkillSlot) {
    const def = skill(u.id, slot);
    u.cd[slot] = COOLDOWN[slot];
    // area moves reach the nearest few only (every dragon on the field lit up at once washed it white)
    const near = (side: boolean) => this.units.filter(o => !o.dead && (o.side === u.side) === side && Math.abs(o.root.x - u.root.x) < SPLASH)
      .sort((a, b) => Math.abs(a.root.x - u.root.x) - Math.abs(b.root.x - u.root.x)).slice(0, MAX_TARGETS);
    const foes = near(false), mates = near(true);
    const targets: SkillActor[] = def.target === 'team' ? mates.map(o => this.actor(o))
      : !foe ? [this.statue(u.side)]
      : def.target === 'enemies' ? [foe, ...foes.filter(o => o !== foe)].map(o => this.actor(o, u))
      : [this.actor(foe, u)];
    const { dur, hit } = u.rig.strike(def.anim ?? 'attack');
    if (slot !== 'basic') this.charge(u, slot === 'ultimate');
    if (slot === 'ultimate') { u.ult = dur + 2.5; this.ultimate(u, def.name, targets); }
    u.anim = ANIM[slot];
    u.busy = dur / u.anim;   // one move at a time: the pose plays out before the next
    this.time.delayedCall(hit * u.busy * 1000, () => { if (!u.dead) void def.run?.(this.ctxFor(u, targets)); });
  }

  /** Wind-up before a skill: a ring in the dragon's colour closes in under it and sparks rush to it. */
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

  private dimT = 0;
  private bannerT = -99;
  private dim!: Phaser.GameObjects.Rectangle;

  /** Ultimate: the ground darkens for a moment (dragons and effects stay bright), a banner (React)
   *  once in a while, and the ground under the targets keeps a mark of the dragon's power. */
  private ultimate(u: Unit, name: string, targets: SkillActor[]) {
    this.dimT = DIM_S;
    const now = this.time.now / 1000;
    if (now - this.bannerT > BANNER_GAP) { this.bannerT = now; this.events_.ultimate?.(u.id, name, u.side); }
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
      fx: (n, at, o) => fx.fx(vfxKey(u.id, n), at, o),
      projectile: (n, from, to, o) => fx.callProjectile(vfxKey(u.id, n), from, to, o),
      beam: (n, from, to, o) => fx.callBeam(vfxKey(u.id, n), from, to, o),
      rift: (at, ts, onHit, o) => fx.callRift(u.id, this.rigs[u.id], at, ts, onHit, o),
      elementRain: (ts, onHit, o) => fx.callElementRain(ts, onHit, o),
      wait: ms => new Promise(res => this.time.delayedCall(ms, res)),
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
    // ultimate dimming: in fast, held, out
    this.dimT = Math.max(0, this.dimT - dt);
    this.dim?.setFillStyle(0x05040c, 0.42 * Math.min(1, this.dimT / 0.3, (DIM_S - this.dimT) / 0.12));
    for (const u of this.units) {
      if (u.dead) continue;
      u.t += dt;
      if (u.drop > 0) {   // still diving in: no moving or fighting yet
        u.rig.update(dt, u.fly ? 'fly' : 'idle');
        u.body.setY(-(u.alt + DROP_H * u.drop) / SCALE);
        u.shadow.setScale((u.fly ? 0.7 : 1) * (1 - 0.7 * u.drop));
        u.root.setDepth(5 + u.y / 1000 + 1);
        continue;
      }
      const dir = u.side === 'ally' ? 1 : -1;
      const foe = this.foe(u);
      const stop = Math.max(u.reach, STATUE_GAP);   // ranged dragons hit the statue from afar too
      const atStatue = dir > 0 ? u.root.x >= ENEMY_STATUE - stop : u.root.x <= ALLY_STATUE + stop;
      let moving = false;
      const held = u.stop > 0;                         // hit-stop: everything about it pauses a beat
      if (held) u.stop -= dt;
      u.ult = Math.max(0, u.ult - dt);
      const frozen = held || this.status.has(u, 'freeze');   // frozen: no moving, no moves, the pose held
      for (const k of PRIORITY) u.cd[k] -= dt;
      u.busy -= dt;
      if (frozen) {
        // (nothing: held in the ice)
      } else if (foe || atStatue) {
        const slot = u.busy <= 0 ? PRIORITY.find(k => u.cd[k] <= 0) : undefined;
        if (slot) this.attack(u, foe, slot);
      } else {
        u.root.x += dir * dt * (u.fly ? FLY_SPEED : u.rig.walkSpeed(SCALE) * PACE);
        moving = true;
      }
      // flyers flap the whole way and bob a little; walkers speed their gait up with the pace
      if (frozen) u.rig.update(0, u.fly ? 'fly' : 'idle');
      else if (u.fly) u.rig.update(dt * (u.busy > 0 ? u.anim : 1), 'fly');
      else u.rig.update(moving ? dt * PACE : dt * (u.busy > 0 ? u.anim : 1), moving ? 'walk' : 'idle');
      const alt = u.fly ? u.alt + 8 * Math.sin(u.t * 2.4) : 0;
      u.body.setY(-alt / SCALE - u.rig.air);   // alt in field px, the strike's air in body px
      u.body.setX((u.side === 'ally' ? -u.kick : u.kick) / u.root.scaleX);   // knock-back (root is mirrored for allies)
      u.cloud?.setY(4 + 3 * Math.sin(u.t * 2.2));
      u.shadow.setScale(u.fly ? 0.7 : 1);
      u.root.setDepth(5 + u.y / 1000 + (u.fly ? 1 : 0));   // same depth scale as the islands, so skill effects (depth 20+) draw on top
      // HP bar over the head once hurt
      u.bar.clear().setDepth(4000);
      if (u.hp < u.maxHp) {
        const w = 90, x = u.root.x - w / 2, y = this.head(u) - (u.fly ? 0 : 10);
        u.bar.fillStyle(0x000000, 0.6).fillRoundedRect(x - 2, y - 2, w + 4, 11, 4)
          .fillStyle(u.side === 'ally' ? 0x3dd44f : 0xe8433a, 1).fillRoundedRect(x, y, w * Math.max(0, u.hp / u.maxHp), 7, 3);
      }
    }
  }
}

export async function createBattle(parent: HTMLElement, events: BattleEvents): Promise<BattleApi> {
  const list = await Promise.all(SPECIES.map(id => fetch(rigUrl(id)).then(r => r.json() as Promise<RigData>)));
  const rigs = Object.fromEntries(SPECIES.map((id, i) => [id, list[i]])) as Record<SpeciesId, RigData>;
  const scene = new BattleScene(rigs, events);
  // render at the screen's pixel density (a 1600x900 canvas stretched over a retina screen looked
  // blurry): the canvas holds (CSS size x res) pixels, shown at its CSS size; the scene zooms to fit
  const res = Math.min(window.devicePixelRatio || 1, 2);
  const size = () => [Math.round(Math.max(1, parent.clientWidth || FIELD_W) * res), Math.round(Math.max(1, parent.clientHeight || FIELD_H) * res)] as const;
  const [w, h] = size();
  const game = new Phaser.Game({
    type: Phaser.WEBGL, parent, width: w, height: h, backgroundColor: '#0a0d14', powerPreference: 'high-performance',
    scene, scale: { mode: Phaser.Scale.NONE, zoom: 1 / res },
  });
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
