import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  users() {
    return this.prisma.user.findMany({
      select: { id: true, fullName: true, email: true, role: true, organization: true, verified: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  audit() {
    return this.prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, fullName: true } } },
    });
  }

  etl() {
    return this.prisma.drugImport.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { email: true } } },
    });
  }

  async setRole(userId: number, role: 'DOCTOR' | 'PHARMACIST' | 'ADMIN') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: { id: true, email: true, role: true },
    });
  }

  async updateUser(userId: number, dto: AdminUpdateUserDto) {
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

    return this.prisma.user.update({
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
  }
}
