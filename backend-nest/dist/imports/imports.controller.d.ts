import { ImportsService } from './imports.service';
export declare class ImportsController {
    private readonly importsService;
    constructor(importsService: ImportsService);
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
    clear(req: {
        user?: {
            userId?: number;
        };
        ip?: string;
    }): Promise<{
        deleted: number;
        outputFilesRemoved: number;
    }>;
    run(body: {
        source?: string;
    }, req: {
        user?: {
            userId?: number;
        };
        ip?: string;
    }): Promise<{
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
        report: import("./imports.service").EtlReport;
        pipeline: {
            ok: boolean;
            error?: string;
            stages: string[];
        };
    }>;
    syncReport(): Promise<{
        updated: {
            updated: number;
            status: import("./imports.service").EtlStatus;
        };
        report: import("./imports.service").EtlReport;
    }>;
    getStatus(): import("./imports.service").EtlStatus;
    getReport(): import("./imports.service").EtlReport;
    getReportHtml(): string;
    getReportCsv(): string;
}
