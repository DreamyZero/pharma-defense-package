import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type AuditRowDto = {
  time: string;
  user: string;
  action: string;
  entity: string;
  ip: string;
};

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async list(take = 100): Promise<AuditRowDto[]> {
    const rows = await this.prisma.auditLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });

    return rows.map(row => ({
      time: row.createdAt.toISOString(),
      user: row.user?.email ?? row.user?.fullName ?? '—',
      action: row.action,
      entity: [row.entityType, row.entityId].filter(Boolean).join(':') || '—',
      ip: row.ipAddress ?? '—',
    }));
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
