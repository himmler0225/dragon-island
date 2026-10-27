// The Prisma client, plus transactions that need no plumbing: inside `prisma.transaction(fn)` every
// repository call made by `fn` (and the services it calls) runs in the same transaction, because
// repositories go through `prisma.db`, which returns the open transaction client when there is one.
import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { AppConfig } from '../config/app-config.service.js';

export type Db = Prisma.TransactionClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly tx = new AsyncLocalStorage<Db>();

  constructor(config: AppConfig) {
    super({ adapter: new PrismaPg({ connectionString: config.get('DATABASE_URL') }) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** The client to query with: the current transaction if one is open, else the plain client. */
  get db(): Db {
    return this.tx.getStore() ?? this;
  }

  /** Run `fn` in one transaction (nested calls join the outer one). Throwing rolls everything back. */
  transaction<T>(fn: () => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel; timeout?: number }): Promise<T> {
    if (this.tx.getStore()) return fn();
    return this.$transaction(client => this.tx.run(client, fn), options);
  }
}
