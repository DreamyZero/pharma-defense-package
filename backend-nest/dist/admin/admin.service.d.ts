import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
export declare class AdminService {
    private prisma;
    private audit;
    constructor(prisma: PrismaService, audit: AuditService);
    users(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        createdAt: Date;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
    }[]>;
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
    setRole(userId: number, role: 'DOCTOR' | 'PHARMACIST' | 'ADMIN', actorId?: number, ipAddress?: string): Promise<{
        id: number;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    updateUser(userId: number, dto: AdminUpdateUserDto, actorId?: number, ipAddress?: string): Promise<{
        id: number;
        createdAt: Date;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
    } | undefined>;
}
