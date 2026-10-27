import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import type { Dragon } from '../../../generated/prisma/client.js';
import { PageQueryDto } from '../../../common/http/pagination.js';
import { DRAGON_SPECIES, type DragonSpecies } from '../dragon-species.js';
import { currentHunger, isHungry } from '../hunger.js';

/** GET /dragons?page=&pageSize=&species= */
export class ListDragonsQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(DRAGON_SPECIES)
  species?: DragonSpecies;
}

/** PATCH /dragons/:id */
export class RenameDragonDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString() @Length(1, 24)
  nickname: string;
}

/** What the API returns for a dragon: hunger is the live value, not the stored one. */
export interface DragonView {
  id: string;
  species: string;
  nickname: string | null;
  stars: number;
  level: number;
  exp: number;
  hunger: number;
  hungry: boolean;
  createdAt: Date;
}

export function toDragonView(d: Dragon, now = new Date()): DragonView {
  const hunger = Math.round(currentHunger(d.hunger, d.hungerAt, now));
  return {
    id: d.id, species: d.species, nickname: d.nickname, stars: d.stars, level: d.level, exp: d.exp,
    hunger, hungry: isHungry(hunger), createdAt: d.createdAt,
  };
}
