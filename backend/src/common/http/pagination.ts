// Pagination: PageQueryDto for ?page=&pageSize=, Page<T> for results. A handler that returns a Page is
// sent as { data: items, meta } by ResponseInterceptor.
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import type { PageMeta } from './api-response.js';

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;

  get skip() {
    return (this.page - 1) * this.pageSize;
  }
}

export class Page<T> {
  constructor(
    readonly items: T[],
    readonly total: number,
    readonly page: number,
    readonly pageSize: number,
  ) {}

  get meta(): PageMeta {
    return { page: this.page, pageSize: this.pageSize, total: this.total, totalPages: Math.ceil(this.total / this.pageSize) };
  }

  map<U>(fn: (item: T) => U): Page<U> {
    return new Page(this.items.map(fn), this.total, this.page, this.pageSize);
  }
}
