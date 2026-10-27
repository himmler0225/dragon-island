// Global ValidationPipe: DTOs are classes with class-validator decorators; unknown fields are rejected and
// failures come back as a VALIDATION_FAILED error listing each field.
import { ValidationPipe, type ValidationError as ClassValidatorError } from '@nestjs/common';
import { ValidationError, type FieldError } from './errors/index.js';

function flatten(errors: ClassValidatorError[], parent = ''): FieldError[] {
  return errors.flatMap(e => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = e.constraints ? [{ field, messages: Object.values(e.constraints) }] : [];
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

export const appValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: errors => new ValidationError(flatten(errors)),
  });
