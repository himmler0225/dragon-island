import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { ConflictError, ErrorCode, UnauthorizedError } from '../../common/errors/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DragonsService } from '../dragons/dragons.service.js';
import { toPublicUser, UsersService } from '../users/users.service.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { hashPassword, verifyPassword } from './password.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly dragons: DragonsService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.findByEmail(dto.email)) throw new ConflictError('Email already registered', ErrorCode.AUTH_EMAIL_TAKEN);
    const passwordHash = await hashPassword(dto.password);
    // the account and its starter dragon are created together or not at all
    const user = await this.prisma.transaction(async () => {
      const created = await this.users.create({ email: dto.email, displayName: dto.displayName, passwordHash });
      await this.dragons.grantStarter(created.id);
      return created;
    });
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    // same error whether the email or the password is wrong: do not reveal which accounts exist
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedError('Wrong email or password', ErrorCode.AUTH_INVALID_CREDENTIALS);
    }
    return this.session(user);
  }

  async me(auth: AuthUser) {
    return toPublicUser(await this.users.getById(auth.id));
  }

  private async session(user: Parameters<typeof toPublicUser>[0]) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: toPublicUser(user) };
  }
}
