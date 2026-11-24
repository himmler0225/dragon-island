// Battle scene public types.
import type { SpeciesId } from '../config/species';

export type Side = 'ally' | 'enemy';

export interface BattleApi {
  summon(id: SpeciesId): void;
  enemy(id: SpeciesId): void;
  setHp(ally: number, enemy: number): void;
  scrollTo(t: number): void;
  destroy(): void;
}

export interface BattleEvents {
  hit(side: Side): void;
  view?(from: number, to: number): void;
  progress?(p: number): void;
  /** A boss on the field lost (or regained) HP; hp 0 when it falls. */
  boss?(hp: number, maxHp: number): void;
}
