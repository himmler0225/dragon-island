import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AppConfig } from './config/app-config.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // the rig editor's eraser masks are PNGs sent as JSON: more than the default 100 kB
  app.useBodyParser('json', { limit: '40mb' });   // (a save sends every changed mask at once)
  const config = app.get(AppConfig);
  // every route lives under /api (e.g. GET /api/health)
  app.setGlobalPrefix('api');
  // the Next.js frontend runs on its own origin in development
  app.enableCors({ origin: config.get('FRONTEND_ORIGIN') });
  app.enableShutdownHooks();
  await app.listen(config.get('PORT'));
  Logger.log(`API on http://localhost:${config.get('PORT')}/api`, 'Bootstrap');
}
await bootstrap();
