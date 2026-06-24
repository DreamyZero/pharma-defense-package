import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { spawn } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ImportStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GraphService } from '../graph/graph.service';

export interface EtlStatus {
  status: 'ok' | 'failed' | 'never_run';
  started_at?: string;
  finished_at?: string;
  source_file?: string;
  error?: string;
  metrics?: Record<string, number>;
}

export interface EtlReportMetric {
  key: string;
  label: string;
  value: number;
}

export interface EtlReport {
  status: EtlStatus;
  metrics: EtlReportMetric[];
  files: { html: boolean; csv: boolean };
  finishedAt?: string;
  outputDir: string;
}

const METRIC_LABELS: Record<string, string> = {
  drugs: 'Препараты',
  indications: 'Показания',
  contraindications: 'Противопоказания',
  side_effects: 'Побочные эффекты',
  analogs: 'Аналоги',
  interactions: 'Взаимодействия',
  synonyms: 'Синонимы',
};

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);
  private readonly etlOutputDir = this.resolveEtlOutputDir();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly graphService: GraphService,
  ) {
    this.logger.log(`ETL output dir: ${this.etlOutputDir}`);
  }

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
        status: ImportStatus.RUNNING,
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

    const pipeline = await this.executeEtlPipeline();
    const report = this.getEtlReport();
    const importStatus =
      pipeline.ok && report.status.status === 'ok'
        ? ImportStatus.COMPLETED
        : ImportStatus.FAILED;
    const recordsProcessed = report.status.metrics?.drugs ?? 0;
    const errorLog = pipeline.error ?? report.status.error ?? null;

    const updatedJob = await this.prisma.drugImport.update({
      where: { id: job.id },
      data: {
        status: importStatus,
        recordsProcessed,
        recordsFailed: importStatus === ImportStatus.FAILED ? 1 : 0,
        completedAt: new Date(),
        errorLog,
      },
    });

    return {
      message: pipeline.ok
        ? 'ETL выполнен: Python → PostgreSQL → Neo4j'
        : `ETL не завершён: ${errorLog ?? 'неизвестная ошибка'}`,
      job: { ...updatedJob, auditId: auditEntry.id },
      report,
      pipeline,
    };
  }

  async clearImports(userId?: number, ipAddress?: string): Promise<{
    deleted: number;
    outputFilesRemoved: number;
  }> {
    const { count } = await this.prisma.drugImport.deleteMany();
    const outputFilesRemoved = this.clearEtlOutputFiles();
    await this.audit.log({
      userId,
      action: 'ETL_IMPORTS_CLEAR',
      entityType: 'DrugImport',
      ipAddress,
      newValues: { deleted: count, outputFilesRemoved },
    });
    return { deleted: count, outputFilesRemoved };
  }

  async syncFromFilesystem() {
    const updated = await this.syncJobsFromFilesystem();
    return {
      updated,
      report: this.getEtlReport(),
    };
  }

  getEtlStatus(): EtlStatus {
    const statusPath = join(this.etlOutputDir, 'etl_status.json');
    if (!existsSync(statusPath)) {
      return {
        status: 'never_run',
        error: `etl_status.json не найден (${this.etlOutputDir}). Запустите: cd etl/src && python run_etl.py`,
      };
    }
    try {
      const raw = readFileSync(statusPath, 'utf-8');
      return JSON.parse(raw) as EtlStatus;
    } catch (err) {
      this.logger.warn(`etl_status.json: ${(err as Error).message}`);
      return {
        status: 'failed',
        error: (err as Error).message,
      };
    }
  }

  getEtlReport(): EtlReport {
    const status = this.getEtlStatus();
    const csvPath = join(this.etlOutputDir, 'etl_report.csv');
    const metrics = this.readMetricsCsv(csvPath, status.metrics);

    return {
      status,
      metrics,
      files: {
        html: this.canProvideEtlHtml(status),
        csv: existsSync(csvPath),
      },
      finishedAt: status.finished_at,
      outputDir: this.etlOutputDir,
    };
  }

  getEtlReportHtml(): string {
    return this.ensureEtlReportHtml();
  }

  getEtlReportCsv(): string {
    const csvPath = join(this.etlOutputDir, 'etl_report.csv');
    if (!existsSync(csvPath)) {
      throw new NotFoundException(
        'CSV-отчёт не найден. Запустите: cd etl/src && python run_etl.py',
      );
    }
    return readFileSync(csvPath, 'utf-8');
  }

  private async syncJobsFromFilesystem(): Promise<{ updated: number; status: EtlStatus }> {
    const status = this.getEtlStatus();
    if (status.status === 'never_run') {
      return { updated: 0, status };
    }

    const running = await this.prisma.drugImport.findMany({
      where: { status: ImportStatus.RUNNING },
      orderBy: { startedAt: 'desc' },
    });

    if (running.length === 0) {
      return { updated: 0, status };
    }

    const recordsProcessed = status.metrics?.drugs ?? 0;
    const importStatus =
      status.status === 'ok' ? ImportStatus.COMPLETED : ImportStatus.FAILED;
    const completedAt = status.finished_at ? new Date(status.finished_at) : new Date();

    for (const job of running) {
      await this.prisma.drugImport.update({
        where: { id: job.id },
        data: {
          status: importStatus,
          recordsProcessed,
          recordsFailed: status.status === 'failed' ? 1 : 0,
          completedAt,
          errorLog: status.error ?? null,
        },
      });
    }

    return { updated: running.length, status };
  }

  private async executeEtlPipeline(): Promise<{
    ok: boolean;
    error?: string;
    stages: string[];
  }> {
    const etlRoot = this.resolveEtlRoot();
    const scriptPath = join(etlRoot, 'src', 'run_etl.py');
    if (!existsSync(scriptPath)) {
      return {
        ok: false,
        error: `Скрипт не найден: ${scriptPath}`,
        stages: [],
      };
    }

    const python = this.resolvePython();
    const stages: string[] = [];
    const etlSrcDir = join(etlRoot, 'src');
    const parseScriptPath = join(etlSrcDir, 'parse_sources.py');

    if (existsSync(parseScriptPath)) {
      const parseRun = await this.runProcess(
        python,
        ['parse_sources.py', '--grls', '--rxnorm'],
        etlSrcDir,
        {
          PYTHONUTF8: '1',
          FETCH_GRLS: '1',
          FETCH_RXNORM: '1',
          GRLS_MERGE_LIMIT: process.env.GRLS_MERGE_LIMIT || '100',
          RXNORM_LIMIT: process.env.RXNORM_LIMIT || '50',
        },
      );
      stages.push('parse_sources');
      if (parseRun.code !== 0) {
        const detail = (parseRun.stderr || parseRun.stdout).trim();
        return {
          ok: false,
          error: detail || 'parse_sources.py завершился с ошибкой',
          stages,
        };
      }
      this.logger.log(`parse_sources: ${parseRun.stdout.trim().split('\n').pop() ?? 'ok'}`);
    }

    const etlRun = await this.runProcess(python, ['run_etl.py'], etlSrcDir, {
      PYTHONUTF8: '1',
    });
    stages.push('python');
    if (etlRun.code !== 0) {
      const detail = (etlRun.stderr || etlRun.stdout).trim();
      return {
        ok: false,
        error: detail || 'Python ETL завершился с ошибкой',
        stages,
      };
    }

    const backendRoot = this.resolveBackendRoot();
    const loadRun = await this.runProcess(
      'npx',
      ['ts-node', 'prisma/run-etl-load.ts'],
      backendRoot,
      {
        ETL_DIR: etlRoot,
        ETL_PROCESSED_DIR: join(etlRoot, 'data', 'processed'),
      },
      true,
    );
    stages.push('postgres');
    if (loadRun.code !== 0) {
      const detail = (loadRun.stderr || loadRun.stdout).trim();
      return {
        ok: false,
        error: detail || 'Загрузка в PostgreSQL завершилась с ошибкой',
        stages,
      };
    }

    try {
      await this.graphService.syncFromPostgres();
      stages.push('neo4j');
    } catch (err) {
      this.logger.warn(`Neo4j sync: ${(err as Error).message}`);
      stages.push('neo4j_skipped');
    }

    try {
      this.ensureEtlReportHtml();
      stages.push('html');
    } catch (err) {
      this.logger.warn(`HTML report: ${(err as Error).message}`);
    }

    const status = this.getEtlStatus();
    return {
      ok: status.status === 'ok',
      error: status.status === 'ok' ? undefined : status.error,
      stages,
    };
  }

  private canProvideEtlHtml(status: EtlStatus): boolean {
    const htmlPath = join(this.etlOutputDir, 'demo_report.html');
    return existsSync(htmlPath) || status.status === 'ok' || Boolean(status.metrics);
  }

  private ensureEtlReportHtml(): string {
    const htmlPath = join(this.etlOutputDir, 'demo_report.html');
    if (existsSync(htmlPath)) {
      return readFileSync(htmlPath, 'utf-8');
    }

    const status = this.getEtlStatus();
    if (status.status === 'never_run') {
      throw new NotFoundException('HTML-отчёт недоступен: ETL ещё не запускался');
    }

    const html = this.buildEtlReportHtml(status);
    writeFileSync(htmlPath, html, 'utf-8');
    return html;
  }

  private buildEtlReportHtml(status: EtlStatus): string {
    const metrics = status.metrics ?? {};
    const metricLabels = METRIC_LABELS;
    const ok = status.status === 'ok';
    const now = new Date().toLocaleString('ru-RU');
    const samples = this.readSampleDrugs(8);

    const metricCards = Object.entries(metrics)
      .map(([key, value]) => {
        const label = this.escapeHtml(metricLabels[key] ?? key);
        return `<div class="metric"><b>${value}</b>${label}</div>`;
      })
      .join('');

    const drugCards = samples
      .map((drug) => `
        <article class="drug">
          <h3>${this.escapeHtml(drug.trade_name ?? '')}</h3>
          <p><b>МНН:</b> ${this.escapeHtml(drug.substance ?? '')}</p>
          <p><b>АТХ:</b> ${this.escapeHtml(drug.atc ?? '')} · <b>Группа:</b> ${this.escapeHtml(drug.group ?? '')}</p>
          <p><b>Дозировка:</b> ${this.escapeHtml(drug.dosage_adult ?? '')}</p>
          <p><b>Показания:</b> ${this.escapeHtml(drug.indications ?? '')}</p>
        </article>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>PharmaBase — отчёт ETL</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }
    h1 { color: #38bdf8; }
    .status { padding: 1rem 1.25rem; border-radius: 12px; background: ${ok ? '#14532d' : '#7f1d1d'}; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .metric { background: #1e293b; padding: 1rem; border-radius: 10px; text-align: center; }
    .metric b { font-size: 1.5rem; display: block; color: #38bdf8; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .drug { background: #1e293b; padding: 1rem; border-radius: 10px; border-left: 4px solid #38bdf8; }
  </style>
</head>
<body>
  <h1>Отчёт ETL PharmaBase</h1>
  <p>Сформировано: ${this.escapeHtml(now)}</p>
  <p>Источник: ${this.escapeHtml(status.source_file ?? '—')}</p>
  <div class="status">Статус пайплайна: <strong>${this.escapeHtml(status.status)}</strong></div>
  ${status.error ? `<p>${this.escapeHtml(status.error)}</p>` : ''}
  <div class="metrics">${metricCards}</div>
  <h2>Примеры из каталога</h2>
  <div class="grid">${drugCards}</div>
</body>
</html>`;
  }

  private readSampleDrugs(limit = 8): Array<Record<string, string>> {
    const catalogPath = join(this.resolveEtlRoot(), 'data', 'samples', 'drugs_catalog.json');
    if (!existsSync(catalogPath)) return [];

    try {
      const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8')) as Array<Record<string, string>>;
      return catalog.slice(0, limit);
    } catch (err) {
      this.logger.warn(`drugs_catalog.json: ${(err as Error).message}`);
      return [];
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private runProcess(
    command: string,
    args: string[],
    cwd: string,
    extraEnv: Record<string, string> = {},
    useShell = false,
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...extraEnv },
        shell: useShell,
      });

      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (chunk) => { stdout += String(chunk); });
      child.stderr?.on('data', (chunk) => { stderr += String(chunk); });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });
  }

  private resolveEtlRoot(): string {
    if (process.env.ETL_DIR) return process.env.ETL_DIR;

    const candidates = [
      join(process.cwd(), '..', 'etl'),
      join(process.cwd(), 'etl'),
      '/etl',
    ];

    for (const dir of candidates) {
      if (existsSync(join(dir, 'src', 'run_etl.py'))) return dir;
    }

    return candidates[0];
  }

  private resolveBackendRoot(): string {
    const candidates = [
      process.cwd(),
      join(__dirname, '..', '..'),
      join(__dirname, '..', '..', '..'),
    ];

    for (const dir of candidates) {
      if (existsSync(join(dir, 'prisma', 'run-etl-load.ts'))) return dir;
    }

    return process.cwd();
  }

  private resolvePython(): string {
    return process.env.ETL_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  }

  private clearEtlOutputFiles(): number {
    const files = ['etl_status.json', 'etl_report.csv', 'demo_report.html'];
    let removed = 0;

    for (const file of files) {
      const path = join(this.etlOutputDir, file);
      if (existsSync(path)) {
        unlinkSync(path);
        removed++;
      }
    }

    return removed;
  }

  private resolveEtlOutputDir(): string {
    if (process.env.ETL_OUTPUT_DIR) {
      return process.env.ETL_OUTPUT_DIR;
    }

    const candidates = [
      join(__dirname, '..', '..', '..', '..', 'etl', 'output'),
      join(process.cwd(), '..', 'etl', 'output'),
      join(process.cwd(), 'etl', 'output'),
    ];

    for (const dir of candidates) {
      if (existsSync(join(dir, 'etl_status.json')) || existsSync(join(dir, 'etl_report.csv'))) {
        return dir;
      }
    }

    return candidates[0];
  }

  private readMetricsCsv(
    csvPath: string,
    fallback?: Record<string, number>,
  ): EtlReportMetric[] {
    if (existsSync(csvPath)) {
      try {
        const lines = readFileSync(csvPath, 'utf-8').trim().split(/\r?\n/);
        if (lines.length > 1) {
          return lines.slice(1).map(line => {
            const [key, value] = line.split(',');
            const k = (key ?? '').trim();
            const v = parseInt((value ?? '').trim(), 10);
            return {
              key: k,
              label: METRIC_LABELS[k] ?? k,
              value: Number.isFinite(v) ? v : 0,
            };
          });
        }
      } catch (err) {
        this.logger.warn(`etl_report.csv: ${(err as Error).message}`);
      }
    }

    if (fallback) {
      return Object.entries(fallback).map(([key, value]) => ({
        key,
        label: METRIC_LABELS[key] ?? key,
        value,
      }));
    }

    return [];
  }
}
