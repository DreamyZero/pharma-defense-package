import { PrismaService } from '../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    me(id: number): Promise<{
        id: number;
        createdAt: Date;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
    }>;
    update(id: number, dto: UpdateUserDto): Promise<{
        id: number;
        createdAt: Date;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
    }>;
}
