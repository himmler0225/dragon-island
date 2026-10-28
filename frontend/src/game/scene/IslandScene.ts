// The archipelago: ocean, islands, dragons, effects.
import * as Phaser from 'phaser';
import { H, ISLANDS, W, islandCentre } from '../config/world';
import type { Point } from '../config/world';
import type { Resource } from '../config/world';
import { gameEvents, setIslandApi, type DragonCommand, type IslandApi } from '../bridge';
import { Dragon } from './Dragon';
import { SpotTarget } from './SpotTarget';
import { Island, LAMP_KEY, grassKey, NEST_KEY, buildingKey, eggKey, islandKey, resourceKey } from './Island';
import { oceanFrag } from './ocean';
import { DayNight, hcmHour } from './dayNight';
import { BALLOON_TEXTURES, FoodBalloons } from './foodBalloon';
import { RAIN_TEXTURES, Weather } from './weather';
import { rigTextureKey, type RigData } from '../rig';
import { COMBOS, JAW_SPECIES, NO_VFX, vfxNumbers, SKILLS, combosFor, jawKey, jawUrl, skill, vfxKey, vfxUrl } from '../skills';
import { CLOUD_PUFFS, SPECIES, cloudKey, cloudUrl, type SpeciesId } from '../config/species';
import { assetUrl } from '../config/assets';
import type { SkillActor, SkillCtx, SkillDef, SkillSlot } from '../skills';
import { CombatFx } from './effects/combatFx';
import { AmbientFx } from './effects/ambientFx';
import { StatusFx, loadStatusTextures } from './effects/statusFx';
import { statusFromText } from '../skills/status';

const DRAG_START = 8;
const PAD_X = W, PAD_Y = H / 2;
// default view is this much closer than "whole island fits" so the dragons read clearly; the island
// art's outer ring of sea and cliffs is what gets cropped
const ZOOM_IN = 1.25;



export class IslandScene extends Phaser.Scene {
  readonly combat: CombatFx;
  private status!: StatusFx;
  readonly ambient: AmbientFx;
  private islands: Island[] = [];
  private dragons: Dragon[] = [];
  private selected: Dragon | null = null;
  private focused = 0;
  private autoWander = true;
  private press: { x: number; scrollX: number } | null = null;
  dragging = false;
  dayNight!: DayNight;
  private balloons!: FoodBalloons;
  weather!: Weather;
  private fishT = 4;
  /** 0 day .. 1 night, from dayNight (lamps on the islands follow it) */
  night = 0;

  constructor(private rigs: Record<SpeciesId, RigData>) {
    super('island');
    this.combat = new CombatFx(this);
    this.ambient = new AmbientFx(this);
  }

  preload() {
    this.load.on('progress', (v: number) => gameEvents.emit('progress', v));
    loadStatusTextures(this.load);
    for (const isl of ISLANDS) {
      this.load.image(islandKey(isl.id), assetUrl(`islands/${isl.id}.png`));
      for (const b of isl.buildings) this.load.image(buildingKey(b.type, b.level), assetUrl(`buildings/${b.type}_${b.level}.png`));
    }
    for (const r of ['gold', 'exp', 'stone'] as Resource[]) this.load.image(resourceKey(r), assetUrl(`ui/res_${r}.png`));
    this.load.image(NEST_KEY, assetUrl('eggs/nest.png'));
    this.load.image(LAMP_KEY, assetUrl('props/lamp.png'));
    for (let n = 1; n <= 6; n++) this.load.image(grassKey(n), assetUrl(`props/grass_${n}.png`));
    for (const [k, url] of BALLOON_TEXTURES) this.load.image(k, url);
    for (let n = 1; n <= 4; n++) this.load.image(`hunger_${n}`, assetUrl(`balloon/hunger_${n}.png`));
    for (const k of RAIN_TEXTURES) this.load.image(k, assetUrl(`weather/${k}.png`));
    for (let l = 1; l <= 10; l++) this.load.image(eggKey(l), assetUrl(`eggs/egg_${l}.png`));
    for (const id of SPECIES) {
      for (const b of this.rigs[id].bones) this.load.image(rigTextureKey(id, b.name), assetUrl(`dragons/${id}/${b.name}.png`));
      if (this.rigs[id].motion?.rideCloud) {
        for (const part of ['main', ...Array.from({ length: CLOUD_PUFFS }, (_, k) => k + 1)] as ('main' | number)[])
          this.load.image(cloudKey(id, part), cloudUrl(id, part));
      }
      if (SKILLS[id].length && !NO_VFX.includes(id)) for (const n of vfxNumbers(id)) this.load.image(vfxKey(id, n), vfxUrl(id, n));
      if (JAW_SPECIES.includes(id)) for (const part of ['upper', 'lower'] as const) this.load.image(jawKey(id, part), jawUrl(id, part));
    }
  }

  create() {
    this.status = new StatusFx(this, this.combat);
    const centres = ISLANDS.map((_, i) => islandCentre(i));
    const oceanW = W * 3 + 2 * PAD_X, oceanH = H + 2 * PAD_Y;
    const local = centres.map(([x, y]): Point => [x + PAD_X, y + PAD_Y]);
    const ocean = this.add.shader(new Phaser.Display.BaseShader('ocean', oceanFrag(oceanW, oceanH, local), undefined, { night: { type: '1f', value: 0 } }),
      W * 3 / 2, H / 2, oceanW, oceanH).setDepth(0);
    // day / night by the real time in Ho Chi Minh City, refreshed every 20 s
    this.dayNight = new DayNight(this, W * 3 / 2, H / 2, oceanW, oceanH, ocean);
    this.weather = new Weather(this, W * 3 / 2, H / 2, oceanW, oceanH, (x, y) => this.onSea(x, y));
    const tick = () => {
      const s = this.dayNight.update();
      gameEvents.emit('sky', { hour: this.dayNight.override ?? hcmHour(), night: s.night, weather: this.weather.kind });
    };
    tick();
    this.time.addEvent({ delay: 20000, loop: true, callback: tick });
    this.ambient.makeTextures();
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
    this.balloons = new FoodBalloons(this, this.islands, isl => this.dragons.filter(d => d.island === isl));

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
        this.time.delayedCall(0, () => { this.dragging = false; });
        return;
      }
      if (over.length) return;
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
      combos: id => this.availableCombos(id),
      canFly: id => !this.rigs[id].motion?.noFly,
      callBoat: id => { const d = this.dragons.find(o => o.id === id); if (d) this.balloons.call(d.island); },
      hunger: () => Object.fromEntries(this.dragons.map(o => [o.id, o.hunger])),
      useCombo: id => this.useCombo(id),
      setPaused: on => { if (on) this.game.loop.sleep(); else this.game.loop.wake(); },
    };
    setIslandApi(api);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => setIslandApi(null));
    gameEvents.emit('ready');
  }

  update(_: number, dtMs: number) {
    const dt = dtMs / 1000;
    for (const isl of this.islands) {
      isl.update(dt);
      isl.stepGrass(this.dragons.filter(d => d.island === isl && d.height < 5).map(d => d.feet()), dt);
    }
    this.balloons.update(dt);
    this.weather.update(dt);
    // lamps follow the darkest of night and gloomy weather
    this.night = Math.max(this.dayNight.night, this.weather.gloom * 0.9);
    // now and then a fish jumps in the sea in view
    if ((this.fishT -= dt) <= 0) {
      this.fishT = Phaser.Math.FloatBetween(3, 7);
      const v = this.cameras.main.worldView;
      for (let tries = 0; tries < 12; tries++) {
        const x = Phaser.Math.FloatBetween(v.x + 60, v.right - 60), y = Phaser.Math.FloatBetween(v.y + 60, v.bottom - 60);
        if (this.onSea(x, y)) { this.ambient.fishJump({ x, y }); break; }
      }
    }
    for (const d of this.dragons) {
      if (this.autoWander && d !== this.selected) d.think(dt);
      d.update(dt);
    }
  }

  // ---- input / camera -----------------------------------------------------------------------

  private tap(x: number, y: number, shift: boolean) {
    const hit = [...this.dragons].sort((a, b) => b.y - a.y).find(d => d.hit(x, y));
    if (hit) return this.select(hit, false);
    const d = this.selected;
    if (d && d.island.free(x, y)) {
      if (shift || d.action === 'fly') d.flyTo(x, y); else d.walkTo(x, y);
    } else if (!this.islands.some(isl => isl.opaqueAt(x, y))) this.ambient.splash(x, y);
  }

  /** Open water (not on any island's art), with a margin so things stay off the cliffs. */
  onSea(x: number, y: number) {
    return !this.islands.some(isl => isl.opaqueAt(x, y) || isl.opaqueAt(x, y - 40) || isl.opaqueAt(x + 40, y) || isl.opaqueAt(x - 40, y));
  }

  private fit() {
    const cam = this.cameras.main, { width, height } = this.scale;
    cam.setSize(width, height).setZoom(Math.min(width / W, height / H) * ZOOM_IN);
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
    this.combat.floatText(x, y, `+${amount}`, color);
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
      targets = [new SpotTarget(this, d.id, d.island.nearPoint([d.x, d.y], 190 * d.dir), d.island)];
    }
    d.useSkill(slot, targets);
  }

  /** Called by a dragon when its blow lands. */
  private ctxFor(self: Dragon, raw: SkillActor[]): SkillCtx {
    const targets = raw.map(t => this.withStatus(self.id, t));
    return {
      self,
      targets,
      fx: (n, at, opts) => this.combat.fx(vfxKey(self.id, n), at, opts),
      projectile: (n, from, to, opts) => this.combat.callProjectile(vfxKey(self.id, n), from, to, opts),
      rift: (at, ts, onHit, opts) => this.combat.callRift(self.id, this.rigs[self.id], at, ts, onHit, opts),
      elementRain: (ts, onHit, opts) => this.combat.callElementRain(ts, onHit, opts),
      beam: (n, from, to, opts) => this.combat.callBeam(vfxKey(self.id, n), from, to, opts),
      wait: ms => new Promise(res => this.time.delayedCall(ms, res)),
      // camera shake: intensity is Phaser's scale (0.001 barely visible, 0.01 harsh). The skills
      // ask for 0.004-0.016, which reads as harsh on a small island, so damp it.
      shake: (ms, intensity) => { this.cameras.main.shake(ms, Math.min(intensity * 0.45, 0.006)); },
      bite: (at, opts) => this.combat.callBite(self.id, at, opts),
      gust: (from, dir, opts) => this.combat.callGust(from, dir, opts),
      boneRain: (at, opts) => this.combat.callBoneRain(at, opts),
      orb: (from, to, opts) => this.combat.callOrb(from, to, opts),
      splash: (at, opts) => this.combat.callWaterSplash(at, opts),
    };
  }

  /** The target as the skill sees it: status words it prints (and Hắc Long's curse etc. on hits)
   *  put the status effect on the dragon. Visual only on the islands. */
  private withStatus(by: SpeciesId, t: SkillActor): SkillActor {
    return {
      id: t.id, chest: () => t.chest(), feet: () => t.feet(), head: () => t.head(), hurt: () => t.hurt(),
      push: t.push ? dx => t.push!(dx) : undefined,
      text: (text, color) => {
        t.text(text, color);
        const kind = statusFromText(by, text);
        if (kind) this.status.apply(t, t, kind);
      },
    };
  }

  runSkill(self: Dragon, def: SkillDef, targets: SkillActor[]) {
    void def.run?.(this.ctxFor(self, targets));
  }

  /** Combos whose two dragons are both on `id`'s island (the HUD shows a button for each). */
  private availableCombos(id: SpeciesId) {
    const d = this.dragons.find(o => o.id === id);
    if (!d) return [];
    return combosFor(id).filter(c => c.pair.every(p => this.dragons.some(o => o.id === p && o.island === d.island))).map(c => c.id);
  }

  /** Hợp Kích: both dragons strike together at every other dragon on their island. */
  private useCombo(comboId: string) {
    const combo = COMBOS.find(c => c.id === comboId);
    if (!combo) return;
    const [lead, partner] = combo.pair.map(p => this.dragons.find(o => o.id === p)!);
    if (!lead || !partner || lead.island !== partner.island) return;
    const enemies: SkillActor[] = this.dragons.filter(o => o.island === lead.island && o !== lead && o !== partner);
    const targets = enemies.length ? enemies
      : [new SpotTarget(this, lead.id, lead.island.nearPoint([lead.x, lead.y], 190 * lead.dir), lead.island)];
    if (lead.action === 'strike' || partner.action === 'strike') return;
    lead.comboStrike(combo.anim, targets[0], () => void combo.run(this.ctxFor(lead, targets), this.ctxFor(partner, targets), targets));
    partner.comboStrike(combo.anim, targets[0]);
  }
}
