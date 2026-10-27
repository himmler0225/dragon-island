// SKILLS registry: assembled from per-species files, plus URL helpers.
import type { SpeciesId } from '../config/species';
import type { SkillDef, SkillType } from './types';
import { SEA_DRAGON_SKILLS } from './seaDragon';
import { PEACOCK_SKILLS } from './peacock';
import { QILIN_SKILLS } from './qilin';
import { BLACK_DRAGON_SKILLS } from './blackDragon';
import { BONE_DRAGON_SKILLS } from './boneDragon';
import { STAG_DRAGON_SKILLS } from './stagDragon';
import { SILVER_DRAGON_SKILLS, GOLD_DRAGON_SKILLS } from './goldSilverTwins';
import { CELESTIAL_DRAGON_SKILLS } from './celestialDragon';
import { VOID_SERPENT_SKILLS } from './voidSerpent';
import { ICE_PHOENIX_SKILLS, FIRE_PHOENIX_SKILLS } from './phoenix';
import { EARTH_DRAGON_SKILLS, FIRE_DRAGON_SKILLS } from './basicDragons';

export const SKILLS: Record<SpeciesId, SkillDef[]> = {
  sea_dragon: SEA_DRAGON_SKILLS,
  peacock: PEACOCK_SKILLS,
  east_sea_dragon: SEA_DRAGON_SKILLS,
  west_sea_dragon: SEA_DRAGON_SKILLS,
  north_sea_dragon: SEA_DRAGON_SKILLS,
  south_sea_dragon: SEA_DRAGON_SKILLS,
  qilin: QILIN_SKILLS,
  black_dragon: BLACK_DRAGON_SKILLS,
  bone_dragon: BONE_DRAGON_SKILLS,
  stag_dragon: STAG_DRAGON_SKILLS,
  gold_dragon: GOLD_DRAGON_SKILLS,
  silver_dragon: SILVER_DRAGON_SKILLS,
  celestial_dragon: CELESTIAL_DRAGON_SKILLS,
  void_serpent: VOID_SERPENT_SKILLS,
  fire_phoenix: FIRE_PHOENIX_SKILLS,
  ice_phoenix: ICE_PHOENIX_SKILLS,
  fire_dragon: FIRE_DRAGON_SKILLS,
  earth_dragon: EARTH_DRAGON_SKILLS,
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
export const vfxNumbers = (id: SpeciesId) => [
  ...Array.from({ length: VFX_COUNT[id] ?? 8 }, (_, k) => k + 1),
  ...(BASIC_FX.includes(id) ? Array.from({ length: 8 }, (_, k) => k + 17) : []),
];
export const NO_VFX: SpeciesId[] = ['void_serpent', 'fire_dragon', 'earth_dragon'];
/** Species with drawn bite jaws (skills/jaw_upper.png + jaw_lower.png); others get procedural fangs. */
export const JAW_SPECIES: SpeciesId[] = ['black_dragon', 'celestial_dragon'];
export const jawKey = (id: SpeciesId, part: 'upper' | 'lower') => `jaw_${part}_${id}`;
export const jawUrl = (id: SpeciesId, part: 'upper' | 'lower') => `/dragons/${id}/skills/jaw_${part}.png`;
export const vfxUrl = (id: SpeciesId, n: number) => `/dragons/${id}/skills/vfx_${n}.png`;
