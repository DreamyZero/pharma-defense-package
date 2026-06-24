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
    files: {
        html: boolean;
        csv: boolean;
    };
    finishedAt?: string;
    outputDir: string;
}
export declare class ImportsService {
    private readonly prisma;
    private readonly audit;
    private readonly graphService;
    private readonly logger;
    private readonly etlOutputDir;
    constructor(prisma: PrismaService, audit: AuditService, graphService: GraphService);
    list(): import(".prisma/client").Prisma.PrismaPromise<({
        creator: {
            email: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        source: string;
        status: import(".prisma/client").$Enums.ImportStatus;
        recordsProcessed: number;
        recordsFailed: number;
        startedAt: Date | null;
        completedAt: Date | null;
        errorLog: string | null;
        createdBy: number | null;
        auditId: number | null;
    })[]>;
    run(source: string, userId?: number, ipAddress?: string): Promise<{
        message: string;
        job: {
            auditId: number;
            id: number;
            createdAt: Date;
            source: string;
            status: import(".prisma/client").$Enums.ImportStatus;
            recordsProcessed: number;
            recordsFailed: number;
            startedAt: Date | null;
            completedAt: Date | null;
            errorLog: string | null;
            createdBy: number | null;
        };
        report: EtlReport;
        pipeline: {
            ok: boolean;
            error?: string;
            stages: string[];
        };
    }>;
    clearImports(userId?: number, ipAddress?: string): Promise<{
        deleted: number;
        outputFilesRemoved: number;
    }>;
    syncFromFilesystem(): Promise<{
        updated: {
            updated: number;
            status: EtlStatus;
        };
        report: EtlReport;
    }>;
    getEtlStatus(): EtlStatus;
    getEtlReport(): EtlReport;
    getEtlReportHtml(): string;
    getEtlReportCsv(): string;
    private syncJobsFromFilesystem;
    private executeEtlPipeline;
    private canProvideEtlHtml;
    private ensureEtlReportHtml;
    private buildEtlReportHtml;
    private readSampleDrugs;
    private escapeHtml;
    private runProcess;
    private resolveEtlRoot;
    private resolveBackendRoot;
    private resolvePython;
    private clearEtlOutputFiles;
    private resolveEtlOutputDir;
    private readMetricsCsv;
}
