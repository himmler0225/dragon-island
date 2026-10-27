// One place that turns anything thrown into the standard error response:
//   AppError        -> its own code/status
//   HttpException   -> mapped by status (Nest's own 404 for unknown routes, body parser errors, ...)
//   Prisma errors   -> unique violation = 409, record not found = 404
//   anything else   -> 500, details hidden from the client, full error logged
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { AppError, ConflictError, ErrorCode, NotFoundError } from '../errors/index.js';
import type { ApiError } from '../http/api-response.js';

const STATUS_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const error = this.toAppError(exception);

    if (!error.isClientError) {
      this.logger.error(`${req.method} ${req.originalUrl} [${req.id}] ${error.message}`, (error.cause as Error | undefined)?.stack ?? error.stack);
    }
    const body: ApiError = {
      error: { code: error.code, message: error.message, ...(error.details !== undefined && { details: error.details }) },
      requestId: req.id,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    };
    res.status(error.status).json(body);
  }

  private toAppError(e: unknown): AppError {
    if (e instanceof AppError) return e;
    if (e instanceof HttpException) {
      const status = e.getStatus();
      return new AppError(STATUS_CODE[status] ?? ErrorCode.INTERNAL, e.message, status, { cause: e });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') return new ConflictError('Resource already exists', ErrorCode.CONFLICT, { cause: e, details: e.meta });
      if (e.code === 'P2025') return new NotFoundError('Resource');
    }
    return new AppError(ErrorCode.INTERNAL, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, { cause: e });
  }
}
