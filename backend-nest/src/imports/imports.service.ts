import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

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

  /**
   * Читает etl/output/etl_status.json, который записывается скриптом run_etl.py.
   * Позволяет в любой момент проверить, отработал ли ETL и сколько записей загружено.
   */
  getEtlStatus(): EtlStatus {
    // Путь относительно корня монорепозитория (backend-nest/src/imports → ../../.. → root)
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
