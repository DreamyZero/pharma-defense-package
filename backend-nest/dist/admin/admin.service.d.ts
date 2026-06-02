import { PrismaService } from '../database/prisma.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    users(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
        createdAt: Date;
    }[]>;
    audit(): import(".prisma/client").Prisma.PrismaPromise<({
        user: {
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
    etl(): import(".prisma/client").Prisma.PrismaPromise<({
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
    setRole(userId: number, role: 'DOCTOR' | 'PHARMACIST' | 'ADMIN'): Promise<{
        id: number;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    updateUser(userId: number, dto: AdminUpdateUserDto): Promise<{
        id: number;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
        createdAt: Date;
    } | undefined>;
}
