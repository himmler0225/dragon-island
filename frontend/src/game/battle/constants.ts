// Battle field constants.
import type { SpeciesId } from '../config/species';
import type { SkillSlot } from '../skills/types';

export const FIELD_W = 2540, FIELD_H = 900;
export const SCALE = 0.76;
export const ALLY_START = 360, ENEMY_START = 2040;
/** Every dragon crosses the field at this speed (field px/s), walking or flying; a walker's steps are
 *  timed to it so its feet never slide. */
export const MARCH_SPEED = 34;   // 2026-11-20: 50 -> 44 -> 38 -> 32 -> 28 -> 34 (a little quicker again, walking and flying)
/** On the field every walker takes steps this much longer than on the islands: at MARCH_SPEED its legs
 *  then keep a calm ~1 step a second instead of scurrying (pace = MARCH_SPEED / walkSpeed). */
export const MARCH_STRIDE = 1.4;   // (2026-11-20: 1.2 -> 1.4: fewer, calmer steps)
/** How fast a dragon gets going / comes to a stop (share of MARCH_SPEED per second). */
export const MARCH_EASE = 2.5;
/** An engaged dragon keeps fighting until its foe is this much past its reach (no stop-go flicker). */
export const REACH_SLACK = 60;
export const STATUE_GAP = 260;
/** How fast a knocked-back dragon's slide dies away (per second): a push of d px starts at d x this px/s. */
export const KNOCK_DECAY = 5;
/** The two team health bars at the top are cut into cells. */
export const TEAM_CELLS = 20;
export const LANES = [610, 690, 650, 730, 570];
export const FLYERS: SpeciesId[] = ['immortal_bird', 'jade_flame_dragon', 'moon_dragon', 'stone_ghost_dragon', 'fire_dragon', 'black_dragon', 'fire_phoenix', 'ice_phoenix', 'sea_dragon', 'celestial_dragon'];
export const ALT = 150;
export const HIGH: Partial<Record<SpeciesId, number>> = { black_dragon: 250, celestial_dragon: 250, fire_phoenix: 240, ice_phoenix: 240, stone_ghost_dragon: 70 };
/** Formation: how far from its foe a dragon stops to fight (field px). Front = melee, back = long range. */
export type Row = 'front' | 'middle' | 'back';
// (2026-11-20: ~0.7x, the two sides fight closer together; was front 110..190, middle 300..380, back 480..560)
export const ROW_REACH: Record<Row, [number, number]> = { front: [90, 150], middle: [210, 270], back: [340, 400] };
/** Species that shoot from further than their row (field px). */
export const REACH: Partial<Record<SpeciesId, [number, number]>> = { turtle_dragon: [1300, 1380], black_dragon: [420, 480], celestial_dragon: [460, 520], stone_ghost_dragon: [500, 560] };
// shell cannons (Rồng Rùa 2026-11-20: +480, was 820..900); long-reaching volleys (2026-11-20: ~0.7x, closer fights;
// was Hắc Long 600..680, Thần Long 660..740, Ma Thạch 720..800); Kì Lân (was 560..640) now fights from its row
const FRONT: SpeciesId[] = ['gold_dragon', 'silver_dragon'];
const BACK: SpeciesId[] = ['ruby_dragon', 'peacock', 'fire_spirit_boss', 'fire_dragon', 'jade_flame_dragon', 'moon_dragon', 'stone_ghost_dragon', 'turtle_dragon'];
export const rowOf = (id: SpeciesId): Row => (FRONT.includes(id) ? 'front' : BACK.includes(id) ? 'back' : 'middle');
/** HP by rarity (2026-11-20: x3.5, tougher: fights last long enough to watch the skills; was R 1200 .. UR 2500, BOSS 12000). */
export const STATS: Record<string, number> = { R: 4200, SR: 5200, SSR: 6600, UR: 8800, BOSS: 42000 };
export const COOLDOWN: Record<SkillSlot, number> = { basic: 0.45, skill: 1.4, ultimate: 9 };
export const ANIM: Record<SkillSlot, number> = { basic: 2, skill: 1.5, ultimate: 0.8 };
export const PRIORITY: SkillSlot[] = ['ultimate', 'skill', 'basic'];
export const MAX_TARGETS = 3;
export const SPLASH = 420;
export const ALLY_STATUE = 190, ENEMY_STATUE = 2210;
export const STATUE_Y = 680, STATUE_H = 330;   // base on the open dirt, clear of the rocks in the field's corners
export const HUE: Record<SpeciesId, { c: number; css: string; mark?: string }> = {
  black_dragon: { c: 0xb05cff, css: '#d39bff', mark: 'status_curse_6' },
  bone_dragon: { c: 0x9a6bff, css: '#c9a6ff', mark: 'status_curse_6' },
  qilin: { c: 0xff7a2a, css: '#ffb066', mark: 'status_burn_6' },
  fire_phoenix: { c: 0xff6a1a, css: '#ffab5a', mark: 'status_burn_6' },
  ice_phoenix: { c: 0x6fd8ff, css: '#a8ecff', mark: 'status_freeze_2' },
  sea_dragon: { c: 0x3fa8ff, css: '#8fd0ff' },
  peacock: { c: 0x3fe0b0, css: '#9ff5d8' },
  jade_flame_dragon: { c: 0x3dff7a, css: '#a8ffc4', mark: 'status_burn_6' },
  fire_spirit_boss: { c: 0xff4a1a, css: '#ff9a6a', mark: 'status_burn_6' },
  gold_dragon: { c: 0xffc83a, css: '#ffe07a' },
  celestial_dragon: { c: 0xffe27a, css: '#fff0a8' },
  silver_dragon: { c: 0xd8e4ff, css: '#eef3ff' },
  fire_dragon: { c: 0xff6a1a, css: '#ffab5a', mark: 'status_burn_6' },
  earth_dragon: { c: 0xd9a45a, css: '#f0cf8f' },
  moon_dragon: { c: 0xb8d8ff, css: '#e4efff', mark: 'status_freeze_2' },
  stone_ghost_dragon: { c: 0xff2a3a, css: '#ff9aa6' },
  turtle_dragon: { c: 0xff6a4a, css: '#ffb08a' },
  leaf_dragon: { c: 0x8fe03a, css: '#c8f28a' },
  immortal_bird: { c: 0xffa21a, css: '#ffd27a', mark: 'status_burn_6' },
  ruby_dragon: { c: 0xff2a4a, css: '#ff9aaa' },
  frost_dragon: { c: 0x7fd8ff, css: '#bdf0ff', mark: 'status_freeze_2' },
  snowflight_dragon: { c: 0x8fe9ff, css: '#d4f6ff', mark: 'status_freeze_2' },
  rosebud_dragon: { c: 0xff7ad0, css: '#ffc4ec' },
};
export const CRIT = 0.15;
export const STOP_MS = { hit: 60, crit: 110, ultimate: 140 };
export const DIM_S = 1.1;
/** Summon: a beam of light strikes the gate and the dragon bursts out of it (ms the arrival takes). */
export const SUMMON_MS = 560;
