// Battle field constants.
import type { SpeciesId } from '../config/species';
import type { SkillSlot } from '../skills/types';

export const FIELD_W = 2540, FIELD_H = 900;
export const SCALE = 0.68;
export const ALLY_START = 360, ENEMY_START = 2040;
export const PACE = 2.2;   // battle walk: rig time and ground speed x this (the island walk is 1)
export const FLY_SPEED = 135;
export const STATUE_GAP = 260;
export const LANES = [610, 690, 650, 730, 570];
/** Việt Hải Long Vương's four kin: they fly and fight like it. */
const SEA_KIN: SpeciesId[] = ['east_sea_dragon', 'west_sea_dragon', 'north_sea_dragon', 'south_sea_dragon'];
export const FLYERS: SpeciesId[] = ['black_dragon', 'fire_phoenix', 'ice_phoenix', 'sea_dragon', 'celestial_dragon', ...SEA_KIN];
export const ALT = 150;
export const HIGH: Partial<Record<SpeciesId, number>> = { black_dragon: 250, celestial_dragon: 250, fire_phoenix: 240, ice_phoenix: 240 };
export const REACH: [number, number] = [110, 200];
export const RANGED: SpeciesId[] = ['bone_dragon', 'sea_dragon', ...SEA_KIN];
export const RANGED_REACH: [number, number] = [380, 460];
/** Flyers strike from further off: melee flyers get FLY_REACH, ranged ones RANGED_REACH + FLY_BONUS. */
export const FLY_REACH: [number, number] = [260, 340], FLY_BONUS = 80;
export const CLOUD_W = 470;
export const STATS: Record<string, number> = { R: 1200, SR: 1500, SSR: 1900, UR: 2500 };
export const COOLDOWN: Record<SkillSlot, number> = { basic: 0.45, skill: 1.4, ultimate: 9 };
export const ANIM: Record<SkillSlot, number> = { basic: 2, skill: 1.5, ultimate: 0.8 };
export const PRIORITY: SkillSlot[] = ['ultimate', 'skill', 'basic'];
export const MAX_TARGETS = 3;
export const SPLASH = 420;
export const ALLY_STATUE = 190, ENEMY_STATUE = 2210;
export const STATUE_Y = 790, STATUE_H = 330;
export const HUE: Record<SpeciesId, { c: number; css: string; mark?: string }> = {
  black_dragon: { c: 0xb05cff, css: '#d39bff', mark: 'status_curse_6' },
  bone_dragon: { c: 0x9a6bff, css: '#c9a6ff', mark: 'status_curse_6' },
  void_serpent: { c: 0xc04cff, css: '#e0a6ff', mark: 'status_curse_6' },
  qilin: { c: 0xff7a2a, css: '#ffb066', mark: 'status_burn_6' },
  fire_phoenix: { c: 0xff6a1a, css: '#ffab5a', mark: 'status_burn_6' },
  ice_phoenix: { c: 0x6fd8ff, css: '#a8ecff', mark: 'status_freeze_2' },
  stag_dragon: { c: 0x8fe6ff, css: '#c4f3ff', mark: 'status_freeze_2' },
  sea_dragon: { c: 0x3fa8ff, css: '#8fd0ff' },
  peacock: { c: 0x3fe0b0, css: '#9ff5d8' },
  east_sea_dragon: { c: 0xff5a2a, css: '#ffa07a', mark: 'status_burn_6' },
  west_sea_dragon: { c: 0x4ce07a, css: '#a8f0b8' },
  north_sea_dragon: { c: 0x6fc8ff, css: '#b8e4ff', mark: 'status_freeze_2' },
  south_sea_dragon: { c: 0xffd23a, css: '#ffe89a' },
  gold_dragon: { c: 0xffc83a, css: '#ffe07a' },
  celestial_dragon: { c: 0xffe27a, css: '#fff0a8' },
  silver_dragon: { c: 0xd8e4ff, css: '#eef3ff' },
  fire_dragon: { c: 0xff6a1a, css: '#ffab5a', mark: 'status_burn_6' },
  earth_dragon: { c: 0xd9a45a, css: '#f0cf8f' },
};
export const CRIT = 0.15;
export const STOP_MS = { hit: 60, crit: 110, ultimate: 140 };
export const DIM_S = 1.1;
/** Summon: a beam of light strikes the gate and the dragon bursts out of it (ms the arrival takes). */
export const SUMMON_MS = 560;
