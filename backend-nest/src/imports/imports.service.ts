import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.drugImport.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { email: true } } },
    });
  }

  async run(source: string, userId?: number) {
    const job = await this.prisma.drugImport.create({
      data: {
        source,
        status: 'RUNNING',
        recordsProcessed: 0,
        recordsFailed: 0,
        startedAt: new Date(),
        createdBy: userId || null,
      },
    });
    return { message: 'ETL import started', job };
  }
}
