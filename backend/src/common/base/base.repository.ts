// Base repository: the CRUD every table needs, on top of one Prisma model delegate. A module's repository
// names its model's types and delegate, and adds the queries specific to it:
//
//   export type DragonTypes = ModelTypes<Dragon, Prisma.DragonCreateInput, Prisma.DragonUpdateInput,
//     Prisma.DragonWhereInput, Prisma.DragonOrderByWithRelationInput>;
//
//   @Injectable()
//   export class DragonsRepository extends BaseRepository<DragonTypes> {
//     protected get model() { return this.prisma.db.dragon; }
//     findOwned(id: string, ownerId: string) { ... }
//   }
//
// Repositories only talk to the database: no business rules, no AppErrors (that is the service's job).
// They always go through `prisma.db`, so they join any open transaction (PrismaService.transaction).
import { PrismaService } from '../../prisma/prisma.service.js';
import { Page } from '../http/pagination.js';

/** The Prisma types of one model, bundled so base classes take a single type parameter. */
export interface ModelTypes<TModel = unknown, TCreate = unknown, TUpdate = unknown, TWhere = unknown, TOrderBy = unknown> {
  model: TModel;
  create: TCreate;
  update: TUpdate;
  where: TWhere;
  orderBy: TOrderBy;
}

type OrderBy<T extends ModelTypes> = T['orderBy'] | T['orderBy'][];

/** The part of a Prisma model delegate (prisma.user, prisma.dragon, ...) the base class uses. */
export interface ModelDelegate<T extends ModelTypes> {
  findUnique(args: { where: { id: string } }): Promise<T['model'] | null>;
  findFirst(args: { where?: T['where']; orderBy?: OrderBy<T> }): Promise<T['model'] | null>;
  findMany(args: { where?: T['where']; orderBy?: OrderBy<T>; skip?: number; take?: number }): Promise<T['model'][]>;
  count(args: { where?: T['where'] }): Promise<number>;
  create(args: { data: T['create'] }): Promise<T['model']>;
  update(args: { where: { id: string }; data: T['update'] }): Promise<T['model']>;
  delete(args: { where: { id: string } }): Promise<T['model']>;
}

export interface FindPageOptions<T extends ModelTypes> {
  where?: T['where'];
  orderBy?: OrderBy<T>;
  page: number;
  pageSize: number;
}

export abstract class BaseRepository<T extends ModelTypes> {
  constructor(protected readonly prisma: PrismaService) {}

  /** e.g. `return this.prisma.db.dragon` (a getter, so it picks up the open transaction each call) */
  protected abstract get model(): ModelDelegate<T>;

  findById(id: string): Promise<T['model'] | null> {
    return this.model.findUnique({ where: { id } });
  }

  findOne(where: T['where'], orderBy?: OrderBy<T>): Promise<T['model'] | null> {
    return this.model.findFirst({ where, orderBy });
  }

  findMany(where?: T['where'], orderBy?: OrderBy<T>): Promise<T['model'][]> {
    return this.model.findMany({ where, orderBy });
  }

  async findPage({ where, orderBy, page, pageSize }: FindPageOptions<T>): Promise<Page<T['model']>> {
    const [items, total] = await Promise.all([
      this.model.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.model.count({ where }),
    ]);
    return new Page(items, total, page, pageSize);
  }

  count(where?: T['where']): Promise<number> {
    return this.model.count({ where });
  }

  async exists(where: T['where']): Promise<boolean> {
    return (await this.model.count({ where })) > 0;
  }

  create(data: T['create']): Promise<T['model']> {
    return this.model.create({ data });
  }

  update(id: string, data: T['update']): Promise<T['model']> {
    return this.model.update({ where: { id }, data });
  }

  delete(id: string): Promise<T['model']> {
    return this.model.delete({ where: { id } });
  }
}
