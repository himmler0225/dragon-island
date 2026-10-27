// Every error the API returns carries one of these codes; the frontend switches on the code, never on the
// message. Add domain codes here (grouped by module) as features land.
export const ErrorCode = {
  // generic
  INTERNAL: 'INTERNAL',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  // auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_TAKEN: 'AUTH_EMAIL_TAKEN',
  // dragons
  DRAGON_NOT_HUNGRY: 'DRAGON_NOT_HUNGRY',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
