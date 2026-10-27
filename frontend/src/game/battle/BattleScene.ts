// Battle scene.
import * as Phaser from 'phaser';
import type { SpeciesId } from '../config/species';
import { SPECIES, SPECIES_INFO, cloudKey, cloudUrl, rigUrl } from '../config/species';
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
  FLYERS, FLY_BONUS, FLY_REACH, FLY_SPEED, HIGH, HUE, LANES, MAX_TARGETS, PACE, PRIORITY, RANGED, RANGED_REACH, REACH, SCALE, SPLASH, STATS,
  STATUE_GAP, STATUE_H, STATUE_Y,
} from './constants';
import type { BattleEvents, Side } from './types';
import type { Unit } from './units';
import { CombatScene } from './combat';

const MUSIC_KEY = 'battle_music', MUSIC_VOLUME = 0.45;

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
  private dimT = 0;
  private dim!: Phaser.GameObjects.Rectangle;
  constructor(private rigs: Record<SpeciesId, RigData>, private events_: BattleEvents) { super('battle'); }

  preload() {
    loadStatusTextures(this.load);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => this.events_.progress?.(p));
    this.load.image('battle_bg', '/battle/background.jpg');
    this.load.audio(MUSIC_KEY, '/audio/battle.mp3');   // cut from dragon-island-tools/assets/audio/battle_source.mp4
    for (const k of ['tower_ally', 'tower_enemy', 'hp_frame']) this.load.image(k, `/battle/${k}.png`);
    for (const id of SPECIES) {
      for (const b of this.rigs[id].bones) this.load.image(`rig_${id}_${b.name}`, `/dragons/${id}/${b.name}.png`);
      if (this.rigs[id].motion?.rideCloud) this.load.image(cloudKey(id, 'main'), cloudUrl(id, 'main'));
      if (SKILLS[id].length && !NO_VFX.includes(id)) for (const n of vfxNumbers(id)) this.load.image(vfxKey(id, n), vfxUrl(id, n));
      if (JAW_SPECIES.includes(id)) for (const part of ['upper', 'lower'] as const) this.load.image(jawKey(id, part), jawUrl(id, part));
    }
  }

  create() {
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
    this.combat.intensity = 0.8;
    this.combat.budget = 12;
    this.combat.size = 0.8;
    this.combat.blend = Phaser.BlendModes.SCREEN;
    this.status = new StatusFx(this, this.combat);
    this.combatH = new CombatScene(this);
    this.fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fit());
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
    const fly = FLYERS.includes(id);
    const [r0, r1] = RANGED.includes(id) ? RANGED_REACH.map(r => r + (fly ? FLY_BONUS : 0)) : fly ? FLY_REACH : REACH;
    const root = this.add.container(side === 'ally' ? ALLY_START : ENEMY_START, y);
    const shadow = this.add.ellipse(0, 0, 180, 34, 0x2a1a08, fly ? 0.16 : 0.28);
    const body = this.add.container(0, 0);
    root.add([shadow, body]);
    const rig = new DragonRig(this, this.rigs[id], body, id);
    let cloud: Phaser.GameObjects.Image | null = null;
    if (this.rigs[id].motion?.rideCloud) {
      cloud = this.add.image(-20, 4, cloudKey(id, 'main')).setOrigin(0.5, 0.52);
      cloud.setScale(470 / cloud.width);
      body.addAt(cloud, 0);
    }
    root.setScale(side === 'ally' ? -SCALE : SCALE, SCALE).setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 160 });
    const hp = STATS[SPECIES_INFO[id].rarity] ?? 1500;
    const bar = this.add.graphics();
    const unit: Unit = {
      root, body, shadow, bar, cloud, rig, side, y, fly, id, t: Math.random() * 9,
      hp, maxHp: hp, dead: false, stop: 0, kick: 0, pops: [], ult: 0,
      alt: fly ? HIGH[id] ?? 150 : 0, anim: 1, drop: 1, reach: Phaser.Math.Between(r0, r1), busy: 0.2,
      cd: { basic: 0, skill: Phaser.Math.FloatBetween(1, COOLDOWN.skill), ultimate: Phaser.Math.FloatBetween(3, COOLDOWN.ultimate + 2) },
    };
    this.units.push(unit);
    this.combatH.summon(unit);
  }

  /** Stomps already puffed, per unit (DragonRig.stomps goes up by one per front-paw landing). */
  private stompSeen = new WeakMap<Unit, number>();

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

  private actor(u: Unit, by?: Unit): SkillActor & { mouth(): import('../skills/types').Spot; facing: 1 | -1 } {
    const lift = () => (u.dead ? 0 : -u.body.y * SCALE);
    return {
      id: u.id,
      feet: () => ({ x: u.root.x, y: u.y }),
      chest: () => ({ x: u.root.x, y: u.y - lift() - 60 * SCALE }),
      head: () => (u.dead ? { x: u.root.x, y: this.head(u) } : (({ x, y }) => ({ x, y: y - 10 }))(u.rig.headWorld())),
      mouth: () => (u.dead ? { x: u.root.x, y: this.head(u) } : u.rig.mouthWorld()),
      get facing() { return (u.side === 'ally' ? 1 : -1) as 1 | -1; },
      hurt: () => {},
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
          const t = this.add.text(u.root.x, hy, text, { fontFamily: 'system-ui, sans-serif', fontStyle: '900', fontSize: '28px', color, stroke: '#1a0d00', strokeThickness: 5, resolution: 2 }).setOrigin(0.5).setDepth(5000).setScale(1.6);
          this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
          this.tweens.add({ targets: t, y: hy - 70, alpha: 0, delay: 380, duration: 700, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
        }
        const kind = by && !u.dead ? statusFromText(by.id, text) : null;
        if (kind) this.status.apply(u, this.actor(u), kind, STATUS[kind].tick ? () => this.combatH.inflict(u, kind, this.head(u)) : undefined);
      },
    };
  }

  private statue(side: Side): SkillActor {
    const x = side === 'ally' ? ENEMY_STATUE : ALLY_STATUE;
    return {
      id: 'black_dragon',
      feet: () => ({ x, y: 760 }), chest: () => ({ x, y: 640 }), head: () => ({ x, y: 560 }), hurt: () => {},
      text: text => {
        if (!/^-\d+$/.test(text)) return;
        this.events_.hit(side);
        const pop = this.add.text(x + (Math.random() - 0.5) * 80, STATUE_Y - STATUE_H * 0.6, text, {
          fontFamily: 'system-ui, sans-serif', fontStyle: '900', fontSize: '28px',
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
      fx: (n, at, o) => fx.fx(vfxKey(u.id, n), at, o),
      projectile: (n, from, to, o) => fx.callProjectile(vfxKey(u.id, n), from, to, o),
      beam: (n, from, to, o) => fx.callBeam(vfxKey(u.id, n), from, to, o),
      rift: (at, ts, onHit, o) => fx.callRift(u.id, this.rigs[u.id], at, ts, onHit, o),
      elementRain: (ts, onHit, o) => fx.callElementRain(ts, onHit, o),
      wait: ms => new Promise(res => this.time.delayedCall(ms, res)),
      // camera shake, damped: the skills ask for up to 0.016, harsh on a small field
      shake: (ms, intensity) => { this.cameras.main.shake(ms, Math.min(intensity * 0.45, 0.006)); },
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
      const dir = u.side === 'ally' ? 1 : -1;
      const foe = this.combatH.foe(u, this.units);
      const stop = Math.max(u.reach, STATUE_GAP);
      const atStatue = dir > 0 ? u.root.x >= ENEMY_STATUE - stop : u.root.x <= ALLY_STATUE + stop;
      let moving = false;
      const held = u.stop > 0;
      if (held) u.stop -= dt;
      u.ult = Math.max(0, u.ult - dt);
      const frozen = held || this.status.has(u, 'freeze');
      for (const k of PRIORITY) u.cd[k] -= dt;
      u.busy -= dt;
      if (frozen) {
        // held in the ice
      } else if (foe || atStatue) {
        const slot = u.busy <= 0 ? PRIORITY.find(k => u.cd[k] <= 0) : undefined;
        if (slot) this.attack(u, foe, slot);
      } else {
        moving = true;
      }
      // walkers speed up and slow down with their walk blend (feet and ground stay in step), and
      // coast the last bit of it when they stop; flyers glide at a steady speed
      if (u.fly) { if (moving) u.root.x += dir * dt * FLY_SPEED; }
      else if (!frozen && (moving || u.rig.walk > 0.02)) u.root.x += dir * dt * u.rig.walkSpeed(SCALE) * PACE * u.rig.walk;
      if (frozen) u.rig.update(0, u.fly ? 'fly' : 'idle');
      else if (u.fly) u.rig.update(dt * (u.busy > 0 ? u.anim : 1), 'fly');
      else u.rig.update(moving ? dt * PACE : dt * (u.busy > 0 ? u.anim : 1), moving ? 'walk' : 'idle');
      const alt = u.fly ? u.alt + 8 * Math.sin(u.t * 2.4) : 0;
      if (u.rig.stomps !== (this.stompSeen.get(u) ?? 0)) { this.stompSeen.set(u, u.rig.stomps); this.stompPuff(u, alt); }
      u.body.setY(-alt / SCALE - u.rig.air);
      u.body.setX((u.side === 'ally' ? -u.kick : u.kick) / u.root.scaleX);
      u.shadow.setScale(u.fly ? 0.7 : 1);
      u.root.setDepth(5 + u.y / 1000 + (u.fly ? 1 : 0));
      u.bar.clear().setDepth(4000);
      {   // always shown, full or not
        const w = 90, x = u.root.x - w / 2, y = this.head(u) - (u.fly ? 0 : 10);
        u.bar.fillStyle(0x000000, 0.6).fillRoundedRect(x - 2, y - 2, w + 4, 11, 4)
          .fillStyle(u.side === 'ally' ? 0x3dd44f : 0xe8433a, 1).fillRoundedRect(x, y, w * Math.max(0, u.hp / u.maxHp), 7, 3);
      }
    }
    this.units = this.units.filter(o => !o.dead);
  }
}

export async function createBattle(parent: HTMLElement, events: BattleEvents): Promise<import('./types').BattleApi> {
  const list = await Promise.all(SPECIES.map(id => fetch(rigUrl(id)).then(r => r.json() as Promise<RigData>)));
  const rigs = Object.fromEntries(SPECIES.map((id, i) => [id, list[i]])) as Record<SpeciesId, RigData>;
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
