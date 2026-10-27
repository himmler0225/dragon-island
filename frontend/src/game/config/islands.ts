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
  buildings: { type: BuildingType; level: 1 | 2 | 3; at: Point }[];
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
      { dragon: 'east_sea_dragon', start: [1060, 640] }, { dragon: 'north_sea_dragon', start: [880, 470] }],
    nest: [770, 420],
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
    dragon: 'stag_dragon', start: [820, 560],
    guests: [{ dragon: 'qilin', start: [760, 650] }, { dragon: 'void_serpent', start: [640, 520] },
      { dragon: 'fire_phoenix', start: [900, 480] }, { dragon: 'ice_phoenix', start: [1000, 600] },
      { dragon: 'west_sea_dragon', start: [560, 600] }, { dragon: 'peacock', start: [880, 640] }],
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
    dragon: 'bone_dragon', start: [820, 560],
    guests: [{ dragon: 'gold_dragon', start: [700, 650] }, { dragon: 'silver_dragon', start: [960, 620] }, { dragon: 'earth_dragon', start: [820, 470] },
      { dragon: 'south_sea_dragon', start: [1040, 520] }],
    buildings: [
      { type: 'gold_mine', level: 3, at: [1110, 500] },
      { type: 'training_ground', level: 1, at: [560, 600] },
      { type: 'stone_quarry', level: 2, at: [900, 330] },
    ],
  },
];
