// Battle screen static data: constants, tips, buffs, waves.
import type { SpeciesId } from '@/game/config';

// Game balance
export const MANA_MAX = 150;
export const MANA_PER_S = 25;
export const TIME = 180;
export const SUMMON_COST = 15;   // mana for one dragon; full bar summons ~10 in a row

export const STARS = (id: SpeciesId) => 18 + (id.length * 7) % 12;

export const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Tips shown while the field loads
export const TIPS = [
  'Bấm vào thẻ rồng để chọn con sẽ ra trận tiếp theo.',
  'Hắc Long nguyền rủa mọi kẻ trúng đòn: mất máu liên tục trong 4 giây.',
  'Rồng Xương và Long Vương đánh từ xa, hãy để chúng đứng sau.',
  'Rồng bị Đóng Băng đứng im, không thể đánh trả.',
  'Tuyệt kỹ hồi mỗi 9 giây, rồng sẽ tự tung khi sẵn sàng.',
];

// Buff badges
export const ALLY_BUFFS: [string, string][] = [
  ['🔥', 'Công +'], ['❤️', 'Sinh lực +'], ['🐉', 'Cuồng nộ'], ['💠', 'Lá chắn'],
];
export const ENEMY_BUFFS: [string, string][] = [
  ['🌀', 'Lốc nước'], ['🛡️', 'Giáp +'], ['🐉', 'Cuồng nộ'], ['❤️', 'Sinh lực +'], ['🗡️', 'Tốc +'],
];

// Enemy waves (placeholder): [species, count]
export const WAVES: [SpeciesId, number][] = [
  ['black_dragon', 15], ['stag_dragon', 1], ['sea_dragon', 1], ['qilin', 3], ['bone_dragon', 1],
  ['fire_phoenix', 10], ['void_serpent', 1], ['gold_dragon', 22], ['ice_phoenix', 2],
  ['celestial_dragon', 1], ['silver_dragon', 11], ['black_dragon', 2],
  ['east_sea_dragon', 1], ['west_sea_dragon', 1], ['north_sea_dragon', 1], ['south_sea_dragon', 1],
];
