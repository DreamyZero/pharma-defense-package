import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface EtlStatus {
  status: 'ok' | 'failed' | 'never_run';
  started_at?: string;
  finished_at?: string;
  source_file?: string;
  error?: string;
  metrics?: Record<string, number>;
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.drugImport.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { email: true } } },
    });
  }

  async run(source: string, userId?: number, ipAddress?: string) {
    const job = await this.prisma.drugImport.create({
      data: {
        source,
        status: 'RUNNING',
        recordsProcessed: 0,
        recordsFailed: 0,
        startedAt: new Date(),
        createdBy: userId ?? null,
      },
    });

    const auditEntry = await this.audit.log({
      userId,
      action: 'ETL_RUN',
      entityType: 'DrugImport',
      entityId: String(job.id),
      newValues: { source, jobId: job.id },
      ipAddress,
    });

    await this.prisma.drugImport.update({
      where: { id: job.id },
      data: { auditId: auditEntry.id },
    });

    return { message: 'ETL import started', job: { ...job, auditId: auditEntry.id } };
  }

  getEtlStatus(): EtlStatus {
    const statusPath = join(__dirname, '..', '..', '..', '..', 'etl', 'output', 'etl_status.json');
    try {
      const raw = readFileSync(statusPath, 'utf-8');
      return JSON.parse(raw) as EtlStatus;
    } catch (err) {
      this.logger.warn(`etl_status.json не найден: ${(err as Error).message}`);
      return {
        status: 'never_run',
        error: 'etl_status.json не найден. Запустите: cd etl/src && python run_etl.py',
      };
    }
  }
}
