import { Injectable } from '@nestjs/common';
import type { Dragon } from '../../generated/prisma/client.js';
import { BaseService } from '../../common/base/base.service.js';
import { BusinessRuleError, ErrorCode, NotFoundError } from '../../common/errors/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DragonsRepository, type DragonTypes } from './dragons.repository.js';
import { GUEST_ROSTER, STARTER_SPECIES, type DragonSpecies } from './dragon-species.js';
import type { ListDragonsQueryDto } from './dto/dragon.dto.js';
import { currentHunger, HUNGER, isHungry } from './hunger.js';

@Injectable()
export class DragonsService extends BaseService<DragonTypes> {
  protected readonly resourceName = 'Dragon';

  constructor(protected readonly repository: DragonsRepository, prisma: PrismaService) {
    super(repository, prisma);
  }

  listMine(ownerId: string, q: ListDragonsQueryDto) {
    return this.repository.findPageOwned(ownerId, q.page, q.pageSize, q.species);
  }

  /** A dragon of this player; someone else's dragon reads as not found (do not reveal it exists). */
  async getMine(id: string, ownerId: string): Promise<Dragon> {
    const dragon = await this.repository.findOwned(id, ownerId);
    if (!dragon) throw new NotFoundError(this.resourceName, id);
    return dragon;
  }

  async rename(id: string, ownerId: string, nickname: string) {
    await this.getMine(id, ownerId);
    return this.repository.update(id, { nickname });
  }

  /** Feed a hungry dragon one meal. Fails with DRAGON_NOT_HUNGRY when it is not hungry. */
  async feed(id: string, ownerId: string, now = new Date()) {
    const dragon = await this.getMine(id, ownerId);
    const hunger = currentHunger(dragon.hunger, dragon.hungerAt, now);
    if (!isHungry(hunger)) {
      throw new BusinessRuleError(ErrorCode.DRAGON_NOT_HUNGRY, 'This dragon is not hungry', { hunger: Math.round(hunger) });
    }
    return this.repository.update(id, { hunger: Math.min(HUNGER.full, hunger + HUNGER.meal), hungerAt: now });
  }

  /** Give a player a dragon (hatching, rewards, the starter). Joins the caller's transaction if any. */
  grant(ownerId: string, species: DragonSpecies, stars = 1) {
    return this.repository.create({ species, stars, owner: { connect: { id: ownerId } } });
  }

  grantStarter(ownerId: string) {
    return this.grant(ownerId, STARTER_SPECIES);
  }

  /** A guest's dragons: one of every species. */
  async grantGuestRoster(ownerId: string) {
    for (const species of GUEST_ROSTER) await this.grant(ownerId, species);
  }

  /** The species this player has at least one dragon of. */
  async speciesOwned(ownerId: string): Promise<Set<string>> {
    return new Set((await this.repository.findMany({ ownerId })).map(d => d.species));
  }
}
