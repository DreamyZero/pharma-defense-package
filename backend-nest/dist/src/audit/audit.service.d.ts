import { PrismaService } from '../database/prisma.service';
export type AuditRowDto = {
    time: string;
    user: string;
    action: string;
    entity: string;
    ip: string;
};
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    list(take?: number): Promise<AuditRowDto[]>;
    log(data: {
        userId?: number;
        action: string;
        entityType?: string;
        entityId?: string;
        oldValues?: any;
        newValues?: any;
        ipAddress?: string;
    }): Promise<{
        id: number;
        createdAt: Date;
        action: string;
        entityType: string | null;
        entityId: string | null;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userId: number | null;
    }>;
}
