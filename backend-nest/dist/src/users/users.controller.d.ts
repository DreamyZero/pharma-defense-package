import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    me(req: any): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: number;
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
        createdAt: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    update(req: any, dto: UpdateUserDto): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: number;
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
