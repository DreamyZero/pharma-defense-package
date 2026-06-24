"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ImportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportsService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const graph_service_1 = require("../graph/graph.service");
const METRIC_LABELS = {
    drugs: 'Препараты',
    indications: 'Показания',
    contraindications: 'Противопоказания',
    side_effects: 'Побочные эффекты',
    analogs: 'Аналоги',
    interactions: 'Взаимодействия',
    synonyms: 'Синонимы',
};
let ImportsService = ImportsService_1 = class ImportsService {
    constructor(prisma, audit, graphService) {
        this.prisma = prisma;
        this.audit = audit;
        this.graphService = graphService;
        this.logger = new common_1.Logger(ImportsService_1.name);
        this.etlOutputDir = this.resolveEtlOutputDir();
        this.logger.log(`ETL output dir: ${this.etlOutputDir}`);
    }
    list() {
        return this.prisma.drugImport.findMany({
            take: 30,
            orderBy: { createdAt: 'desc' },
            include: { creator: { select: { email: true } } },
        });
    }
    async run(source, userId, ipAddress) {
        const job = await this.prisma.drugImport.create({
            data: {
                source,
                status: client_1.ImportStatus.RUNNING,
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
        const importStatus = pipeline.ok && report.status.status === 'ok'
            ? client_1.ImportStatus.COMPLETED
            : client_1.ImportStatus.FAILED;
        const recordsProcessed = report.status.metrics?.drugs ?? 0;
        const errorLog = pipeline.error ?? report.status.error ?? null;
        const updatedJob = await this.prisma.drugImport.update({
            where: { id: job.id },
            data: {
                status: importStatus,
                recordsProcessed,
                recordsFailed: importStatus === client_1.ImportStatus.FAILED ? 1 : 0,
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
    async clearImports(userId, ipAddress) {
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
    getEtlStatus() {
        const statusPath = (0, path_1.join)(this.etlOutputDir, 'etl_status.json');
        if (!(0, fs_1.existsSync)(statusPath)) {
            return {
                status: 'never_run',
                error: `etl_status.json не найден (${this.etlOutputDir}). Запустите: cd etl/src && python run_etl.py`,
            };
        }
        try {
            const raw = (0, fs_1.readFileSync)(statusPath, 'utf-8');
            return JSON.parse(raw);
        }
        catch (err) {
            this.logger.warn(`etl_status.json: ${err.message}`);
            return {
                status: 'failed',
                error: err.message,
            };
        }
    }
    getEtlReport() {
        const status = this.getEtlStatus();
        const csvPath = (0, path_1.join)(this.etlOutputDir, 'etl_report.csv');
        const metrics = this.readMetricsCsv(csvPath, status.metrics);
        return {
            status,
            metrics,
            files: {
                html: this.canProvideEtlHtml(status),
                csv: (0, fs_1.existsSync)(csvPath),
            },
            finishedAt: status.finished_at,
            outputDir: this.etlOutputDir,
        };
    }
    getEtlReportHtml() {
        return this.ensureEtlReportHtml();
    }
    getEtlReportCsv() {
        const csvPath = (0, path_1.join)(this.etlOutputDir, 'etl_report.csv');
        if (!(0, fs_1.existsSync)(csvPath)) {
            throw new common_1.NotFoundException('CSV-отчёт не найден. Запустите: cd etl/src && python run_etl.py');
        }
        return (0, fs_1.readFileSync)(csvPath, 'utf-8');
    }
    async syncJobsFromFilesystem() {
        const status = this.getEtlStatus();
        if (status.status === 'never_run') {
            return { updated: 0, status };
        }
        const running = await this.prisma.drugImport.findMany({
            where: { status: client_1.ImportStatus.RUNNING },
            orderBy: { startedAt: 'desc' },
        });
        if (running.length === 0) {
            return { updated: 0, status };
        }
        const recordsProcessed = status.metrics?.drugs ?? 0;
        const importStatus = status.status === 'ok' ? client_1.ImportStatus.COMPLETED : client_1.ImportStatus.FAILED;
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
    async executeEtlPipeline() {
        const etlRoot = this.resolveEtlRoot();
        const scriptPath = (0, path_1.join)(etlRoot, 'src', 'run_etl.py');
        if (!(0, fs_1.existsSync)(scriptPath)) {
            return {
                ok: false,
                error: `Скрипт не найден: ${scriptPath}`,
                stages: [],
            };
        }
        const python = this.resolvePython();
        const stages = [];
        const etlSrcDir = (0, path_1.join)(etlRoot, 'src');
        const parseScriptPath = (0, path_1.join)(etlSrcDir, 'parse_sources.py');
        if ((0, fs_1.existsSync)(parseScriptPath)) {
            const parseRun = await this.runProcess(python, ['parse_sources.py', '--grls', '--rxnorm'], etlSrcDir, {
                PYTHONUTF8: '1',
                FETCH_GRLS: '1',
                FETCH_RXNORM: '1',
                GRLS_MERGE_LIMIT: process.env.GRLS_MERGE_LIMIT || '100',
                RXNORM_LIMIT: process.env.RXNORM_LIMIT || '50',
            });
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
        const loadRun = await this.runProcess('npx', ['ts-node', 'prisma/run-etl-load.ts'], backendRoot, {
            ETL_DIR: etlRoot,
            ETL_PROCESSED_DIR: (0, path_1.join)(etlRoot, 'data', 'processed'),
        }, true);
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
        }
        catch (err) {
            this.logger.warn(`Neo4j sync: ${err.message}`);
            stages.push('neo4j_skipped');
        }
        try {
            this.ensureEtlReportHtml();
            stages.push('html');
        }
        catch (err) {
            this.logger.warn(`HTML report: ${err.message}`);
        }
        const status = this.getEtlStatus();
        return {
            ok: status.status === 'ok',
            error: status.status === 'ok' ? undefined : status.error,
            stages,
        };
    }
    canProvideEtlHtml(status) {
        const htmlPath = (0, path_1.join)(this.etlOutputDir, 'demo_report.html');
        return (0, fs_1.existsSync)(htmlPath) || status.status === 'ok' || Boolean(status.metrics);
    }
    ensureEtlReportHtml() {
        const htmlPath = (0, path_1.join)(this.etlOutputDir, 'demo_report.html');
        if ((0, fs_1.existsSync)(htmlPath)) {
            return (0, fs_1.readFileSync)(htmlPath, 'utf-8');
        }
        const status = this.getEtlStatus();
        if (status.status === 'never_run') {
            throw new common_1.NotFoundException('HTML-отчёт недоступен: ETL ещё не запускался');
        }
        const html = this.buildEtlReportHtml(status);
        (0, fs_1.writeFileSync)(htmlPath, html, 'utf-8');
        return html;
    }
    buildEtlReportHtml(status) {
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
    readSampleDrugs(limit = 8) {
        const catalogPath = (0, path_1.join)(this.resolveEtlRoot(), 'data', 'samples', 'drugs_catalog.json');
        if (!(0, fs_1.existsSync)(catalogPath))
            return [];
        try {
            const catalog = JSON.parse((0, fs_1.readFileSync)(catalogPath, 'utf-8'));
            return catalog.slice(0, limit);
        }
        catch (err) {
            this.logger.warn(`drugs_catalog.json: ${err.message}`);
            return [];
        }
    }
    escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    runProcess(command, args, cwd, extraEnv = {}, useShell = false) {
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(command, args, {
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
    resolveEtlRoot() {
        if (process.env.ETL_DIR)
            return process.env.ETL_DIR;
        const candidates = [
            (0, path_1.join)(process.cwd(), '..', 'etl'),
            (0, path_1.join)(process.cwd(), 'etl'),
            '/etl',
        ];
        for (const dir of candidates) {
            if ((0, fs_1.existsSync)((0, path_1.join)(dir, 'src', 'run_etl.py')))
                return dir;
        }
        return candidates[0];
    }
    resolveBackendRoot() {
        const candidates = [
            process.cwd(),
            (0, path_1.join)(__dirname, '..', '..'),
            (0, path_1.join)(__dirname, '..', '..', '..'),
        ];
        for (const dir of candidates) {
            if ((0, fs_1.existsSync)((0, path_1.join)(dir, 'prisma', 'run-etl-load.ts')))
                return dir;
        }
        return process.cwd();
    }
    resolvePython() {
        return process.env.ETL_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    }
    clearEtlOutputFiles() {
        const files = ['etl_status.json', 'etl_report.csv', 'demo_report.html'];
        let removed = 0;
        for (const file of files) {
            const path = (0, path_1.join)(this.etlOutputDir, file);
            if ((0, fs_1.existsSync)(path)) {
                (0, fs_1.unlinkSync)(path);
                removed++;
            }
        }
        return removed;
    }
    resolveEtlOutputDir() {
        if (process.env.ETL_OUTPUT_DIR) {
            return process.env.ETL_OUTPUT_DIR;
        }
        const candidates = [
            (0, path_1.join)(__dirname, '..', '..', '..', '..', 'etl', 'output'),
            (0, path_1.join)(process.cwd(), '..', 'etl', 'output'),
            (0, path_1.join)(process.cwd(), 'etl', 'output'),
        ];
        for (const dir of candidates) {
            if ((0, fs_1.existsSync)((0, path_1.join)(dir, 'etl_status.json')) || (0, fs_1.existsSync)((0, path_1.join)(dir, 'etl_report.csv'))) {
                return dir;
            }
        }
        return candidates[0];
    }
    readMetricsCsv(csvPath, fallback) {
        if ((0, fs_1.existsSync)(csvPath)) {
            try {
                const lines = (0, fs_1.readFileSync)(csvPath, 'utf-8').trim().split(/\r?\n/);
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
            }
            catch (err) {
                this.logger.warn(`etl_report.csv: ${err.message}`);
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
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = ImportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        graph_service_1.GraphService])
], ImportsService);
//# sourceMappingURL=imports.service.js.map