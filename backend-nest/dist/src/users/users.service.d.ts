import { PrismaService } from '../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    me(id: number): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: number;
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
        createdAt: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    update(id: number, dto: UpdateUserDto): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: number;
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
