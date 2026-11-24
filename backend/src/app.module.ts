import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { appValidationPipe } from './common/pipes.js';
import { AppConfigModule } from './config/config.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DragonsModule } from './modules/dragons/dragons.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { TeamsModule } from './modules/teams/teams.module.js';
import { RigTweaksModule } from './modules/rig-tweaks/rig-tweaks.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule, AuthModule, UsersModule, DragonsModule, RigTweaksModule, TeamsModule],
  providers: [
    // registered here (not in main.ts) so e2e tests get exactly the same pipeline
    { provide: APP_PIPE, useFactory: appValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
