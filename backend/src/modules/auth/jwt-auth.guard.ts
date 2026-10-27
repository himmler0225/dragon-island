// Global guard: every route needs "Authorization: Bearer <token>" unless it is marked @Public().
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { IS_PUBLIC } from '../../common/decorators/public.decorator.js';
import { UnauthorizedError } from '../../common/errors/index.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = req.header('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedError();
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(token);
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
