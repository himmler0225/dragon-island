// Đội hình: three saved teams of up to TEAM_SIZE dragons, in summon order, and which one is active.
// Kept in localStorage until the backend stores it (per player); Phaser-free, safe for React.
import { SPECIES, type SpeciesId } from './species';

export const TEAM_SIZE = 50;
/** Dragons in a new player's starting team. */
const STARTER = 9;
export const TEAM_COUNT = 3;
/** One team: TEAM_SIZE slots, null = empty. */
export type Team = (SpeciesId | null)[];

const KEY = 'dragon-island.teams.v1';
const valid = new Set<string>(SPECIES);

const fill = (ids: SpeciesId[]): Team => Array.from({ length: TEAM_SIZE }, (_, k) => ids[k] ?? null);
const DEFAULT: Team[] = [fill(SPECIES.slice(0, STARTER)), fill([]), fill([])];

interface Saved { teams: Team[]; active: number }

export function loadTeams(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null;
    if (raw && Array.isArray(raw.teams)) {
      // keep each slot only if it still names a species the game has
      const teams = Array.from({ length: TEAM_COUNT }, (_, t) => Array.from({ length: TEAM_SIZE }, (_, k) => {
        const id = raw.teams[t]?.[k];
        return id && valid.has(id) ? id : null;
      }));
      return { teams, active: Math.min(TEAM_COUNT - 1, Math.max(0, raw.active | 0)) };
    }
  } catch { /* private mode / bad data: fall back to the default */ }
  return { teams: DEFAULT.map(t => [...t]), active: 0 };
}

export function saveTeams(saved: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* storage blocked: kept for this session only */ }
}

/** The dragons of the active team, in summon order (empty slots skipped); never empty. */
export function activeTeam(): SpeciesId[] {
  const { teams, active } = loadTeams();
  const ids = teams[active].filter((id): id is SpeciesId => id !== null);
  return ids.length ? ids : SPECIES.slice(0, STARTER);
}
