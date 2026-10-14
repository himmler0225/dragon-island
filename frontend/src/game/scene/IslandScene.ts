// The archipelago: ocean, the islands (one per screen, side by side), the dragons on them, and
// every visual effect. Talks to React only through bridge.ts.
import * as Phaser from 'phaser';
import { H, ISLANDS, W, islandCentre } from '../config/world';
import type { Point } from '../config/world';
import type { Resource } from '../config/world';
import { gameEvents, setIslandApi, type DragonCommand, type IslandApi } from '../bridge';
import { Dragon } from './Dragon';
import { Island, buildingKey, islandKey, resourceKey } from './Island';
import { oceanFrag } from './ocean';
import { rigTextureKey, type RigData } from '../rig';
import { JAW_SPECIES, NO_VFX, SKILLS, jawKey, jawUrl, skill, vfxKey, vfxUrl } from '../skills';
import { CLOUD_PUFFS, SPECIES, cloudKey, cloudUrl, type SpeciesId } from '../config/species';
import type { SkillActor, SkillCtx, SkillDef, SkillSlot } from '../skills';
import { CombatFx } from './effects/combatFx';
import { AmbientFx } from './effects/ambientFx';

const DRAG_START = 8;
const PAD_X = W, PAD_Y = H / 2;

/** Stand-in target in front of a dragon when no other dragon is on its island. */
class SpotTarget implements SkillActor {
  constructor(private scene: IslandScene, readonly id: SpeciesId, private at: Point, private island: Island) {}
  feet() { return { x: this.at[0], y: this.at[1] + this.island.bob }; }
  chest() { return { x: this.at[0], y: this.at[1] + this.island.bob - 45 }; }
  head() { return { x: this.at[0], y: this.at[1] + this.island.bob - 95 }; }
  hurt() {}
  text(text: string, color?: string) { this.scene.combat.floatText(this.at[0], this.chest().y - 40, text, color); }
}

export class IslandScene extends Phaser.Scene {
  readonly combat: CombatFx;
  readonly ambient: AmbientFx;
  private islands: Island[] = [];
  private dragons: Dragon[] = [];
  private selected: Dragon | null = null;
  private focused = 0;
  private autoWander = true;
  private press: { x: number; scrollX: number } | null = null;
  dragging = false;

  constructor(private rigs: Record<SpeciesId, RigData>) {
    super('island');
    this.combat = new CombatFx(this);
    this.ambient = new AmbientFx(this);
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
    const oceanW = W * 3 + 2 * PAD_X, oceanH = H + 2 * PAD_Y;
    const local = centres.map(([x, y]): Point => [x + PAD_X, y + PAD_Y]);
    this.add.shader(new Phaser.Display.BaseShader('ocean', oceanFrag(oceanW, oceanH, local)), W * 3 / 2, H / 2, oceanW, oceanH).setDepth(0);
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
    const hit = [...this.dragons].sort((a, b) => b.y - a.y).find(d => d.hit(x, y));
    if (hit) return this.select(hit, false);
    const d = this.selected;
    if (d && d.island.free(x, y)) {
      if (shift || d.action === 'fly') d.flyTo(x, y); else d.walkTo(x, y);
    } else if (!this.islands.some(isl => isl.opaqueAt(x, y))) this.ambient.splash(x, y);
  }

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
  runSkill(self: Dragon, def: SkillDef, targets: SkillActor[]) {
    const ctx: SkillCtx = {
      self,
      targets,
      fx: (n, at, opts) => this.combat.fx(vfxKey(self.id, n), at, opts),
      projectile: (n, from, to, opts) => this.combat.callProjectile(vfxKey(self.id, n), from, to, opts),
      wait: ms => new Promise(res => this.time.delayedCall(ms, res)),
      shake: (ms, k) => this.cameras.main.shake(ms, k),
      bite: (at, opts) => this.combat.callBite(self.id, at, opts),
      gust: (from, dir, opts) => this.combat.callGust(from, dir, opts),
      boneRain: (at, opts) => this.combat.callBoneRain(at, opts),
      orb: (from, to, opts) => this.combat.callOrb(from, to, opts),
      splash: (at, opts) => this.combat.callWaterSplash(at, opts),
    };
    void def.run?.(ctx);
  }
}
