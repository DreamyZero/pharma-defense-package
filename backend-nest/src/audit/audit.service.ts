import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async list(take = 100) {
    return this.prisma.auditLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
  }

  async log(data: {
    userId?: number;
    action: string;
    entityType?: string;
    entityId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }
}
