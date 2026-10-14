import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // every route lives under /api (e.g. GET /api/health)
  app.setGlobalPrefix('api');
  // the Next.js frontend runs on its own origin in development
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000' });
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
