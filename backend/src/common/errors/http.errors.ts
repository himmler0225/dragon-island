// The common error kinds. Pass a domain code for anything the client should tell apart, e.g.
// `new ConflictError('Email already registered', ErrorCode.AUTH_EMAIL_TAKEN)`.
import { HttpStatus } from '@nestjs/common';
import { AppError, type AppErrorOptions } from './app.error.js';
import { ErrorCode } from './error-codes.js';

export interface FieldError { field: string; messages: string[] }

export class ValidationError extends AppError {
  constructor(fields: FieldError[], message = 'Request validation failed') {
    super(ErrorCode.VALIDATION_FAILED, message, HttpStatus.BAD_REQUEST, { details: { fields } });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number, code: ErrorCode = ErrorCode.NOT_FOUND) {
    super(code, id === undefined ? `${resource} not found` : `${resource} ${id} not found`, HttpStatus.NOT_FOUND, {
      details: { resource, id },
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.CONFLICT, options?: AppErrorOptions) {
    super(code, message, HttpStatus.CONFLICT, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code: ErrorCode = ErrorCode.UNAUTHORIZED) {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Not allowed', code: ErrorCode = ErrorCode.FORBIDDEN) {
    super(code, message, HttpStatus.FORBIDDEN);
  }
}

/** A request that is well-formed but breaks a game rule (not enough stones, dragon not hungry, ...). */
export class BusinessRuleError extends AppError {
  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(code, message, HttpStatus.UNPROCESSABLE_ENTITY, { details });
  }
}
