import { PrismaService } from '../database/prisma.service';
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    list(take?: number): Promise<({
        user: {
            id: number;
            fullName: string;
            email: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        userId: number | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
    })[]>;
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
        userId: number | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
    }>;
}
