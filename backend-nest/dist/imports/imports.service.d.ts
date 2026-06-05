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
export declare class ImportsService {
    private readonly prisma;
    private readonly audit;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService);
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
    }>;
    getEtlStatus(): EtlStatus;
}
