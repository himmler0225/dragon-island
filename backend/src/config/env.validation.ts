// Environment variables: validated once at boot, so a missing or bad value fails fast with a clear message.
// reflect-metadata must load before class-transformer can read the decorator types (unit/e2e entry
// points do not always pull it in transitively before validation runs).
import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsInt, IsString, IsUrl, Max, Min, MinLength, validateSync } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class Env {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt() @Min(1) @Max(65535)
  PORT = 4000;

  @IsUrl({ require_tld: false })
  FRONTEND_ORIGIN = 'http://localhost:3000';

  @IsString()
  DATABASE_URL: string;

  @IsString() @MinLength(32)
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN = '7d';
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { enableImplicitConversion: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    const lines = errors.map(e => `  ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
    throw new Error(`Invalid environment:\n${lines.join('\n')}`);
  }
  return env;
}
