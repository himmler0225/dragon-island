// Island definitions: layout, walkable areas, dragons, building placements.
import type { SpeciesId } from './species';
import type { Point } from './world';

export type BuildingType = 'gold_mine' | 'training_ground' | 'stone_quarry';

export interface IslandDef {
  id: string;
  name: string;
  w: number;
  h: number;
  scale: number;
  walk: Point[];
  water: [number, number, number, number][];
  dragon: SpeciesId;
  start: Point;
  guests?: { dragon: SpeciesId; start: Point }[];
  /** the dragon-egg nest (Lai Rồng), island-image px of its base; tapping it opens the breeding panel */
  nest?: Point;
  /** level 1..MAX_BUILDING_LEVEL (economy.ts) */
  buildings: { type: BuildingType; level: number; at: Point }[];
}

export const ISLANDS: IslandDef[] = [
  {
    id: 'meadow', name: 'Đảo Đồng Cỏ', w: 1448, h: 1086, scale: 0.78,
    walk: [[560, 300], [700, 262], [830, 245], [880, 185], [1000, 200], [1120, 280], [1230, 380], [1262, 470],
      [1240, 600], [1200, 700], [1080, 780], [940, 835], [860, 840], [700, 790], [560, 750], [420, 680], [300, 605],
      [225, 525], [255, 470], [420, 455], [540, 405]],
    water: [[250, 200, 520, 440]],
    dragon: 'black_dragon', start: [800, 600],
    guests: [{ dragon: 'sea_dragon', start: [720, 730] }, { dragon: 'celestial_dragon', start: [980, 760] }, { dragon: 'fire_dragon', start: [600, 680] },
      { dragon: 'jade_flame_dragon', start: [700, 560] }, { dragon: 'leaf_dragon', start: [1100, 560] },
      { dragon: 'ruby_dragon', start: [880, 480] }, { dragon: 'frost_dragon', start: [1000, 640] },
      { dragon: 'snowflight_dragon', start: [1160, 460] }, { dragon: 'rosebud_dragon', start: [620, 760] }],
    nest: [770, 420],
    buildings: [
      { type: 'gold_mine', level: 1, at: [985, 345] },
      { type: 'training_ground', level: 4, at: [500, 560] },
      { type: 'stone_quarry', level: 7, at: [1110, 640] },
    ],
  },
  {
    id: 'jungle', name: 'Đảo Rừng Rậm', w: 1475, h: 1010, scale: 0.7,
    walk: [[660, 248], [840, 240], [1050, 262], [1155, 322], [1200, 420], [1200, 540], [1170, 630], [1050, 690],
      [900, 720], [720, 705], [570, 660], [450, 600], [390, 495], [405, 405], [495, 345], [600, 285]],
    water: [[270, 180, 420, 375], [90, 495, 225, 585]],
    dragon: 'qilin', start: [820, 560],
    guests: [{ dragon: 'fire_phoenix', start: [900, 480] }, { dragon: 'ice_phoenix', start: [1000, 600] },
      { dragon: 'peacock', start: [880, 640] }],
    buildings: [
      { type: 'gold_mine', level: 7, at: [600, 560] },
      { type: 'training_ground', level: 10, at: [900, 395] },
      { type: 'stone_quarry', level: 1, at: [1110, 600] },
    ],
  },
  {
    id: 'desert', name: 'Đảo Sa Mạc', w: 1461, h: 993, scale: 0.72,
    walk: [[630, 262], [840, 240], [1020, 278], [1140, 360], [1245, 450], [1245, 540], [1140, 600], [1035, 675],
      [900, 720], [750, 720], [600, 675], [480, 615], [360, 570], [330, 495], [450, 450], [495, 375], [570, 300]],
    water: [[135, 270, 405, 405]],
    dragon: 'bone_dragon', start: [820, 560],
    guests: [{ dragon: 'gold_dragon', start: [700, 650] }, { dragon: 'silver_dragon', start: [960, 620] }, { dragon: 'earth_dragon', start: [820, 470] }],
    buildings: [
      { type: 'gold_mine', level: 15, at: [1110, 500] },
      { type: 'training_ground', level: 1, at: [560, 600] },
      { type: 'stone_quarry', level: 4, at: [900, 330] },
    ],
  },
  {
    // the sandy back of a giant whale (head front-left, tail fin back-right); the water round the sand is not walked
    id: 'whale', name: 'Đảo Cá Voi', w: 1516, h: 1008, scale: 0.72,
    walk: [[300, 330], [420, 250], [600, 205], [750, 200], [900, 205], [1040, 235], [1150, 275], [1250, 330], [1300, 390],
      [1285, 460], [1220, 520], [1140, 565], [1000, 600], [880, 612], [760, 640], [640, 622], [500, 600], [380, 540],
      [300, 485], [262, 410]],
    // the lagoon round the sand: back right, left side, front
    water: [[740, 140, 1300, 320], [20, 390, 260, 470], [460, 610, 1240, 730]],
    dragon: 'turtle_dragon', start: [760, 470],
    guests: [{ dragon: 'immortal_bird', start: [560, 380] }, { dragon: 'moon_dragon', start: [980, 420] },
      { dragon: 'stone_ghost_dragon', start: [1100, 480] }],
    buildings: [
      { type: 'gold_mine', level: 2, at: [430, 400] },
      { type: 'training_ground', level: 1, at: [1180, 430] },
      { type: 'stone_quarry', level: 3, at: [800, 300] },
    ],
  },
];
