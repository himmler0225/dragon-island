import { Injectable } from '@nestjs/common';
import { BusinessRuleError, ErrorCode } from '../../common/errors/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DragonsService } from '../dragons/dragons.service.js';
import { DRAGON_SPECIES } from '../dragons/dragon-species.js';
import { normalize, notOwned, starterTeams, type Team, type Teams } from './teams.rules.js';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService, private readonly dragons: DragonsService) {}

  /** The player's teams; before the first save, a starter set: all their dragons in team 1. */
  async get(ownerId: string): Promise<Teams> {
    const row = await this.prisma.db.teamSetup.findUnique({ where: { ownerId } });
    if (row) return normalize(row.teams, row.active);
    const owned = await this.dragons.speciesOwned(ownerId);
    return starterTeams(DRAGON_SPECIES.filter(id => owned.has(id)));   // (in the game's species order)
  }

  /** Save the teams. Every slot must be a dragon the player owns: 422 TEAM_DRAGON_NOT_OWNED otherwise. */
  async put(ownerId: string, teams: Team[], active: number): Promise<Teams> {
    const next = normalize(teams, active);
    const missing = notOwned(next.teams, await this.dragons.speciesOwned(ownerId));
    if (missing.length) throw new BusinessRuleError(ErrorCode.TEAM_DRAGON_NOT_OWNED, 'A team holds a dragon the player does not own', { species: missing });
    await this.prisma.db.teamSetup.upsert({
      where: { ownerId }, create: { ownerId, teams: next.teams, active: next.active }, update: { teams: next.teams, active: next.active },
    });
    return next;
  }
}
