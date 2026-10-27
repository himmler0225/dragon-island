// Hunger rules (same numbers as frontend/src/game/config/economy.ts HUNGER). Hunger is never ticked in
// the database: a dragon stores its value and when it was measured, and the current value is worked out
// from the time since. Pure functions, so they are easy to test.
export const HUNGER = {
  full: 100,
  perMinute: 1.5,
  hungry: 35,
  meal: 40,
};

export function currentHunger(stored: number, at: Date, now = new Date()): number {
  const minutes = Math.max(0, now.getTime() - at.getTime()) / 60_000;
  return Math.max(0, stored - minutes * HUNGER.perMinute);
}

export const isHungry = (hunger: number) => hunger < HUNGER.hungry;
