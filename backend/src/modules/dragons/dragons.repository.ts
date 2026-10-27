import { Injectable } from '@nestjs/common';
import type { Dragon, Prisma } from '../../generated/prisma/client.js';
import { BaseRepository, type ModelTypes } from '../../common/base/base.repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type DragonTypes = ModelTypes<Dragon, Prisma.DragonCreateInput, Prisma.DragonUpdateInput, Prisma.DragonWhereInput, Prisma.DragonOrderByWithRelationInput>;

@Injectable()
export class DragonsRepository extends BaseRepository<DragonTypes> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.db.dragon;
  }

  findOwned(id: string, ownerId: string) {
    return this.model.findFirst({ where: { id, ownerId } });
  }

  findPageOwned(ownerId: string, page: number, pageSize: number, species?: string) {
    return this.findPage({ where: { ownerId, species }, orderBy: [{ stars: 'desc' }, { createdAt: 'asc' }], page, pageSize });
  }
}
