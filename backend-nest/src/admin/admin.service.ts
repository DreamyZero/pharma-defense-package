import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  users() {
    return this.prisma.user.findMany({
      select: { id: true, fullName: true, email: true, role: true, organization: true, verified: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  etl() {
    return this.prisma.drugImport.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { email: true } } },
    });
  }

  async setRole(
    userId: number,
    role: 'DOCTOR' | 'PHARMACIST' | 'ADMIN',
    actorId?: number,
    ipAddress?: string,
  ) {
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!before) throw new NotFoundException('Пользователь не найден');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: { id: true, email: true, role: true },
    });

    await this.audit.log({
      userId: actorId,
      action: 'USER_ROLE_CHANGE',
      entityType: 'User',
      entityId: String(userId),
      oldValues: { role: before.role, email: before.email },
      newValues: { role: updated.role, email: updated.email },
      ipAddress,
    });

    return updated;
  }

  async updateUser(
    userId: number,
    dto: AdminUpdateUserDto,
    actorId?: number,
    ipAddress?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (exists) throw new ConflictException('Email уже занят');
    }

    const data: { email?: string; passwordHash?: string } = {};
    if (dto.email) data.email = dto.email;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    if (!data.email && !data.passwordHash) {
      return this.users().then(list => list.find(u => u.id === userId));
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        organization: true,
        verified: true,
        createdAt: true,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'USER_UPDATE',
      entityType: 'User',
      entityId: String(userId),
      oldValues: { email: user.email },
      newValues: {
        email: updated.email,
        passwordChanged: !!dto.password,
      },
      ipAddress,
    });

    return updated;
  }
}
