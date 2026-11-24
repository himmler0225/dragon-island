// Đánh Boss: each boss's fight. A boss is an enemy only (never owned): it comes out alone at the start,
// escorts walk out beside it every few seconds, and the fight is won when it falls. Phaser-free.
import type { BossId, SpeciesId } from './species';

export interface BossFight {
  /** Title of the fight on the boss list. */
  title: string;
  blurb: string;
  /** Seconds to bring the boss down. */
  time: number;
  /** Enemies that walk out with the boss, one every `escortEvery` seconds (in this order, looping). */
  escort: SpeciesId[];
  escortEvery: number;
  /** Recommended team power shown on the boss list. */
  power: number;
}

export const BOSS_INFO: Record<BossId, BossFight> = {
  fire_spirit_boss: {
    title: 'Hỏa Linh Giáng Thế',
    blurb: 'Linh hồn lửa đội vương miện vàng, mái tóc lửa cháy rực. Tung song chưởng phun lửa và giáng hỏa ngục thiêu rụi cả đội hình.',
    time: 180,
    escort: ['fire_dragon', 'qilin', 'fire_phoenix'],
    escortEvery: 7,
    power: 120000,
  },
};
