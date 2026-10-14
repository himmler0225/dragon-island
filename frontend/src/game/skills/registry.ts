// SKILLS registry: assembled from per-species files, plus URL helpers.
import type { SpeciesId } from '../config/species';
import type { SkillDef, SkillType } from './types';
import { HAI_LONG_SKILLS } from './hai_long';
import { KI_LAN_SKILLS } from './ki_lan';
import { HAC_LONG_SKILLS } from './hac_long';
import { RONG_XUONG_SKILLS } from './rong_xuong';
import { TUAN_LONG_SKILLS } from './tuan_long';

export const SKILLS: Record<SpeciesId, SkillDef[]> = {
  hai_long: HAI_LONG_SKILLS,
  ki_lan: KI_LAN_SKILLS,
  hac_long: HAC_LONG_SKILLS,
  rong_xuong: RONG_XUONG_SKILLS,
  tuan_long: TUAN_LONG_SKILLS,
};

export const skill = (id: SpeciesId, type: SkillType) => SKILLS[id].find(s => s.type === type)!;
export const skillIconUrl = (id: SpeciesId, type: SkillType) => `/dragons/${id}/skills/icon_${type}.png`;
export const vfxKey = (id: SpeciesId, n: number) => `vfx_${id}_${n}`;
/** Species whose skills use only code-drawn effects (no skills/vfx.png yet). */
export const NO_VFX: SpeciesId[] = [];
/** Species with drawn bite jaws (skills/jaw_upper.png + jaw_lower.png); others get procedural fangs. */
export const JAW_SPECIES: SpeciesId[] = ['hac_long'];
export const jawKey = (id: SpeciesId, part: 'upper' | 'lower') => `jaw_${part}_${id}`;
export const jawUrl = (id: SpeciesId, part: 'upper' | 'lower') => `/dragons/${id}/skills/jaw_${part}.png`;
export const vfxUrl = (id: SpeciesId, n: number) => `/dragons/${id}/skills/vfx_${n}.png`;
