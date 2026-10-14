// World layout and tuning. Plain TS (no Phaser) so React can import it.
import type { SpeciesId } from './species';

/** One screen (the viewport); the world is ISLANDS.length screens wide. */
export const W = 1280;
export const H = 860;

export type Point = [number, number];
export type BuildingType = 'gold_mine' | 'training_ground' | 'stone_quarry';
export type Resource = 'gold' | 'exp' | 'stone';

export interface IslandDef {
  id: string;
  name: string;
  /** public/islands/<id>.png (tools/slice_world.py); w/h = its size in px. */
  w: number;
  h: number;
  scale: number;
  /** Walkable ground outline, island-image px. */
  walk: Point[];
  /** Water areas that sparkle [x0, y0, x1, y1], island-image px. */
  water: [number, number, number, number][];
  dragon: SpeciesId;
  /** Where the dragon starts, island-image px. */
  start: Point;
  /** More dragons living on this island. */
  guests?: { dragon: SpeciesId; start: Point }[];
  /** Bottom-centre of each building on the ground, island-image px. */
  buildings: { type: BuildingType; level: 1 | 2 | 3; at: Point }[];
}

export const ISLANDS: IslandDef[] = [
  {
    id: 'meadow', name: 'Đảo Đồng Cỏ', w: 1448, h: 1086, scale: 0.78,
    walk: [[560, 300], [700, 262], [830, 245], [880, 185], [1000, 200], [1120, 280], [1230, 380], [1262, 470],
      [1240, 600], [1200, 700], [1080, 780], [940, 835], [860, 840], [700, 790], [560, 750], [420, 680], [300, 605],
      [225, 525], [255, 470], [420, 455], [540, 405]],
    water: [[250, 200, 520, 440]],
    dragon: 'hac_long', start: [800, 600],
    guests: [{ dragon: 'hai_long', start: [720, 730] }],
    buildings: [
      { type: 'gold_mine', level: 1, at: [985, 345] },
      { type: 'training_ground', level: 2, at: [500, 560] },
      { type: 'stone_quarry', level: 3, at: [1110, 640] },
    ],
  },
  {
    id: 'jungle', name: 'Đảo Rừng Rậm', w: 1475, h: 1010, scale: 0.7,
    walk: [[660, 248], [840, 240], [1050, 262], [1155, 322], [1200, 420], [1200, 540], [1170, 630], [1050, 690],
      [900, 720], [720, 705], [570, 660], [450, 600], [390, 495], [405, 405], [495, 345], [600, 285]],
    water: [[270, 180, 420, 375], [90, 495, 225, 585]],
    dragon: 'tuan_long', start: [820, 560],
    guests: [{ dragon: 'ki_lan', start: [760, 650] }],
    buildings: [
      { type: 'gold_mine', level: 2, at: [600, 560] },
      { type: 'training_ground', level: 3, at: [900, 395] },
      { type: 'stone_quarry', level: 1, at: [1110, 600] },
    ],
  },
  {
    id: 'desert', name: 'Đảo Sa Mạc', w: 1461, h: 993, scale: 0.72,
    walk: [[630, 262], [840, 240], [1020, 278], [1140, 360], [1245, 450], [1245, 540], [1140, 600], [1035, 675],
      [900, 720], [750, 720], [600, 675], [480, 615], [360, 570], [330, 495], [450, 450], [495, 375], [570, 300]],
    water: [[135, 270, 405, 405]],
    dragon: 'rong_xuong', start: [820, 560],
    buildings: [
      { type: 'gold_mine', level: 3, at: [1110, 500] },
      { type: 'training_ground', level: 1, at: [560, 600] },
      { type: 'stone_quarry', level: 2, at: [900, 330] },
    ],
  },
];

export const WORLD_W = W * ISLANDS.length;

/** Island centre in the world: one island per screen, side by side. */
export const islandCentre = (i: number): Point => [W / 2 + i * W, H / 2 + 10];

export const BUILDING_SCALE = 0.42;   // world px per building-image px
export const PRODUCES: Record<BuildingType, Resource> = { gold_mine: 'gold', training_ground: 'exp', stone_quarry: 'stone' };
export const BUILDING_NAME: Record<BuildingType, string> = { gold_mine: 'Mỏ vàng', training_ground: 'Sân luyện rồng', stone_quarry: 'Mỏ đá thăng cấp' };
export const RESOURCE_NAME: Record<Resource, string> = { gold: 'vàng', exp: 'kinh nghiệm', stone: 'đá thăng cấp' };
/** Seconds to fill up, and amount collected, per level. */
export const PRODUCTION: Record<Resource, { every: number[]; amount: number[] }> = {
  gold: { every: [8, 7, 6], amount: [50, 120, 260] },
  exp: { every: [10, 9, 8], amount: [40, 90, 200] },
  stone: { every: [14, 12, 10], amount: [1, 2, 4] },
};

export const DRAGON_SCALE = 0.68;
export const FLY_SPEED = 95;   // px/s
export const FLY_ALT = 90;     // cruising height above the ground, px
export const TAKEOFF_S = 0.8;
export const LAND_S = 0.7;

export const smooth = (u: number) => u * u * (3 - 2 * u);
export const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
export const bump = (t: number, a: number, b: number) => (t < a || t > b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));
