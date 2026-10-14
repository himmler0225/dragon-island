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

export const islandKey = (id: string) => `island_${id}`;
export const buildingKey = (type: BuildingType, level: number) => `building_${type}_${level}`;
export const resourceKey = (r: Resource) => `res_${r}`;

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
      const rx = img.displayWidth * 0.4, ry = rx * 0.45;
      const res = PRODUCES[b.type];
      const bubble = scene.add.image(x, y - img.displayHeight - 10, resourceKey(res)).setScale(0.32).setDepth(25).setVisible(false);
      scene.tweens.add({ targets: bubble, y: bubble.y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const building: Building = { type: b.type, level: b.level, img, x, y, rx, ry, ready: false,
        timer: PRODUCTION[res].every[b.level - 1] * (0.3 + 0.7 * Math.random()), bubble };
      img.setInteractive({ pixelPerfect: true, useHandCursor: true }).on('pointerup', () => this.collect(building));
      bubble.setInteractive({ useHandCursor: true }).on('pointerup', () => this.collect(building));
      this.buildings.push(building);
    }
  }

  /** How far the island has bobbed from rest; everything standing on it moves with it. */
  get bob() { return this.img.y - this.cy; }

  update(dt: number) {
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

  free(x: number, y: number, margin = 18) {
    if (!this.walk.contains(x, y)) return false;
    return this.buildings.every(b => {
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
    return (this.scene.textures.getPixelAlpha(px, py, islandKey(this.def.id)) ?? 0) > 200;
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
