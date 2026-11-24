// Từ điển: each dragon's attributes, 0..STAT_MAX, shown as bars of STAT_MAX cells. They describe the dragon
// (its role in a fight); battle numbers still come from battle/constants (STATS by rarity).
import type { SPECIES } from './species';

export const STAT_MAX = 20;
export const STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'crit', 'dodge', 'heal', 'effect'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export const STAT_INFO: Record<StatKey, { name: string; icon: string }> = {
  hp: { name: 'Sinh lực', icon: '❤️' },
  atk: { name: 'Công', icon: '⚔️' },
  def: { name: 'Phòng thủ', icon: '🛡️' },
  spd: { name: 'Tốc độ', icon: '💨' },
  crit: { name: 'Bạo kích', icon: '💥' },
  dodge: { name: 'Né tránh', icon: '🌀' },
  heal: { name: 'Hồi phục', icon: '💚' },
  effect: { name: 'Hiệu ứng', icon: '✨' },
};

type Row = [hp: number, atk: number, def: number, spd: number, crit: number, dodge: number, heal: number, effect: number];
const ROWS: Record<(typeof SPECIES)[number], Row> = {
  black_dragon: [10, 17, 8, 16, 15, 12, 3, 12],       // sát thủ bầu trời
  bone_dragon: [17, 11, 15, 6, 6, 4, 14, 9],          // hứng đòn, hút máu, hồi sinh
  sea_dragon: [15, 13, 12, 11, 8, 8, 8, 12],
  qilin: [12, 15, 10, 13, 10, 9, 4, 11],
  gold_dragon: [14, 16, 13, 10, 13, 6, 5, 7],
  silver_dragon: [14, 14, 14, 11, 10, 9, 7, 9],
  celestial_dragon: [18, 18, 15, 13, 12, 10, 10, 14],
  fire_phoenix: [11, 16, 8, 15, 12, 12, 9, 12],
  ice_phoenix: [11, 14, 9, 15, 9, 13, 10, 15],
  fire_dragon: [9, 11, 7, 9, 8, 7, 3, 8],
  earth_dragon: [13, 8, 13, 6, 4, 4, 4, 9],
  peacock: [10, 14, 8, 14, 14, 13, 6, 10],
  jade_flame_dragon: [10, 14, 8, 12, 10, 10, 3, 11],
  moon_dragon: [11, 12, 9, 12, 8, 11, 6, 13],
  stone_ghost_dragon: [14, 17, 14, 10, 13, 6, 3, 9],   // giáp dày, tia xuyên đội hình
  turtle_dragon: [17, 12, 18, 5, 8, 3, 5, 9],          // mai đá: rất trâu, chậm
  leaf_dragon: [11, 12, 9, 13, 8, 12, 14, 12],        // lá cây: hồi phục, trói chân
  immortal_bird: [16, 17, 11, 16, 13, 13, 16, 15],    // bất tử: tái sinh từ lửa
  ruby_dragon: [11, 15, 10, 12, 13, 9, 3, 10],
  frost_dragon: [14, 12, 14, 10, 8, 9, 6, 13],
  snowflight_dragon: [13, 14, 11, 15, 12, 11, 7, 15],  // phi tuyết: bay nhanh, bão tuyết, làm chậm
  rosebud_dragon: [12, 10, 10, 11, 7, 13, 16, 14],     // nụ tầm xuân: hồi máu, trói gai, né tránh
};

export const DRAGON_STATS = Object.fromEntries(
  Object.entries(ROWS).map(([id, row]) => [id, Object.fromEntries(STAT_KEYS.map((k, i) => [k, row[i]]))]),
) as Record<(typeof SPECIES)[number], Record<StatKey, number>>;
