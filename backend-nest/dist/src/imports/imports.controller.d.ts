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
        source: string;
        status: import(".prisma/client").$Enums.ImportStatus;
        recordsProcessed: number;
        recordsFailed: number;
        startedAt: Date | null;
        completedAt: Date | null;
        errorLog: string | null;
        createdBy: number | null;
        auditId: number | null;
        createdAt: Date;
    })[]>;
    run(body: {
        source: string;
    }, req: any): Promise<{
        message: string;
        job: {
            id: number;
            source: string;
            status: import(".prisma/client").$Enums.ImportStatus;
            recordsProcessed: number;
            recordsFailed: number;
            startedAt: Date | null;
            completedAt: Date | null;
            errorLog: string | null;
            createdBy: number | null;
            auditId: number | null;
            createdAt: Date;
        };
    }>;
}
