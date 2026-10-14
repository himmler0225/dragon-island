// Economy constants: resource types, production rates, building definitions.
import type { Resource } from './world';
export type { Resource } from './world';
import type { BuildingType } from './world';
export type { BuildingType } from './world';

export const BUILDING_SCALE = 0.42;   // world px per building-image px
export const PRODUCES: Record<BuildingType, Resource> = {
  gold_mine: 'gold', training_ground: 'exp', stone_quarry: 'stone',
};
export const BUILDING_NAME: Record<BuildingType, string> = {
  gold_mine: 'Mỏ vàng', training_ground: 'Sân luyện rồng', stone_quarry: 'Mỏ đá thăng cấp',
};
export const RESOURCE_NAME: Record<Resource, string> = {
  gold: 'vàng', exp: 'kinh nghiệm', stone: 'đá thăng cấp',
};
/** Seconds to fill up, and amount collected, per level. */
export const PRODUCTION: Record<Resource, { every: number[]; amount: number[] }> = {
  gold: { every: [8, 7, 6], amount: [50, 120, 260] },
  exp: { every: [10, 9, 8], amount: [40, 90, 200] },
  stone: { every: [14, 12, 10], amount: [1, 2, 4] },
};

export const DRAGON_SCALE = 0.68;
export const FLY_SPEED = 95;   // px/s
export const FLY_ALT = 90;     // cruising height above the ground, px
export const TAKEOFF_S = 0.8;
export const LAND_S = 0.7;
