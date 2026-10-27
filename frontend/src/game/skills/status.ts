// Status effects (Đóng Băng, Thiêu Đốt, Nguyền Rửa): which hit applies which.
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
  black_dragon: ['curse', 1],              // every hit of Hắc Long curses
  bone_dragon: ['curse', 0.3],
  void_serpent: ['curse', 0.3],
  qilin: ['burn', 0.35],
  fire_dragon: ['burn', 0.3],
  fire_phoenix: ['burn', 0.3],
  ice_phoenix: ['freeze', 0.2],
  stag_dragon: ['freeze', 0.15],
  sea_dragon: ['freeze', 0.15],
  east_sea_dragon: ['burn', 0.15],
  north_sea_dragon: ['freeze', 0.15],
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
