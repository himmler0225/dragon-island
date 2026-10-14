// The archipelago: ocean, the islands (one per screen, side by side), the dragons on them, and
// every visual effect. Talks to React only through bridge.ts.
import * as Phaser from 'phaser';
import { H, ISLANDS, W, WORLD_W, islandCentre, type Point, type Resource } from './constants';
import { gameEvents, setIslandApi, type DragonCommand, type IslandApi } from './bridge';
import { Dragon } from './Dragon';
import { Island, buildingKey, islandKey, resourceKey } from './Island';
import { oceanFrag } from './ocean';
import { rigTextureKey, type RigData } from './rig';
import { JAW_SPECIES, NO_VFX, SKILLS, jawKey, jawUrl, skill, vfxKey, vfxUrl, type FxOpts, type SkillActor, type SkillCtx, type SkillDef, type SkillSlot, type Spot } from './skills';
import { CLOUD_PUFFS, SPECIES, cloudKey, cloudUrl, type SpeciesId } from './species';

const DRAG_START = 8;   // px the pointer must move before a press becomes a camera drag
// the canvas fills the whole window (no letterbox): the ocean reaches this far past the world on
// every side so a wide or tall window never shows its edge
const PAD_X = W, PAD_Y = H / 2;

/** Stand-in target in front of a dragon when no other dragon is on its island. */
class SpotTarget implements SkillActor {
  constructor(private scene: IslandScene, readonly id: SpeciesId, private at: Point, private island: Island) {}
  feet() { return { x: this.at[0], y: this.at[1] + this.island.bob }; }
  chest() { return { x: this.at[0], y: this.at[1] + this.island.bob - 45 }; }
  head() { return { x: this.at[0], y: this.at[1] + this.island.bob - 95 }; }
  hurt() {}
  text(text: string, color?: string) { this.scene.floatText(this.at[0], this.chest().y - 40, text, color); }
}

export class IslandScene extends Phaser.Scene {
  private islands: Island[] = [];
  private dragons: Dragon[] = [];
  private selected: Dragon | null = null;
  private focused = 0;
  private autoWander = true;
  private press: { x: number; scrollX: number } | null = null;
  /** True while the pointer is dragging the camera (taps on buildings are ignored then). */
  dragging = false;

  constructor(private rigs: Record<SpeciesId, RigData>) {
    super('island');
  }

  preload() {
    this.load.on('progress', (v: number) => gameEvents.emit('progress', v));
    for (const isl of ISLANDS) {
      this.load.image(islandKey(isl.id), `/islands/${isl.id}.png`);
      for (const b of isl.buildings) this.load.image(buildingKey(b.type, b.level), `/buildings/${b.type}_${b.level}.png`);
    }
    for (const r of ['gold', 'exp', 'stone'] as Resource[]) this.load.image(resourceKey(r), `/ui/res_${r}.png`);
    for (const id of SPECIES) {
      for (const b of this.rigs[id].bones) this.load.image(rigTextureKey(id, b.name), `/dragons/${id}/${b.name}.png`);
      if (this.rigs[id].motion?.rideCloud) {
        for (const part of ['main', ...Array.from({ length: CLOUD_PUFFS }, (_, k) => k + 1)] as ('main' | number)[])
          this.load.image(cloudKey(id, part), cloudUrl(id, part));
      }
      if (SKILLS[id].length && !NO_VFX.includes(id)) for (let n = 1; n <= 8; n++) this.load.image(vfxKey(id, n), vfxUrl(id, n));
      if (JAW_SPECIES.includes(id)) for (const part of ['upper', 'lower'] as const) this.load.image(jawKey(id, part), jawUrl(id, part));
    }
  }

  create() {
    const centres = ISLANDS.map((_, i) => islandCentre(i));
    const oceanW = WORLD_W + 2 * PAD_X, oceanH = H + 2 * PAD_Y;
    const local = centres.map(([x, y]): Point => [x + PAD_X, y + PAD_Y]);
    this.add.shader(new Phaser.Display.BaseShader('ocean', oceanFrag(oceanW, oceanH, local)), WORLD_W / 2, H / 2, oceanW, oceanH).setDepth(0);
    this.makeTextures();
    this.cameras.main.setBounds(-PAD_X, -PAD_Y, oceanW, oceanH);
    this.fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fit, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fit, this));

    this.islands = ISLANDS.map((def, i) => new Island(this, def, i));
    this.islands.forEach(isl => isl.create());
    this.dragons = this.islands.flatMap(isl =>
      [{ dragon: isl.def.dragon, start: isl.def.start }, ...(isl.def.guests ?? [])]
        .map(g => new Dragon(this, isl, g.dragon, this.rigs[g.dragon], isl.toWorld(g.start))));
    this.select(this.dragons[0], true);

    // press + drag sideways pans between islands; a press without drag is a tap
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.press = { x: p.x, scrollX: this.cameras.main.scrollX };
      this.dragging = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.press || !p.isDown) return;
      if (!this.dragging && Math.abs(p.x - this.press.x) > DRAG_START) this.dragging = true;
      const cam = this.cameras.main;
      if (this.dragging) cam.setScroll(this.press.scrollX - (p.x - this.press.x) / cam.zoom, cam.scrollY);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      const wasDrag = this.dragging;
      this.press = null;
      if (wasDrag) {
        this.focusIsland(Math.round((this.cameras.main.midPoint.x - W / 2) / W));
        this.time.delayedCall(0, () => { this.dragging = false; });   // after building handlers ran
        return;
      }
      if (over.length) return;   // a building or resource bubble handled it
      this.tap(p.worldX, p.worldY, (p.event as MouseEvent).shiftKey);
    });

    const byId = (id: SpeciesId) => this.dragons.find(d => d.id === id)!;
    const api: IslandApi = {
      dragonIds: [...SPECIES],
      select: id => this.select(byId(id), true),
      command: (id, cmd: DragonCommand) => byId(id).play(cmd),
      useSkill: (id, slot: SkillSlot) => this.useSkill(byId(id), slot),
      setAutoWander: on => { this.autoWander = on; },
      focusIsland: i => this.focusIsland(i),
    };
    setIslandApi(api);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => setIslandApi(null));
    gameEvents.emit('ready');
  }

  update(_: number, dtMs: number) {
    const dt = dtMs / 1000;
    for (const isl of this.islands) isl.update(dt);
    for (const d of this.dragons) {
      if (this.autoWander && d !== this.selected) d.think(dt);
      d.update(dt);
    }
  }

  // ---- input / camera -----------------------------------------------------------------------

  private tap(x: number, y: number, shift: boolean) {
    // topmost dragon under the pointer (front = larger y)
    const hit = [...this.dragons].sort((a, b) => b.y - a.y).find(d => d.hit(x, y));
    if (hit) return this.select(hit, false);
    const d = this.selected;
    if (d && d.island.free(x, y)) {
      if (shift || d.action === 'fly') d.flyTo(x, y); else d.walkTo(x, y);
    } else if (!this.islands.some(isl => isl.opaqueAt(x, y))) this.splash(x, y);
  }

  /** Canvas resized: the whole island (W x H) stays in view, the extra room shows more ocean. */
  private fit() {
    const cam = this.cameras.main, { width, height } = this.scale;
    cam.setSize(width, height).setZoom(Math.min(width / W, height / H));
    cam.centerOn(this.islands[this.focused]?.cx ?? islandCentre(this.focused)[0], H / 2);
  }

  private focusIsland(i: number) {
    this.focused = Phaser.Math.Clamp(i, 0, this.islands.length - 1);
    this.cameras.main.pan(this.islands[this.focused].cx, H / 2, 600, 'Sine.easeInOut');
    gameEvents.emit('island', this.focused);
  }

  private select(d: Dragon, pan: boolean) {
    this.selected?.ring.setVisible(false);
    this.selected = d;
    d.ring.setVisible(true);
    if (pan || d.island.index !== this.focused) this.focusIsland(d.island.index);
    gameEvents.emit('select', d.id);
  }

  onAction(d: Dragon) { gameEvents.emit('action', { id: d.id, action: d.action }); }

  collected(resource: Resource, amount: number, x: number, y: number) {
    const color = resource === 'gold' ? '#ffd75e' : resource === 'exp' ? '#8fd8ff' : '#9dffcf';
    this.floatText(x, y, `+${amount}`, color);
    gameEvents.emit('collect', { resource, amount });
  }

  // ---- skills -------------------------------------------------------------------------------

  private useSkill(d: Dragon, slot: SkillSlot) {
    const def = skill(d.id, slot);
    if (d !== this.selected) this.select(d, false);
    const mates = this.dragons.filter(o => o.island === d.island);
    const others = mates.filter(o => o !== d);
    let targets: SkillActor[];
    if (def.target === 'team') targets = mates;
    else if (others.length) {
      const nearest = [...others].sort((a, b) => Math.hypot(a.x - d.x, a.y - d.y) - Math.hypot(b.x - d.x, b.y - d.y))[0];
      targets = def.target === 'enemy' ? [nearest] : others;
    } else {
      // alone on its island: strike a spot in front of it
      targets = [new SpotTarget(this, d.id, d.island.nearPoint([d.x, d.y], 190 * d.dir), d.island)];
    }
    d.useSkill(slot, targets);
  }

  /** Called by a dragon when its blow lands. */
  runSkill(self: Dragon, def: SkillDef, targets: SkillActor[]) {
    const ctx: SkillCtx = {
      self,
      targets,
      fx: (n, at, opts) => this.fx(vfxKey(self.id, n), at, opts),
      projectile: (n, from, to, opts) => this.projectile(vfxKey(self.id, n), from, to, opts),
      wait: ms => new Promise(res => this.time.delayedCall(ms, res)),
      shake: (ms, k) => this.cameras.main.shake(ms, k),
      bite: (at, opts) => this.bite(self.id, at, opts),
      gust: (from, dir, opts) => this.gust(from, dir, opts),
      boneRain: (at, opts) => this.boneRain(at, opts),
      orb: (from, to, opts) => this.orb(from, to, opts),
      splash: (at, opts) => this.waterSplash(at, opts),
    };
    void def.run?.(ctx);
  }

  /** A glowing effect image (additive: black is transparent) that fades in, holds and fades out. */
  fx(key: string, at: Spot, o: FxOpts = {}) {
    const scale = o.scale ?? 0.5, dur = o.dur ?? 600, hold = o.hold ?? 0;
    const img = this.add.image(at.x, at.y, key).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0)
      .setDepth(o.ground ? 4 : 20).setFlipX(!!o.flipX).setRotation(o.angle ?? 0);
    if (o.anchor === 'bottom') img.setOrigin(0.5, 0.95);
    if (o.tint !== undefined) img.setTint(o.tint);
    const sy = o.ground ? 0.42 : 1;   // ground effects lie flat in the 3/4 view
    img.setScale(scale * 0.7, scale * 0.7 * sy);
    const fadeIn = Math.min(160, dur * 0.25), total = dur + hold;
    this.tweens.add({ targets: img, alpha: 1, scaleX: scale, scaleY: scale * sy, duration: fadeIn, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: img, alpha: 0, scaleX: scale * 1.08, scaleY: scale * 1.08 * sy, delay: total - dur * 0.35,
      duration: dur * 0.35, ease: 'Sine.easeIn', onComplete: () => img.destroy() });
    if (o.spin) this.tweens.add({ targets: img, rotation: img.rotation + o.spin, duration: total });
  }

  private projectile(key: string, from: Spot, to: Spot, o: { dur?: number; scale?: number; tint?: number; rotate?: boolean; flipX?: boolean } = {}) {
    return new Promise<void>(res => {
      const img = this.add.image(from.x, from.y, key).setBlendMode(Phaser.BlendModes.ADD).setDepth(21)
        .setScale(o.scale ?? 0.4).setFlipX(!!o.flipX)
        .setRotation(o.rotate === false ? 0 : Math.atan2(to.y - from.y, to.x - from.x));   // art points right
      if (o.tint !== undefined) img.setTint(o.tint);
      this.tweens.add({ targets: img, x: to.x, y: to.y, duration: o.dur ?? 400, ease: 'Sine.easeIn',
        onComplete: () => { img.destroy(); res(); } });
    });
  }

  /** Giant jaws: open wide above and below `at`, pause, snap shut with a flash; resolves at the snap. */
  private bite(id: SpeciesId, at: Spot, o: { scale?: number; tint?: number } = {}) {
    const s = o.scale ?? 1, tint = o.tint ?? 0xb050ff;
    const drawn = this.textures.exists(jawKey(id, 'upper'));
    let upper: Phaser.GameObjects.Image, lower: Phaser.GameObjects.Image, k: number, open: number, shut: number;
    if (drawn) {
      // drawn glowing jaws (additive): the fang tips meet at `at`
      upper = this.add.image(at.x, at.y, jawKey(id, 'upper')).setOrigin(0.5, 0.92).setBlendMode(Phaser.BlendModes.ADD);
      lower = this.add.image(at.x, at.y, jawKey(id, 'lower')).setOrigin(0.5, 0.08).setBlendMode(Phaser.BlendModes.ADD);
      k = (300 / upper.width) * s; open = 70 * s; shut = -14 * s;
    } else {
      upper = this.add.image(at.x, at.y, 'fangs').setOrigin(0.5, 0.15);
      lower = this.add.image(at.x, at.y, 'fangs').setOrigin(0.5, 0.85).setFlipY(true);
      k = s; open = 140 * s; shut = 46 * s;
    }
    upper.setY(at.y - open * 0.8).setScale(0.6 * k).setAlpha(0).setDepth(22);
    lower.setY(at.y + open * 0.8).setScale(0.6 * k).setAlpha(0).setDepth(22);
    const glow = this.add.image(at.x, at.y, 'puff').setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setAlpha(0).setScale(4 * s).setDepth(21);
    return new Promise<void>(res => {
      // appear, gaping open
      this.tweens.add({ targets: [upper, lower], alpha: 1, scale: k, duration: 220, ease: 'Back.easeOut' });
      this.tweens.add({ targets: glow, alpha: 0.5, duration: 260 });
      this.tweens.add({ targets: upper, y: at.y - open, duration: 260, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: lower, y: at.y + open, duration: 260, ease: 'Sine.easeOut' });
      // ...then snap shut
      this.time.delayedCall(420, () => {
        this.tweens.add({ targets: upper, y: at.y - shut, duration: 110, ease: 'Quad.easeIn' });
        this.tweens.add({ targets: lower, y: at.y + shut, duration: 110, ease: 'Quad.easeIn', onComplete: () => {
          glow.setAlpha(1).setScale(7 * s);
          this.tweens.add({ targets: glow, alpha: 0, scale: 10 * s, duration: 400, onComplete: () => glow.destroy() });
          this.tweens.add({ targets: [upper, lower], alpha: 0, delay: 350, duration: 300, onComplete: () => { upper.destroy(); lower.destroy(); } });
          res();
        } });
      });
    });
  }

  /** Three crescent wind waves rolling forward and widening, kicking up dust along the ground. */
  private gust(from: Spot, dir: 1 | -1, o: { reach?: number; scale?: number; tint?: number } = {}) {
    const reach = o.reach ?? 320, s = o.scale ?? 1;
    for (let k = 0; k < 4; k++) {
      const w = this.add.image(from.x, from.y + (k % 2 ? 14 : -6) * s, 'gust').setFlipX(dir < 0).setTint(o.tint ?? 0xffffff)
        .setScale(0.45 * s, 0.6 * s).setAlpha(0).setDepth(21);
      this.tweens.add({ targets: w, alpha: { from: 0.95, to: 0 }, x: from.x + dir * reach, scaleX: 1.2 * s, scaleY: 2.1 * s,
        delay: k * 80, duration: 700, ease: 'Sine.easeOut', onComplete: () => w.destroy() });
    }
    for (let k = 0; k < 7; k++) {   // speed streaks
      const y = from.y + Phaser.Math.Between(-60, 70) * s;
      const line = this.add.rectangle(from.x, y, 70 * s, 4, 0xffffff, 0.85).setOrigin(dir > 0 ? 0 : 1, 0.5).setDepth(21);
      this.tweens.add({ targets: line, x: from.x + dir * reach * 1.1, scaleX: 1.8, alpha: 0,
        delay: 40 + k * 45, duration: 500, ease: 'Sine.easeOut', onComplete: () => line.destroy() });
    }
    for (let k = 0; k < 8; k++) {   // dust swept along
      const p = this.add.image(from.x + dir * k * 30 * s, from.y + 60 * s + Phaser.Math.Between(-8, 8), 'puff')
        .setTint(0xe8dcb8).setAlpha(0).setScale(0.8 * s).setDepth(4);
      this.tweens.add({ targets: p, alpha: { from: 0.6, to: 0 }, x: p.x + dir * reach * 0.8, scale: 2.4 * s,
        delay: 60 + k * 40, duration: 700, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
    return new Promise<void>(res => this.time.delayedCall(330, res));
  }

  /** Bones falling from the sky onto `at`, bouncing and fading; resolves at the first impact. */
  private boneRain(at: Spot, o: { count?: number; scale?: number } = {}) {
    const n = o.count ?? 6, s = o.scale ?? 1;
    for (let k = 0; k < n; k++) {
      const x = at.x + Phaser.Math.Between(-70, 70) * s, y = at.y + Phaser.Math.Between(-14, 10) * s;
      const b = this.add.image(x - 40 * s, y - 420, 'bone').setScale(Phaser.Math.FloatBetween(0.7, 1.2) * s)
        .setRotation(Math.random() * 6).setDepth(22);
      this.tweens.add({ targets: b, x, y, rotation: b.rotation + 5, delay: k * 70, duration: 420, ease: 'Quad.easeIn',
        onComplete: () => {
          this.tweens.add({ targets: b, y: y - 22 * s, x: x + Phaser.Math.Between(-20, 20), rotation: b.rotation + 1.5,
            duration: 220, yoyo: true, ease: 'Sine.easeOut' });
          this.tweens.add({ targets: b, alpha: 0, delay: 700, duration: 300, onComplete: () => b.destroy() });
        } });
    }
    return new Promise<void>(res => this.time.delayedCall(420, res));
  }

  /** Glowing water orb flying from -> to, leaving a trail of droplets. */
  private orb(from: Spot, to: Spot, o: { scale?: number; tint?: number; dur?: number } = {}) {
    const s = o.scale ?? 1, tint = o.tint ?? 0x6fd2ff, dur = o.dur ?? 380;
    const core = this.add.image(from.x, from.y, 'puff').setScale(1.4 * s).setTint(0xffffff).setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
    const glow = this.add.image(from.x, from.y, 'puff').setScale(2.6 * s).setTint(tint).setAlpha(0.8).setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
    const trail = this.time.addEvent({ delay: 25, loop: true, callback: () => {
      const d = this.add.image(core.x, core.y, 'puff').setScale(1.4 * s).setTint(tint).setAlpha(0.6).setDepth(20).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: d, scale: 0.2 * s, alpha: 0, duration: 260, onComplete: () => d.destroy() });
    } });
    return new Promise<void>(res => {
      this.tweens.add({ targets: [core, glow], x: to.x, y: to.y, duration: dur, ease: 'Sine.easeIn', onComplete: () => {
        trail.remove(); core.destroy(); glow.destroy(); res();
      } });
    });
  }

  /** Water splash: a burst of droplets, foam rings on the ground, and with `big` a falling pillar. */
  private waterSplash(at: Spot, o: { scale?: number; big?: boolean } = {}) {
    const s = o.scale ?? 1;
    for (let k = 0; k < 12; k++) {
      const a = -Math.PI * (0.1 + 0.8 * Math.random()), v = (60 + Math.random() * 70) * s;
      const d = this.add.image(at.x, at.y, 'puff').setScale((0.5 + Math.random() * 0.5) * s).setTint(0x8fdcff).setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: d, x: at.x + Math.cos(a) * v, y: at.y + Math.sin(a) * v * 0.8, alpha: 0, duration: 500, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
    }
    for (let k = 0; k < 2; k++) {
      const ring = this.add.ellipse(at.x, at.y + 30 * s, 60 * s, 22 * s).setStrokeStyle(4, 0xe0f6ff, 0.9).setDepth(4).setScale(0.3);
      this.tweens.add({ targets: ring, scale: 2 + k, alpha: 0, delay: k * 120, duration: 700, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    }
    if (o.big) {
      const col = this.add.rectangle(at.x, at.y - 260 * s, 70 * s, 300 * s, 0x6fd2ff, 0.75).setDepth(21).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 0);
      col.setScale(1, 0);
      this.tweens.add({ targets: col, scaleY: 1, duration: 180, ease: 'Quad.easeIn', yoyo: true, hold: 200, onComplete: () => col.destroy() });
    }
  }

  floatText(x: number, y: number, text: string, color = '#ffe27a') {
    const t = this.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold',
      color, stroke: '#0b1a2a', strokeThickness: 5 }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 300, duration: 1100, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }

  // ---- ambient effects ----------------------------------------------------------------------

  private makeTextures() {
    const g = this.make.graphics({}, false);
    // wind crescent (bulges to the right) and a cartoon bone
    // thick wind crescent with a softer inner band and an outline so it reads on bright sand too
    g.lineStyle(26, 0x6b5a3a, 0.35).beginPath().arc(24, 80, 70, -1.1, 1.1).strokePath();
    g.lineStyle(18, 0xffffff, 1).beginPath().arc(24, 80, 70, -1.1, 1.1).strokePath();
    g.lineStyle(8, 0xffffff, 0.55).beginPath().arc(4, 80, 70, -0.95, 0.95).strokePath();
    g.generateTexture('gust', 110, 160); g.clear();
    g.fillStyle(0x3a2a14).fillRoundedRect(8, 12, 48, 12, 5).fillCircle(9, 12, 8).fillCircle(9, 24, 8).fillCircle(55, 12, 8).fillCircle(55, 24, 8);
    g.fillStyle(0xf1e3bd).fillRoundedRect(10, 14, 44, 8, 4).fillCircle(9, 12, 6).fillCircle(9, 24, 6).fillCircle(55, 12, 6).fillCircle(55, 24, 6);
    g.generateTexture('bone', 64, 36); g.clear();
    g.fillStyle(0xffffff).fillRect(5, 0, 2, 12).fillRect(0, 5, 12, 2).fillCircle(6, 6, 2);
    g.generateTexture('spark', 12, 12); g.clear();
    g.fillStyle(0xffffff).fillCircle(8, 8, 8);
    g.generateTexture('puff', 16, 16); g.clear();
    // one row of a giant jaw: dark gum arch with fangs hanging down (flipped for the lower jaw)
    const JW = 240, JH = 96;
    g.fillStyle(0x1b0828).fillEllipse(JW / 2, 10, JW, 40);
    g.lineStyle(4, 0xc58cff, 1).strokeEllipse(JW / 2, 10, JW - 4, 36);
    const fangs = 9;
    for (let k = 0; k < fangs; k++) {
      const u = k / (fangs - 1), x = 16 + u * (JW - 32);
      const long = k === 1 || k === fangs - 2;               // canines
      const len = (long ? 80 : 44) * (0.75 + 0.25 * Math.sin(Math.PI * u));
      const w = long ? 22 : 16;
      const y0 = 14 + 8 * Math.sin(Math.PI * u);
      g.fillStyle(0xf4eeff).fillTriangle(x - w / 2, y0, x + w / 2, y0, x, Math.min(JH - 2, y0 + len));
      g.fillStyle(0xcab8e8).fillTriangle(x + w / 6, y0, x + w / 2, y0, x, Math.min(JH - 2, y0 + len));
    }
    g.generateTexture('fangs', JW, JH); g.destroy();
  }

  private splash(x: number, y: number) {
    for (let k = 0; k < 3; k++) {
      const ring = this.add.ellipse(x, y, 40, 16).setStrokeStyle(2, 0xffffff, 0.8).setDepth(1).setScale(0.2);
      this.tweens.add({ targets: ring, scale: 2.2 + k * 0.6, alpha: 0, duration: 1200, delay: k * 180, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    }
  }

  footDust(d: Dragon) {
    const s = d.scale;
    for (let k = 0; k < 3; k++) {
      const p = this.add.image(d.x + Phaser.Math.Between(-30, 30) * s, d.feet().y + Phaser.Math.Between(-4, 4) * s, 'puff')
        .setTint(0xe6f2c8).setAlpha(0.55).setScale(0.8 * s).setDepth(4);
      this.tweens.add({ targets: p, y: p.y - 10 * s, x: p.x - d.dir * 14 * s, scale: 2.6 * s, alpha: 0,
        duration: 650, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
  }

  /** A small cloud puff left behind a cloud-riding dragon; drifts back and fades. */
  cloudPuff(d: Dragon) {
    const s = d.scale, { x, y } = d.feet();
    const back = -d.dir;   // opposite to the way it faces
    const p = this.add.image(x + back * Phaser.Math.Between(60, 110) * s, y - (d.height - 4) * s + Phaser.Math.Between(-6, 6) * s,
      cloudKey(d.id, Phaser.Math.Between(1, CLOUD_PUFFS))).setScale(0.35 * s).setAlpha(0.9).setDepth(d.root.depth - 0.01).setFlipX(back > 0);
    this.tweens.add({ targets: p, x: p.x + back * 120 * s, y: p.y + 10 * s, scale: 0.55 * s, alpha: 0,
      duration: 1100, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
  }

  /** Dust blown outward by the wings on take-off and landing. */
  dustRing(d: Dragon) {
    const s = d.scale, { x, y } = d.feet();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const p = this.add.image(x + Math.cos(a) * 20 * s, y + Math.sin(a) * 6 * s, 'puff')
        .setTint(0xe6f2c8).setAlpha(0.6).setScale(0.9 * s).setDepth(4);
      this.tweens.add({ targets: p, x: p.x + Math.cos(a) * 90 * s, y: p.y + Math.sin(a) * 26 * s - 6 * s,
        scale: 2.4 * s, alpha: 0, duration: 750, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
  }

  /** A "z" drifting up from a sleeping dragon's head. */
  sleepZ(d: Dragon) {
    const p = d.head();
    const z = this.add.text(p.x, p.y, 'z', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold',
      color: '#dff4ff', stroke: '#16354f', strokeThickness: 4 }).setOrigin(0.5).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: z, alpha: { from: 0, to: 0.95 }, duration: 400, yoyo: true, hold: 900 });
    this.tweens.add({ targets: z, x: z.x + 18 * d.dir, y: z.y - 46, scale: 1.5, duration: 1700, ease: 'Sine.easeOut', onComplete: () => z.destroy() });
  }
}
