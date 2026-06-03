import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email уже зарегистрирован');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        organization: dto.organization,
        role: (dto.role as any) || 'DOCTOR',
      },
    });

    await this.audit.log({
      userId: user.id,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: String(user.id),
      newValues: { email: user.email, role: user.role },
      ipAddress,
    }).catch(() => {});

    return this.sign(user.id, user.email, user.role);
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    await this.audit.log({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: String(user.id),
      newValues: { email: user.email, role: user.role },
      ipAddress,
    }).catch(() => {});

    return this.sign(user.id, user.email, user.role);
  }

  async profile(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, role: true, organization: true, verified: true, createdAt: true },
    });
  }

  private sign(id: number, email: string, role: string) {
    return {
      access_token: this.jwt.sign({ sub: id, email, role }),
      role,
      userId: id,
    };
  }
}
