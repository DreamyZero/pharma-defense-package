import { Role } from '../auth/roles.enum';
import { AdminService } from './admin.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
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
    setRole(id: number, body: {
        role: Role;
    }, req: {
        user?: {
            userId?: number;
        };
        ip?: string;
    }): Promise<{
        id: number;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    updateUser(id: number, dto: AdminUpdateUserDto, req: {
        user?: {
            userId?: number;
        };
        ip?: string;
    }): Promise<{
        id: number;
        createdAt: Date;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
    } | undefined>;
}
