import { Injectable } from '@nestjs/common';
import type { User } from '../../generated/prisma/client.js';
import { BaseService } from '../../common/base/base.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersRepository, type UserTypes } from './users.repository.js';

/** What the API shows of a user (never the password hash). */
export type PublicUser = Omit<User, 'passwordHash'>;
export function toPublicUser(user: User): PublicUser {
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest;
}

@Injectable()
export class UsersService extends BaseService<UserTypes> {
  protected readonly resourceName = 'User';

  constructor(protected readonly repository: UsersRepository, prisma: PrismaService) {
    super(repository, prisma);
  }

  findByEmail(email: string) {
    return this.repository.findByEmail(email.toLowerCase());
  }

  create(data: { email: string; passwordHash: string; displayName: string }) {
    return this.repository.create({ ...data, email: data.email.toLowerCase() });
  }
}
