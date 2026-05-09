import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

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
}
