import { PrismaService } from '../database/prisma.service';
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
    private readonly logger;
    constructor(prisma: PrismaService);
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
    run(source: string, userId?: number): Promise<{
        message: string;
        job: {
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
        };
    }>;
    getEtlStatus(): EtlStatus;
}
