import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { PutTeamsDto } from './dto/teams.dto.js';
import { TeamsService } from './teams.service.js';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  /** GET /api/teams -> { teams: (species | null)[][], active } */
  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.teams.get(user.id);
  }

  /** PUT /api/teams  { teams, active } -> the saved teams; 422 TEAM_DRAGON_NOT_OWNED for a dragon the player lacks */
  @Put()
  put(@CurrentUser() user: AuthUser, @Body() dto: PutTeamsDto) {
    return this.teams.put(user.id, dto.teams, dto.active);
  }
}
