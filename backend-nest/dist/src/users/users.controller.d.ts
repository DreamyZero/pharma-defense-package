import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    me(req: any): Promise<{
        id: number;
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
        createdAt: Date;
    }>;
    update(req: any, dto: UpdateUserDto): Promise<{
        id: number;
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
    }>;
}
