import { Role } from '../roles.enum';
export declare class RegisterDto {
    fullName: string;
    email: string;
    password: string;
    organization?: string;
    role?: Role;
}
