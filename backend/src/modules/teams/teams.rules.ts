// Team rules (same numbers as frontend/src/game/config/team.ts). Pure, so they are easy to test.
export const TEAM_COUNT = 3;
export const TEAM_SIZE = 50;
export type Team = (string | null)[];
export interface Teams { teams: Team[]; active: number }

/** Any stored / sent value as exactly TEAM_COUNT teams of TEAM_SIZE slots (missing ones empty, extra ones cut). */
export function normalize(teams: unknown, active: unknown): Teams {
  const src = Array.isArray(teams) ? teams : [];
  return {
    teams: Array.from({ length: TEAM_COUNT }, (_, t) => Array.from({ length: TEAM_SIZE }, (_, k) => {
      const id = Array.isArray(src[t]) ? (src[t] as unknown[])[k] : null;
      return typeof id === 'string' && id ? id : null;
    })),
    active: Math.min(TEAM_COUNT - 1, Math.max(0, Number.isInteger(active) ? (active as number) : 0)),
  };
}

/** A new player's teams: the first team holds their dragons (in the given order), the others are empty. */
export const starterTeams = (owned: string[]): Teams => normalize([owned.slice(0, TEAM_SIZE)], 0);

/** The species in `teams` the player does not own (empty: the teams are fine). */
export function notOwned(teams: Team[], owned: Set<string>): string[] {
  return [...new Set(teams.flat().filter((id): id is string => id !== null && !owned.has(id)))];
}
