// Status effects (Đóng Băng, Thiêu Đốt, Nguyền Rửa, Choáng): which hit applies which.
import type { SpeciesId } from '../config/species';

export type StatusKind = 'freeze' | 'burn' | 'curse' | 'stun';
export const STATUS_KINDS: StatusKind[] = ['freeze', 'burn', 'curse', 'stun'];

/** How long each status lasts (ms) and, for damage over time, the damage per 1 s tick. */
export const STATUS: Record<StatusKind, { ms: number; tick: number }> = {
  freeze: { ms: 2500, tick: 0 },     // can't move or act
  burn: { ms: 3000, tick: 45 },
  curse: { ms: 4000, tick: 30 },
  stun: { ms: 1800, tick: 0 },       // can't move or act: stars circle its head
};

/** Species whose damaging hits carry a status: [kind, chance per hit]. */
const ON_HIT: Partial<Record<SpeciesId, [StatusKind, number]>> = {
  black_dragon: ['curse', 1],              // every hit of Hắc Long curses
  bone_dragon: ['curse', 0.3],
  qilin: ['burn', 0.35],
  fire_dragon: ['burn', 0.3],
  jade_flame_dragon: ['burn', 0.3],
  moon_dragon: ['freeze', 0.2],
  immortal_bird: ['burn', 0.3],
  fire_phoenix: ['burn', 0.3],
  ice_phoenix: ['freeze', 0.2],
  sea_dragon: ['freeze', 0.15],
};

/** Status words the skills print. */
const WORDS: [RegExp, StatusKind][] = [
  [/Đóng Băng|Trói Chân|^-Tốc$/i, 'freeze'],   // Trói Chân (Rồng Cây's roots): held in place as in ice
  [/Thiêu Đốt|Bỏng/i, 'burn'],
  [/Nguyền|ĐOẠT MỆNH/i, 'curse'],
  [/Choáng/i, 'stun'],
];

/** The status a line of skill text puts on its target (if any), given who used the skill. */
export function statusFromText(by: SpeciesId, text: string): StatusKind | null {
  for (const [re, kind] of WORDS) if (re.test(text)) return kind;
  const hit = ON_HIT[by];
  if (hit && /^-\d+$/.test(text) && Math.random() < hit[1]) return hit[0];
  return null;
}
