// Gives every request an id (taken from X-Request-Id when the client sends one), echoes it back in the
// response header, and makes it available to error responses and logs.
import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(REQUEST_ID_HEADER);
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    req.id = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}
