import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        role: string;
        userId: number;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        role: string;
        userId: number;
    }>;
    profile(req: any): Promise<{
        id: number;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
        createdAt: Date;
    } | null>;
}
