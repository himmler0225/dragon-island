// Economy constants: resource types, production rates, building definitions.
import type { Resource } from './world';
export type { Resource } from './world';
import type { BuildingType } from './world';
export type { BuildingType } from './world';

export const BUILDING_SCALE = 0.43;   // world px per building-image px (tools/slice_buildings.py: cut at the sheet's size)
/** Buildings level 1 .. MAX_BUILDING_LEVEL; the art changes at 4, 7, 10 and 15 (5 stages). */
export const MAX_BUILDING_LEVEL = 15;
/** The art stage (1..5) of a building level. */
export const buildingTier = (level: number) => (level >= 15 ? 5 : level >= 10 ? 4 : level >= 7 ? 3 : level >= 4 ? 2 : 1);
export const PRODUCES: Record<BuildingType, Resource> = {
  gold_mine: 'gold', training_ground: 'exp', stone_quarry: 'stone',
};
export const BUILDING_NAME: Record<BuildingType, string> = {
  gold_mine: 'Gốc Cây Vàng', training_ground: 'Nấm Thông Thái', stone_quarry: 'Mỏ Đá',
};
/** The player's level on the HUD: every this much exp from the training grounds is a level up. */
export const EXP_PER_LEVEL = 1000, START_LEVEL = 12;

export const RESOURCE_NAME: Record<Resource, string> = {
  gold: 'vàng', exp: 'kinh nghiệm', stone: 'đá thăng cấp',
};
/** Seconds to fill up, and amount collected, per level (index level - 1): a little faster and ~20% more each level. */
const levels = <T,>(f: (lv: number) => T) => Array.from({ length: MAX_BUILDING_LEVEL }, (_, k) => f(k + 1));
export const PRODUCTION: Record<Resource, { every: number[]; amount: number[] }> = {
  gold: { every: levels(lv => Math.max(5, 8 - 0.2 * (lv - 1))), amount: levels(lv => Math.round(50 * 1.2 ** (lv - 1))) },
  exp: { every: levels(lv => Math.max(6, 10 - 0.25 * (lv - 1))), amount: levels(lv => Math.round(40 * 1.2 ** (lv - 1))) },
  stone: { every: levels(lv => Math.max(8, 14 - 0.4 * (lv - 1))), amount: levels(lv => 1 + Math.floor((lv - 1) / 3)) },
};

export const DRAGON_SCALE = 0.68;

/** Hunger (0 starving .. 100 full). Falls over time; under HUNGRY a dragon shows a food bubble and
 *  slows down, at 0 it lies down and waits to be fed. Numbers are placeholders to tune. */
export const HUNGER = {
  full: 100,
  perMinute: 1.5,     // ~1 h from full to starving
  hungry: 35,         // food bubble + slower steps below this
  starving: 0,        // lies down, will not wander
  meal: 40,           // one food drop restores this much
};
/** Every dragon walks at this speed on the islands (px/s at depth scale 1), whatever its stride. */
export const WALK_SPEED = 18;   // an unhurried, leisurely stroll
export const FLY_SPEED = 95;   // px/s
export const FLY_ALT = 90;     // cruising height above the ground, px
export const TAKEOFF_S = 0.8;
export const LAND_S = 0.7;
