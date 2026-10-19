// Dragon breeding (Lai Rồng): egg levels and how many stars a hatched dragon gets.
// Phaser-free, safe for React. All numbers are placeholders to tune; the server should roll the
// hatch for real (this file only drives the UI for now).

export const MAX_STARS = 29;

export interface EggLevel {
  level: number;
  name: string;
  maxStars: number;      // best result this egg can hatch
  upgradeCost: number;   // upgrade stones to reach the next level (0 at the top)
}

/** 10 egg levels; each one raises the star cap and shifts the odds toward more stars. */
export const EGG_LEVELS: EggLevel[] = [
  { level: 1, name: 'Trứng Đá', maxStars: 6, upgradeCost: 200 },
  { level: 2, name: 'Trứng Đồng', maxStars: 9, upgradeCost: 400 },
  { level: 3, name: 'Trứng Bạc', maxStars: 12, upgradeCost: 800 },
  { level: 4, name: 'Trứng Vàng', maxStars: 15, upgradeCost: 1500 },
  { level: 5, name: 'Trứng Ngọc Bích', maxStars: 18, upgradeCost: 2500 },
  { level: 6, name: 'Trứng Lam Ngọc', maxStars: 20, upgradeCost: 4000 },
  { level: 7, name: 'Trứng Hồng Ngọc', maxStars: 22, upgradeCost: 6500 },
  { level: 8, name: 'Trứng Tử Tinh', maxStars: 24, upgradeCost: 10000 },
  { level: 9, name: 'Trứng Thiên Long', maxStars: 27, upgradeCost: 16000 },
  { level: 10, name: 'Trứng Thần Long', maxStars: MAX_STARS, upgradeCost: 0 },
];

/** Stones one blessing (Chúc phúc) costs; it pushes this hatch's odds up a step. */
export const BLESS_COST = 1000;

/** Chance (0..1) of hatching each star count 1..maxStars: a bell curve centred at ~55% of the cap
 *  (65% when blessed), so a higher egg is both a higher cap and a better average. */
export function starOdds(egg: EggLevel, blessed = false): number[] {
  const m = egg.maxStars, mean = m * (blessed ? 0.65 : 0.55), sd = Math.max(1.2, m * 0.2);
  const w = Array.from({ length: m }, (_, i) => Math.exp(-(((i + 1 - mean) / sd) ** 2) / 2));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map(v => v / sum);
}

/** Odds grouped into star brackets for display, e.g. "1-5 sao: 12%". */
export const STAR_BRACKETS: [number, number][] = [[1, 5], [6, 10], [11, 15], [16, 20], [21, 25], [26, MAX_STARS]];
export function bracketOdds(egg: EggLevel, blessed = false) {
  const o = starOdds(egg, blessed);
  return STAR_BRACKETS.map(([a, b]) => ({ from: a, to: b, p: o.slice(a - 1, b).reduce((s, v) => s + v, 0) }));
}

export function rollStars(egg: EggLevel, blessed = false, rnd = Math.random): number {
  const o = starOdds(egg, blessed);
  let r = rnd();
  for (let i = 0; i < o.length; i++) if ((r -= o[i]) <= 0) return i + 1;
  return o.length;
}

/** Bonuses a hatched dragon gives per star (shown in the result panel). */
export const STAR_BONUS = { gold: 3.5, luck: 0.55, exp: 0.85, attack: 8, time: -25 };
