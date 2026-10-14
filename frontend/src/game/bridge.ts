// The only contact point between React (HUD, menus, panels) and Phaser (the island).
// React never imports Phaser: the scene registers an IslandApi here and emits events.
import type { SpeciesId } from './config/species';
import type { SkillSlot } from './skills/types';
import type { Resource } from './config/world';

/** What a dragon is doing on the island. */
export type DragonAction = 'idle' | 'walk' | 'fly' | 'sleep' | 'strike';
/** Commands the HUD can give a dragon. */
export type DragonCommand = 'idle' | 'walk' | 'fly' | 'sleep';

export interface IslandApi {
  readonly dragonIds: SpeciesId[];
  select(id: SpeciesId): void;
  command(id: SpeciesId, cmd: DragonCommand): void;
  /** Use a skill on the island; targets are picked automatically (nearest dragon / all / team). */
  useSkill(id: SpeciesId, slot: SkillSlot): void;
  /** Unselected dragons wander on their own (walk / fly / sleep with random pauses). */
  setAutoWander(on: boolean): void;
  /** Pan the camera to an island (index into ISLANDS). */
  focusIsland(index: number): void;
}

type Events = {
  progress: number;
  ready: void;
  select: SpeciesId;
  action: { id: SpeciesId; action: DragonAction };
  island: number;
  collect: { resource: Resource; amount: number };
};

type Listener<T> = (payload: T) => void;

class Emitter<E extends Record<string, unknown>> {
  private map = new Map<keyof E, Set<Listener<never>>>();
  on<K extends keyof E>(name: K, fn: Listener<E[K]>) {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name)!.add(fn as Listener<never>);
    return () => { this.map.get(name)?.delete(fn as Listener<never>); };
  }
  emit<K extends keyof E>(name: K, ...payload: E[K] extends void ? [] : [E[K]]) {
    this.map.get(name)?.forEach(fn => (fn as Listener<unknown>)(payload[0]));
  }
}

export const gameEvents = new Emitter<Events>();

let api: IslandApi | null = null;
export const setIslandApi = (a: IslandApi | null) => { api = a; };
/** The running island, or null before the scene has started. */
export const island = () => api;
