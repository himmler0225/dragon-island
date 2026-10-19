// SKILLS registry: assembled from per-species files, plus URL helpers.
import type { SpeciesId } from '../config/species';
import type { SkillDef, SkillType } from './types';
import { SEA_DRAGON_SKILLS } from './seaDragon';
import { QILIN_SKILLS } from './qilin';
import { BLACK_DRAGON_SKILLS } from './blackDragon';
import { BONE_DRAGON_SKILLS } from './boneDragon';
import { STAG_DRAGON_SKILLS } from './stagDragon';
import { SILVER_DRAGON_SKILLS, GOLD_DRAGON_SKILLS } from './goldSilverTwins';
import { CELESTIAL_DRAGON_SKILLS } from './celestialDragon';
import { VOID_SERPENT_SKILLS } from './voidSerpent';
import { ICE_PHOENIX_SKILLS, FIRE_PHOENIX_SKILLS } from './phoenix';
import { ICE_DRAGON_SKILLS, FOREST_DRAGON_SKILLS, EARTH_DRAGON_SKILLS, FIRE_DRAGON_SKILLS } from './basicDragons';

export const SKILLS: Record<SpeciesId, SkillDef[]> = {
  hai_long: SEA_DRAGON_SKILLS,
  ki_lan: QILIN_SKILLS,
  hac_long: BLACK_DRAGON_SKILLS,
  rong_xuong: BONE_DRAGON_SKILLS,
  tuan_long: STAG_DRAGON_SKILLS,
  rong_vang: GOLD_DRAGON_SKILLS,
  rong_bac: SILVER_DRAGON_SKILLS,
  than_long: CELESTIAL_DRAGON_SKILLS,
  tu_xa_long: VOID_SERPENT_SKILLS,
  phuong_hoang_lua: FIRE_PHOENIX_SKILLS,
  phuong_hoang_bang: ICE_PHOENIX_SKILLS,
  rong_lua_do: FIRE_DRAGON_SKILLS,
  rong_dat_nau: EARTH_DRAGON_SKILLS,
  rong_cay_xanh_la: FOREST_DRAGON_SKILLS,
  rong_bang_xanh_bien: ICE_DRAGON_SKILLS,
};

export const skill = (id: SpeciesId, type: SkillType) => SKILLS[id].find(s => s.type === type)!;
export const skillIconUrl = (id: SpeciesId, type: SkillType) => `/dragons/${id}/skills/icon_${type}.png`;
export const vfxKey = (id: SpeciesId, n: number) => `vfx_${id}_${n}`;
/** Species whose skills use only code-drawn effects (no skills/vfx.png yet). */
/** Species with a second vfx sheet (skills/vfx2.png -> vfx_9..16). */
export const VFX_COUNT: Partial<Record<SpeciesId, number>> = { phuong_hoang_lua: 16, phuong_hoang_bang: 16 };
export const NO_VFX: SpeciesId[] = ['tu_xa_long', 'rong_lua_do', 'rong_dat_nau', 'rong_cay_xanh_la', 'rong_bang_xanh_bien'];
/** Species with drawn bite jaws (skills/jaw_upper.png + jaw_lower.png); others get procedural fangs. */
export const JAW_SPECIES: SpeciesId[] = ['hac_long', 'than_long'];
export const jawKey = (id: SpeciesId, part: 'upper' | 'lower') => `jaw_${part}_${id}`;
export const jawUrl = (id: SpeciesId, part: 'upper' | 'lower') => `/dragons/${id}/skills/jaw_${part}.png`;
export const vfxUrl = (id: SpeciesId, n: number) => `/dragons/${id}/skills/vfx_${n}.png`;
