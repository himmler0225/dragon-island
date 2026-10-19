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
  /** Ids of the combo skills (Hợp Kích) this dragon can use now (its partner is on the same island). */
  combos(id: SpeciesId): string[];
  /** false for wingless walkers (the HUD hides the fly button) */
  canFly(id: SpeciesId): boolean;
  /** Both dragons of the combo strike together. */
  useCombo(comboId: string): void;
  /** Send the food boat to this dragon's island (hungry dragons there walk to the food). */
  callBoat(id: SpeciesId): void;
  /** Current hunger 0..100 of every dragon. */
  hunger(): Partial<Record<SpeciesId, number>>;
  /** Stop the island's game loop (no update, no drawing) while the battle screen covers it. */
  setPaused(on: boolean): void;
}

type Events = {
  progress: number;
  ready: void;
  select: SpeciesId;
  action: { id: SpeciesId; action: DragonAction };
  island: number;
  collect: { resource: Resource; amount: number };
  /** the egg in the nest changed level (1..10) */
  egg: number;
  /** the island asks the HUD to open a panel (tapping the nest opens Lai Rồng) */
  open: 'breed';
  /** island clock (Ho Chi Minh City time) and how dark it is (0 day .. 1 night) */
  sky: { hour: number; night: number; weather: 'clear' | 'cloudy' | 'rain' };
  /** a dragon's hunger changed level (full / hungry / starving) or it was fed */
  hunger: { id: SpeciesId; hunger: number; level: 'full' | 'hungry' | 'starving' };
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

// Level of the breeding egg, shared by the Lai Rồng panel and the nest on the island.
// Mock state for now: belongs to the player's save on the server later.
let eggLevel = 1;
export const getEggLevel = () => eggLevel;
export const setEggLevel = (level: number) => { eggLevel = level; gameEvents.emit('egg', level); };
