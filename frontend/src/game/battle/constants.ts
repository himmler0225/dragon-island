// Battle field constants.
import type { SpeciesId } from '../config/species';
import type { SkillSlot } from '../skills/types';

export const FIELD_W = 2540, FIELD_H = 900;
export const SCALE = 0.68;
export const ALLY_START = 360, ENEMY_START = 2040;
export const PACE = 2.8;
export const FLY_SPEED = 135;
export const STATUE_GAP = 260;
export const LANES = [610, 690, 650, 730, 570];
export const FLYERS: SpeciesId[] = ['hac_long', 'phuong_hoang_lua', 'phuong_hoang_bang', 'hai_long', 'than_long'];
export const ALT = 150;
export const HIGH: Partial<Record<SpeciesId, number>> = { hac_long: 250, than_long: 250, phuong_hoang_lua: 240, phuong_hoang_bang: 240 };
export const REACH: [number, number] = [110, 200];
export const RANGED: SpeciesId[] = ['rong_xuong', 'hai_long'];
export const RANGED_REACH: [number, number] = [380, 460];
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
  hac_long: { c: 0xb05cff, css: '#d39bff', mark: 'status_curse_6' },
  rong_xuong: { c: 0x9a6bff, css: '#c9a6ff', mark: 'status_curse_6' },
  tu_xa_long: { c: 0xc04cff, css: '#e0a6ff', mark: 'status_curse_6' },
  ki_lan: { c: 0xff7a2a, css: '#ffb066', mark: 'status_burn_6' },
  phuong_hoang_lua: { c: 0xff6a1a, css: '#ffab5a', mark: 'status_burn_6' },
  phuong_hoang_bang: { c: 0x6fd8ff, css: '#a8ecff', mark: 'status_freeze_2' },
  tuan_long: { c: 0x8fe6ff, css: '#c4f3ff', mark: 'status_freeze_2' },
  hai_long: { c: 0x3fa8ff, css: '#8fd0ff' },
  rong_vang: { c: 0xffc83a, css: '#ffe07a' },
  than_long: { c: 0xffe27a, css: '#fff0a8' },
  rong_bac: { c: 0xd8e4ff, css: '#eef3ff' },
  rong_lua_do: { c: 0xff6a1a, css: '#ffab5a', mark: 'status_burn_6' },
  rong_dat_nau: { c: 0xd9a45a, css: '#f0cf8f' },
  rong_cay_xanh_la: { c: 0x8fdc3a, css: '#c6f08a' },
  rong_bang_xanh_bien: { c: 0x7fe0ff, css: '#bff0ff', mark: 'status_freeze_2' },
};
export const CRIT = 0.15;
export const STOP_MS = { hit: 60, crit: 110, ultimate: 140 };
export const BANNER_GAP = 2.5;
export const DIM_S = 1.1;
export const DROP_H = 620, DROP_MS = 560;
