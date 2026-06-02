import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../database/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

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
        createdBy: userId ?? null,
      },
    });
    return { message: 'ETL import started', job };
  }

  /**
   * Читает etl/output/etl_status.json (пишется run_etl.py).
   */
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
