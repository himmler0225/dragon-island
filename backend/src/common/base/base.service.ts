// Base service: the lookups every service repeats, turning "not there" into a NotFoundError. Business
// rules go in the subclass; anything that writes more than one row goes through `this.transaction`.
import { NotFoundError } from '../errors/index.js';
import type { BaseRepository, ModelTypes } from './base.repository.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

export abstract class BaseService<T extends ModelTypes> {
  /** shown in errors: "Dragon 42 not found" */
  protected abstract readonly resourceName: string;

  constructor(
    protected readonly repository: BaseRepository<T>,
    protected readonly prisma: PrismaService,
  ) {}

  async getById(id: string): Promise<T['model']> {
    const found = await this.repository.findById(id);
    if (!found) throw new NotFoundError(this.resourceName, id);
    return found;
  }

  async getOne(where: T['where']): Promise<T['model']> {
    const found = await this.repository.findOne(where);
    if (!found) throw new NotFoundError(this.resourceName);
    return found;
  }

  protected transaction<R>(fn: () => Promise<R>): Promise<R> {
    return this.prisma.transaction(fn);
  }
}
