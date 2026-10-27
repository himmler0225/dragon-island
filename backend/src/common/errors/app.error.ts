// Base error for everything the app throws on purpose. Services throw these (never HttpException):
// the HTTP status lives here, and AllExceptionsFilter turns them into the standard error response.
import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.js';

export interface AppErrorOptions {
  /** extra data for the client, e.g. which fields failed */
  details?: unknown;
  /** the underlying error, logged but never sent to the client */
  cause?: unknown;
}

export class AppError extends Error {
  readonly details?: unknown;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    options: AppErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.details = options.details;
  }

  /** 4xx errors are the client's doing and are not logged as failures */
  get isClientError() {
    return this.status < 500;
  }
}
