import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    list(): Promise<import("./audit.service").AuditRowDto[]>;
    clear(req: {
        user?: {
            userId?: number;
        };
        ip?: string;
    }): Promise<{
        deleted: number;
    }>;
}
