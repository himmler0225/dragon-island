import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '../../generated/prisma/client.js';
import { BaseRepository, type ModelTypes } from '../../common/base/base.repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type UserTypes = ModelTypes<User, Prisma.UserCreateInput, Prisma.UserUpdateInput, Prisma.UserWhereInput, Prisma.UserOrderByWithRelationInput>;

@Injectable()
export class UsersRepository extends BaseRepository<UserTypes> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.db.user;
  }

  findByEmail(email: string) {
    return this.model.findUnique({ where: { email } });
  }
}
