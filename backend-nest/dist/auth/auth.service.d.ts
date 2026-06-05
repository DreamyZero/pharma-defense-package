import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private prisma;
    private jwt;
    private audit;
    constructor(prisma: PrismaService, jwt: JwtService, audit: AuditService);
    register(dto: RegisterDto, ipAddress?: string): Promise<{
        access_token: string;
        role: string;
        userId: number;
    }>;
    login(dto: LoginDto, ipAddress?: string): Promise<{
        access_token: string;
        role: string;
        userId: number;
    }>;
    profile(userId: number): Promise<{
        id: number;
        createdAt: Date;
        fullName: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        organization: string | null;
        verified: boolean;
    } | null>;
    private sign;
}
