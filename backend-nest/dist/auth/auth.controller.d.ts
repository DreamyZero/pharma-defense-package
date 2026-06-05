import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, req: any): Promise<{
        access_token: string;
        role: string;
        userId: number;
    }>;
    login(dto: LoginDto, req: any): Promise<{
        access_token: string;
        role: string;
        userId: number;
    }>;
    profile(req: any): Promise<{
        id: number;
        createdAt: Date;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
    } | null>;
}
