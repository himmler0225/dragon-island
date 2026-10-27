// Wraps every successful response as { data } (or { data, meta } for a Page). Handlers just return the
// value. A handler that must send something else (a file, a redirect) uses @RawResponse().
import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import type { ApiSuccess } from '../http/api-response.js';
import { Page } from '../http/pagination.js';

const RAW_RESPONSE = 'rawResponse';
export const RawResponse = () => SetMetadata(RAW_RESPONSE, true);

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE, [ctx.getHandler(), ctx.getClass()]);
    if (raw) return next.handle();
    return next.handle().pipe(
      map((value): ApiSuccess<unknown> => (value instanceof Page ? { data: value.items, meta: value.meta } : { data: value ?? null })),
    );
  }
}
