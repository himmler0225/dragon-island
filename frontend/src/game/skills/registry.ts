// SKILLS registry: assembled from per-species files, plus URL helpers.
import type { SpeciesId } from '../config/species';
import type { SkillDef, SkillType } from './types';
import { SEA_DRAGON_SKILLS } from './seaDragon';
import { PEACOCK_SKILLS } from './peacock';
import { JADE_FLAME_DRAGON_SKILLS } from './jadeFlameDragon';
import { FIRE_SPIRIT_BOSS_SKILLS } from './fireSpiritBoss';
import { QILIN_SKILLS } from './qilin';
import { BLACK_DRAGON_SKILLS } from './blackDragon';
import { BONE_DRAGON_SKILLS } from './boneDragon';
import { SILVER_DRAGON_SKILLS, GOLD_DRAGON_SKILLS } from './goldSilverTwins';
import { CELESTIAL_DRAGON_SKILLS } from './celestialDragon';
import { ICE_PHOENIX_SKILLS, FIRE_PHOENIX_SKILLS } from './phoenix';
import { EARTH_DRAGON_SKILLS, FIRE_DRAGON_SKILLS } from './basicDragons';
import { MOON_DRAGON_SKILLS } from './moonDragon';
import { STONE_GHOST_DRAGON_SKILLS } from './stoneGhostDragon';
import { TURTLE_DRAGON_SKILLS } from './turtleDragon';
import { LEAF_DRAGON_SKILLS } from './leafDragon';
import { IMMORTAL_BIRD_SKILLS } from './immortalBird';
import { RUBY_DRAGON_SKILLS } from './rubyDragon';
import { FROST_DRAGON_SKILLS } from './frostDragon';
import { SNOWFLIGHT_DRAGON_SKILLS } from './snowflightDragon';
import { ROSEBUD_DRAGON_SKILLS } from './rosebudDragon';

export const SKILLS: Record<SpeciesId, SkillDef[]> = {
  sea_dragon: SEA_DRAGON_SKILLS,
  peacock: PEACOCK_SKILLS,
  jade_flame_dragon: JADE_FLAME_DRAGON_SKILLS,
  fire_spirit_boss: FIRE_SPIRIT_BOSS_SKILLS,
  qilin: QILIN_SKILLS,
  black_dragon: BLACK_DRAGON_SKILLS,
  bone_dragon: BONE_DRAGON_SKILLS,
  gold_dragon: GOLD_DRAGON_SKILLS,
  silver_dragon: SILVER_DRAGON_SKILLS,
  celestial_dragon: CELESTIAL_DRAGON_SKILLS,
  fire_phoenix: FIRE_PHOENIX_SKILLS,
  ice_phoenix: ICE_PHOENIX_SKILLS,
  fire_dragon: FIRE_DRAGON_SKILLS,
  earth_dragon: EARTH_DRAGON_SKILLS,
  moon_dragon: MOON_DRAGON_SKILLS,
  stone_ghost_dragon: STONE_GHOST_DRAGON_SKILLS,
  turtle_dragon: TURTLE_DRAGON_SKILLS,
  leaf_dragon: LEAF_DRAGON_SKILLS,
  immortal_bird: IMMORTAL_BIRD_SKILLS,
  ruby_dragon: RUBY_DRAGON_SKILLS,
  frost_dragon: FROST_DRAGON_SKILLS,
  snowflight_dragon: SNOWFLIGHT_DRAGON_SKILLS,
  rosebud_dragon: ROSEBUD_DRAGON_SKILLS,
};

/** The skill of that slot. Throws (with a clear message) when the species has no such slot, instead
 *  of returning undefined and crashing somewhere further down. */
export const skill = (id: SpeciesId, type: SkillType): SkillDef => {
  const found = SKILLS[id].find(s => s.type === type);
  if (!found) throw new Error(`Species "${id}" has no "${type}" skill`);
  return found;
};
export const skillIconUrl = (id: SpeciesId, type: SkillType) => `/dragons/${id}/skills/icon_${type}.png`;
export const vfxKey = (id: SpeciesId, n: number) => `vfx_${id}_${n}`;
/** Species whose skills use only code-drawn effects (no skills/vfx.png yet). */
/** Species with a second vfx sheet (skills/vfx2.png -> vfx_9..16). */
export const VFX_COUNT: Partial<Record<SpeciesId, number>> = { fire_phoenix: 16, ice_phoenix: 16 };
/** Species with a basic-attack sheet (skills/basic.png -> vfx_17..24: 4 falling projectiles, 4 impact frames). */
export const BASIC_FX: SpeciesId[] = ['black_dragon', 'celestial_dragon', 'fire_phoenix', 'ice_phoenix', 'peacock'];
/** Every vfx number to load for a species. */
export const vfxNumbers = (id: SpeciesId) => VFX_LIST[id] ?? [
  ...Array.from({ length: VFX_COUNT[id] ?? 8 }, (_, k) => k + 1),
  ...(BASIC_FX.includes(id) ? Array.from({ length: 8 }, (_, k) => k + 17) : []),
  ...(VFX_EXTRA[id] ?? []),
];
/** Species with only some drawn effects (the others drawn in code, scene/effects/proceduralVfx.ts). */
const VFX_LIST: Partial<Record<SpeciesId, number[]>> = {
  frost_dragon: [1, 2, 3, 4, 5, 9],
  // anims.png: 40..49 ultimate, 50..59 skill, 60..69 passive (rosebudDragon.ts)
  rosebud_dragon: Array.from({ length: 30 }, (_, k) => 40 + k),
  snowflight_dragon: Array.from({ length: 30 }, (_, k) => 40 + k),
};
/** More drawn effects on top of the usual ones: Hắc Long's 30..35 are Âm Dương Long Kích's (combos.ts). */
const VFX_EXTRA: Partial<Record<SpeciesId, number[]>> = {
  // 30..35: Âm Dương Long Kích (combos.ts); 40..49, 50..59, 60..69: its ultimate, rage and drain animations (anims.png)
  black_dragon: [30, 31, 32, 33, 34, 35, ...Array.from({ length: 30 }, (_, k) => 40 + k)],
};
export const NO_VFX: SpeciesId[] = [];
/** Species with drawn bite jaws (skills/jaw_upper.png + jaw_lower.png); others get procedural fangs. */
export const JAW_SPECIES: SpeciesId[] = ['black_dragon', 'celestial_dragon'];
export const jawKey = (id: SpeciesId, part: 'upper' | 'lower') => `jaw_${part}_${id}`;
export const jawUrl = (id: SpeciesId, part: 'upper' | 'lower') => `/dragons/${id}/skills/jaw_${part}.png`;
export const vfxUrl = (id: SpeciesId, n: number) => `/dragons/${id}/skills/vfx_${n}.png`;
