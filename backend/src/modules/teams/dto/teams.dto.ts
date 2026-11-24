import { ArrayMaxSize, IsArray, IsInt, Max, Min } from 'class-validator';
import { TEAM_COUNT } from '../teams.rules.js';

/** PUT /teams: every team (slots: a species id or null) and the active one. Slots are checked in the service. */
export class PutTeamsDto {
  @IsArray() @ArrayMaxSize(TEAM_COUNT) @IsArray({ each: true })
  teams: (string | null)[][];

  @IsInt() @Min(0) @Max(TEAM_COUNT - 1)
  active: number;
}
