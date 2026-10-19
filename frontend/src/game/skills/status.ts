// Status effects (Đóng Băng, Thiêu Đốt, Nguyền Rửa): which hit applies which. Pure rules, no Phaser;
// the look is scene/effects/statusFx.ts. Skills print status words (t.text('Thiêu Đốt')) and some
// species put a status on their hits by themselves.
import type { SpeciesId } from '../config/species';

export type StatusKind = 'freeze' | 'burn' | 'curse';
export const STATUS_KINDS: StatusKind[] = ['freeze', 'burn', 'curse'];

/** How long each status lasts (ms) and, for damage over time, the damage per 1 s tick. */
export const STATUS: Record<StatusKind, { ms: number; tick: number }> = {
  freeze: { ms: 2500, tick: 0 },     // can't move or act
  burn: { ms: 3000, tick: 45 },
  curse: { ms: 4000, tick: 30 },
};

/** Species whose damaging hits carry a status: [kind, chance per hit]. */
const ON_HIT: Partial<Record<SpeciesId, [StatusKind, number]>> = {
  hac_long: ['curse', 1],              // every hit of Hắc Long curses
  rong_xuong: ['curse', 0.3],
  tu_xa_long: ['curse', 0.3],
  ki_lan: ['burn', 0.35],
  rong_lua_do: ['burn', 0.3],
  rong_bang_xanh_bien: ['freeze', 0.2],
  phuong_hoang_lua: ['burn', 0.3],
  phuong_hoang_bang: ['freeze', 0.2],
  tuan_long: ['freeze', 0.15],
  hai_long: ['freeze', 0.15],
};

/** Status words the skills print. */
const WORDS: [RegExp, StatusKind][] = [
  [/Đóng Băng|^-Tốc$/i, 'freeze'],
  [/Thiêu Đốt|Bỏng/i, 'burn'],
  [/Nguyền|ĐOẠT MỆNH/i, 'curse'],
];

/** The status a line of skill text puts on its target (if any), given who used the skill. */
export function statusFromText(by: SpeciesId, text: string): StatusKind | null {
  for (const [re, kind] of WORDS) if (re.test(text)) return kind;
  const hit = ON_HIT[by];
  if (hit && /^-\d+$/.test(text) && Math.random() < hit[1]) return hit[0];
  return null;
}
