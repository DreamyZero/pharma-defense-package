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
    run(body: {
        source?: string;
    }, req: {
        user?: {
            userId?: number;
        };
    }): Promise<{
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
    getStatus(): import("./imports.service").EtlStatus;
}
