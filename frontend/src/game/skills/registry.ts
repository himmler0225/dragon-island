// SKILLS registry: assembled from per-species files, plus URL helpers.
import type { SpeciesId } from '../config/species';
import type { SkillDef, SkillType } from './types';
import { HAI_LONG_SKILLS } from './hai_long';
import { KI_LAN_SKILLS } from './ki_lan';
import { HAC_LONG_SKILLS } from './hac_long';
import { RONG_XUONG_SKILLS } from './rong_xuong';
import { TUAN_LONG_SKILLS } from './tuan_long';
import { RONG_BAC_SKILLS, RONG_VANG_SKILLS } from './rong_vang';
import { THAN_LONG_SKILLS } from './than_long';
import { TU_XA_LONG_SKILLS } from './tu_xa_long';
import { PHUONG_HOANG_BANG_SKILLS, PHUONG_HOANG_LUA_SKILLS } from './phuong_hoang';
import { RONG_BANG_XANH_BIEN_SKILLS, RONG_CAY_XANH_LA_SKILLS, RONG_DAT_NAU_SKILLS, RONG_LUA_DO_SKILLS } from './basic_dragons';

export const SKILLS: Record<SpeciesId, SkillDef[]> = {
  hai_long: HAI_LONG_SKILLS,
  ki_lan: KI_LAN_SKILLS,
  hac_long: HAC_LONG_SKILLS,
  rong_xuong: RONG_XUONG_SKILLS,
  tuan_long: TUAN_LONG_SKILLS,
  rong_vang: RONG_VANG_SKILLS,
  rong_bac: RONG_BAC_SKILLS,
  than_long: THAN_LONG_SKILLS,
  tu_xa_long: TU_XA_LONG_SKILLS,
  phuong_hoang_lua: PHUONG_HOANG_LUA_SKILLS,
  phuong_hoang_bang: PHUONG_HOANG_BANG_SKILLS,
  rong_lua_do: RONG_LUA_DO_SKILLS,
  rong_dat_nau: RONG_DAT_NAU_SKILLS,
  rong_cay_xanh_la: RONG_CAY_XANH_LA_SKILLS,
  rong_bang_xanh_bien: RONG_BANG_XANH_BIEN_SKILLS,
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
