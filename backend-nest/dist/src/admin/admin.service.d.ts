import { PrismaService } from '../database/prisma.service';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    users(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
        createdAt: Date;
    }[]>;
    audit(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        createdAt: Date;
        userId: number | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
    }[]>;
    etl(): {
        id: string;
        source: string;
        status: string;
        processed: string;
        errors: number;
        time: string;
    }[];
}
