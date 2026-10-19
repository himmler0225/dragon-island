// One floating island: its art, shoreline waves, walkable ground, buildings and their production.
import * as Phaser from 'phaser';
import {
  BUILDING_SCALE, PRODUCES, PRODUCTION,
} from '../config/economy';
import {
  clamp01, islandCentre,
  type Point, type IslandDef, type Resource,
} from '../config/world';
import type { BuildingType } from '../config/islands';
import type { IslandScene } from './IslandScene';
import { gameEvents, getEggLevel } from '../bridge';

export const islandKey = (id: string) => `island_${id}`;
export const buildingKey = (type: BuildingType, level: number) => `building_${type}_${level}`;
export const resourceKey = (r: Resource) => `res_${r}`;
export const NEST_KEY = 'egg_nest';
export const eggKey = (level: number) => `egg_${level}`;
export const LAMP_KEY = 'prop_lamp';
export const grassKey = (n: number) => `prop_grass_${n}`;
/** lamp art layout (shares of the image): foot of the post, lantern centre; height = world px */
const LAMP = { foot: [0.37, 0.98], lantern: [0.769, 0.52], height: 78 };
const NEST_SCALE = 0.26, EGG_SCALE = 0.26;   // world px per image px (nest.png 480 wide, eggs 320 tall)

interface Building {
  type: BuildingType;
  level: number;
  img: Phaser.GameObjects.Image;
  x: number;          // base (bottom-centre) in the world
  y: number;
  rx: number;         // footprint ellipse, world px
  ry: number;
  ready: boolean;
  timer: number;
  bubble: Phaser.GameObjects.Image;
}

export class Island {
  readonly cx: number;
  readonly cy: number;
  private img!: Phaser.GameObjects.Image;
  private walk!: Phaser.Geom.Polygon;
  private top: number;
  private bottom: number;
  readonly buildings: Building[] = [];
  private mask?: { w: number; sx: number; sy: number; a: Uint8ClampedArray };
  /** things dragons walk around besides buildings (the egg nest) */
  private blockers: { x: number; y: number; rx: number; ry: number }[] = [];
  private nest?: { img: Phaser.GameObjects.Image; egg: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; x: number; y: number };

  constructor(private scene: IslandScene, readonly def: IslandDef, readonly index: number) {
    [this.cx, this.cy] = islandCentre(index);
    const ys = def.walk.map(p => this.toWorld(p)[1]);
    this.top = Math.min(...ys);
    this.bottom = Math.max(...ys);
  }

  create() {
    const { def, scene } = this;
    const key = islandKey(def.id);
    for (let k = 0; k < 3; k++) {
      const ring = scene.add.image(this.cx, this.cy, key).setTintFill(0xffffff).setAlpha(0).setDepth(1)
        .setCrop(0, def.h * 0.35, def.w, def.h * 0.65);
      scene.tweens.add({ targets: ring, scale: { from: def.scale, to: def.scale * 1.07 },
        alpha: { from: 0.45, to: 0 }, duration: 3600, delay: k * 1200, repeat: -1, ease: 'Sine.easeOut' });
    }
    this.img = scene.add.image(this.cx, this.cy, key).setScale(def.scale).setDepth(2);
    scene.tweens.add({ targets: this.img, y: this.cy + 3, duration: 2400 + this.index * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.walk = new Phaser.Geom.Polygon(def.walk.map(p => this.toWorld(p)).flat());
    scene.time.addEvent({ delay: 300, loop: true, callback: () => this.waterSparkle() });

    for (const b of def.buildings) {
      const [x, y] = this.toWorld(b.at);
      const img = scene.add.image(x, y, buildingKey(b.type, b.level)).setOrigin(0.5, 0.97).setScale(BUILDING_SCALE);
      // footprint: most of the base, so dragons (whose bodies are wide) never stand on the building
      const rx = img.displayWidth * 0.5, ry = rx * 0.55;
      const res = PRODUCES[b.type];
      const bubble = scene.add.image(x, y - img.displayHeight - 10, resourceKey(res)).setScale(0.32).setDepth(25).setVisible(false);
      scene.tweens.add({ targets: bubble, y: bubble.y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const building: Building = { type: b.type, level: b.level, img, x, y, rx, ry, ready: false,
        timer: PRODUCTION[res].every[b.level - 1] * (0.3 + 0.7 * Math.random()), bubble };
      img.setInteractive({ pixelPerfect: true, useHandCursor: true }).on('pointerup', () => this.collect(building));
      bubble.setInteractive({ useHandCursor: true }).on('pointerup', () => this.collect(building));
      this.buildings.push(building);
    }
    if (def.nest) this.createNest(def.nest);
    this.createLamps();
    this.createGrass();
  }

  /** Lamps around the edge of the walkable ground; their glow fades in as the island gets dark. */
  private lamps: { post: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; halo: Phaser.GameObjects.Image; x: number; y: number; phase: number }[] = [];
  private createLamps() {
    const { scene, def } = this;
    const pts = def.walk.map(p => this.toWorld(p));
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    // every other corner of the walk area, pulled 12% toward the middle so the lamps stand on grass
    pts.filter((_, k) => k % 2 === 1).forEach(([px, py], k) => {
      const x = px + (cx - px) * 0.12, y = py + (cy - py) * 0.12;
      if (!this.free(x, y, 10)) return;
      // props/lamp.png (tools/slice_props.py): origin on the foot of the post
      const post = scene.add.image(x, y, LAMP_KEY).setOrigin(LAMP.foot[0], LAMP.foot[1]).setScale(LAMP.height / 300);
      // light sits above the day/night tint (depth 900) so it really brightens the dark island
      const halo = scene.add.image(x, y, 'glow').setTint(0xffb860).setBlendMode(Phaser.BlendModes.ADD).setDepth(901).setScale(4.5).setAlpha(0);
      const glow = scene.add.image(x, y, 'glow').setTint(0xffe6a0).setBlendMode(Phaser.BlendModes.ADD).setDepth(902).setScale(1.2).setAlpha(0);
      this.lamps.push({ post, glow, halo, x, y, phase: k * 1.7 });
      this.blockers.push({ x, y, rx: 10, ry: 5 });
    });
  }

  /** Grass tufts scattered on the walkable ground (props/grass_1..6.png: upright -> flat -> springing
   *  back). A dragon standing on one flattens it; when it leaves, the tuft springs back up. */
  private tufts: { img: Phaser.GameObjects.Image; x: number; y: number; f: number; t: number }[] = [];
  private createGrass() {
    if (this.def.id === 'desert') return;   // sand: no grass
    for (let k = 0; k < 26; k++) {
      const [x, y] = this.randomPoint([this.cx, this.cy], 0, false);
      if (!this.free(x, y, 20) || this.tufts.some(t => Math.hypot(t.x - x, t.y - y) < 60)) continue;
      const img = this.scene.add.image(x, y, grassKey(1)).setOrigin(0.5, 0.95).setScale(0.32 * this.depthScale(y));
      this.tufts.push({ img, x, y, f: 0, t: Math.random() });
    }
  }

  /** feet: ground positions of the dragons standing / walking on this island */
  stepGrass(feet: { x: number; y: number }[], dt: number) {
    for (const g of this.tufts) {
      const pressed = feet.some(p => Math.abs(p.x - g.x) < 42 && Math.abs(p.y - (g.y + this.bob)) < 22);
      g.t += dt;
      // pressed: run to the flat frame (3) and stay; free: frames 4, 5 then back to upright (0)
      if (g.t >= 0.07) {
        g.t = 0;
        if (pressed) g.f = Math.min(3, g.f + 1);
        else if (g.f > 0) g.f = g.f >= 5 ? 0 : Math.max(4, g.f + 1);
      }
      g.img.setTexture(grassKey(g.f + 1)).setY(g.y + this.bob).setDepth(5 + g.y / 1000 - 0.0005);
    }
  }

  /** The breeding nest: the current egg sits in it, glowing; tapping it opens Lai Rồng. */
  private createNest(at: Point) {
    const { scene } = this;
    const [x, y] = this.toWorld(at);
    const img = scene.add.image(x, y, NEST_KEY).setOrigin(0.5, 0.95).setScale(NEST_SCALE);
    // the egg stands in the nest's hollow (about a third down the nest image)
    const glow = scene.add.image(x, 0, 'glow').setScale(1.7).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    const egg = scene.add.image(x, 0, eggKey(getEggLevel())).setOrigin(0.5, 0.9).setScale(EGG_SCALE);
    this.nest = { img, egg, glow, x, y };
    scene.tweens.add({ targets: glow, alpha: 0.5, scale: 1.9, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const open = () => { if (!scene.dragging) gameEvents.emit('open', 'breed'); };
    for (const o of [img, egg]) o.setInteractive({ pixelPerfect: true, useHandCursor: true }).on('pointerup', open);
    const off = gameEvents.on('egg', level => {
      egg.setTexture(eggKey(level));
      scene.tweens.add({ targets: egg, scaleX: EGG_SCALE * 1.25, scaleY: EGG_SCALE * 1.25, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
    });
    scene.events.once(Phaser.Scenes.Events.DESTROY, off);
    this.blockers.push({ x, y, rx: img.displayWidth * 0.42, ry: img.displayWidth * 0.2 });
  }

  /** How far the island has bobbed from rest; everything standing on it moves with it. */
  get bob() { return this.img.y - this.cy; }

  update(dt: number) {
    const night = this.scene.night, now = this.scene.time.now / 1000;
    for (const l of this.lamps) {
      const y = l.y + this.bob, flicker = 0.9 + 0.1 * Math.sin(now * 7 + l.phase) * Math.sin(now * 3.1 + l.phase);
      const k = l.post.scaleX;   // the lantern hanging from the post's arm
      const lx = l.x + (LAMP.lantern[0] - LAMP.foot[0]) * l.post.width * k, ly = y + (LAMP.lantern[1] - LAMP.foot[1]) * l.post.height * k;
      l.post.setY(y).setDepth(5 + l.y / 1000);
      l.halo.setPosition(lx, ly + 30).setAlpha(0.32 * night * flicker);
      l.glow.setPosition(lx, ly).setAlpha((0.15 + 0.6 * night) * flicker);
    }
    if (this.nest) {
      const n = this.nest, d = 5 + n.y / 1000, top = n.y + this.bob - n.img.displayHeight * 0.55;
      const rock = Math.sin(this.scene.time.now / 1300) * 0.025;   // the egg rocks very slightly, alive inside
      n.img.setY(n.y + this.bob).setDepth(d);
      n.egg.setY(top).setRotation(rock).setDepth(d + 0.0001);
      n.glow.setPosition(n.x, top - n.egg.displayHeight * 0.45).setDepth(d - 0.0001);
    }
    for (const b of this.buildings) {
      b.img.setY(b.y + this.bob).setDepth(5 + b.y / 1000);
      if (b.ready) continue;
      if ((b.timer -= dt) <= 0) {
        b.ready = true;
        b.bubble.setVisible(true).setScale(0).setAlpha(1);
        this.scene.tweens.add({ targets: b.bubble, scale: 0.32, duration: 250, ease: 'Back.easeOut' });
      }
    }
  }

  private collect(b: Building) {
    if (!b.ready || this.scene.dragging) return;
    const res = PRODUCES[b.type], amount = PRODUCTION[res].amount[b.level - 1];
    b.ready = false;
    b.timer = PRODUCTION[res].every[b.level - 1];
    this.scene.tweens.add({ targets: b.bubble, y: b.bubble.y - 40, alpha: 0, scale: 0.45, duration: 350,
      onComplete: () => b.bubble.setVisible(false).setY(b.y - b.img.displayHeight - 10) });
    this.scene.collected(res, amount, b.x, b.y - b.img.displayHeight * 0.6 + this.bob);
  }

  toWorld([px, py]: Point): Point {
    const { def } = this;
    return [this.cx + (px - def.w / 2) * def.scale, this.cy + (py - def.h / 2) * def.scale];
  }

  toImage(x: number, y: number): Point {
    const { def } = this;
    return [Math.round((x - this.cx) / def.scale + def.w / 2), Math.round((y - this.cy) / def.scale + def.h / 2)];
  }

  /** Farther up the island = smaller. */
  depthScale(y: number) { return 0.93 + 0.12 * clamp01((y - this.top) / (this.bottom - this.top)); }

  contains(x: number, y: number) { return this.walk.contains(x, y); }

  free(x: number, y: number, margin = 34) {
    if (!this.walk.contains(x, y)) return false;
    return [...this.buildings, ...this.blockers].every(b => {
      const dx = (x - b.x) / (b.rx + margin), dy = (y - (b.y - b.ry * 0.5)) / (b.ry + margin * 0.5);
      return dx * dx + dy * dy > 1;
    });
  }

  pathFree(x0: number, y0: number, x1: number, y1: number) {
    for (let k = 1; k <= 16; k++) {
      if (!this.free(x0 + (x1 - x0) * k / 16, y0 + (y1 - y0) * k / 16)) return false;
    }
    return true;
  }

  randomPoint(from: Point, minDist: number, needPath: boolean): Point {
    const b = Phaser.Geom.Polygon.GetAABB(this.walk);
    for (let tries = 0; tries < 300; tries++) {
      const x = Phaser.Math.FloatBetween(b.x, b.right), y = Phaser.Math.FloatBetween(b.y, b.bottom);
      if (Math.hypot(x - from[0], y - from[1]) < minDist || !this.free(x, y)) continue;
      if (!needPath || this.pathFree(from[0], from[1], x, y)) return [x, y];
    }
    return from;
  }

  detour(from: Point, to: Point): Point | null {
    let best: Point | null = null, bestLen = Infinity;
    const b = Phaser.Geom.Polygon.GetAABB(this.walk);
    for (let gx = b.x; gx <= b.right; gx += 30) {
      for (let gy = b.y; gy <= b.bottom; gy += 20) {
        if (!this.free(gx, gy)) continue;
        const len = Math.hypot(gx - from[0], gy - from[1]) + Math.hypot(to[0] - gx, to[1] - gy);
        if (len < bestLen && this.pathFree(from[0], from[1], gx, gy) && this.pathFree(gx, gy, to[0], to[1])) {
          best = [gx, gy]; bestLen = len;
        }
      }
    }
    return best;
  }

  /** Nearest free ground to `at` (spiral search) - for targets that land on a building. */
  closestFree(at: Point): Point | null {
    if (this.free(at[0], at[1])) return at;
    for (let r = 20; r <= 300; r += 20) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, x = at[0] + Math.cos(a) * r, y = at[1] + Math.sin(a) * r * 0.6;
        if (this.free(x, y)) return [x, y];
      }
    }
    return null;
  }

  nearPoint(at: Point, dx: number): Point {
    for (const k of [1, 0.7, 0.45, -0.7, -1]) {
      const p: Point = [at[0] + dx * k, at[1] + 8];
      if (this.free(...p, 0)) return p;
    }
    return [at[0] + dx, at[1]];
  }

  opaqueAt(x: number, y: number) {
    const [px, py] = this.toImage(x, y);
    if (px < 0 || py < 0 || px >= this.def.w || py >= this.def.h) return false;
    if (!this.mask) {   // read the island art's alpha once (getPixelAlpha redraws it every call: slow)
      const src = this.scene.textures.get(islandKey(this.def.id)).getSourceImage() as HTMLImageElement;
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
      const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(src, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      this.mask = { w: c.width, sx: c.width / this.def.w, sy: c.height / this.def.h, a: d };
    }
    const m = this.mask;
    return (m.a[(Math.floor(py * m.sy) * m.w + Math.floor(px * m.sx)) * 4 + 3] ?? 0) > 200;
  }

  private waterSparkle() {
    const [x0, y0, x1, y1] = Phaser.Utils.Array.GetRandom(this.def.water);
    const [x, y] = this.toWorld([Phaser.Math.Between(x0, x1), Phaser.Math.Between(y0, y1)]);
    if (!this.opaqueAt(x, y) || this.walk.contains(x, y)) return;
    const c = this.scene.textures.getPixel(...this.toImage(x, y), islandKey(this.def.id));
    if (!c || c.blue < 180 || c.red > 150) return;
    const sp = this.scene.add.image(x, y + this.bob, 'spark').setDepth(3).setScale(0).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: sp, scale: Phaser.Math.FloatBetween(0.5, 0.9), angle: 45, duration: 350, yoyo: true, onComplete: () => sp.destroy() });
  }
}
