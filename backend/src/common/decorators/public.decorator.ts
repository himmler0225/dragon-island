// Routes are authenticated by default (global JwtAuthGuard); @Public() opens one up.
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
