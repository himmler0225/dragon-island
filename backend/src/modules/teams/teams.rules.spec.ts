import { normalize, notOwned, starterTeams, TEAM_COUNT, TEAM_SIZE } from './teams.rules.js';

describe('team rules', () => {
  it('normalizes anything to TEAM_COUNT teams of TEAM_SIZE slots', () => {
    const { teams, active } = normalize([['a', '', 7, 'b'], 'junk'], 9);
    expect(teams).toHaveLength(TEAM_COUNT);
    expect(teams.every(t => t.length === TEAM_SIZE)).toBe(true);
    expect(teams[0].slice(0, 4)).toEqual(['a', null, null, 'b']);
    expect(teams[1].every(s => s === null)).toBe(true);
    expect(active).toBe(TEAM_COUNT - 1);   // (9: clamped to the last team)
  });

  it('starts a player with their dragons in team 1', () => {
    const { teams, active } = starterTeams(['x', 'y']);
    expect(teams[0].slice(0, 3)).toEqual(['x', 'y', null]);
    expect(active).toBe(0);
  });

  it('finds the dragons a player does not own', () => {
    expect(notOwned([['a', 'b', null], ['c', 'a']], new Set(['a']))).toEqual(['b', 'c']);
  });
});
