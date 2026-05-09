export declare class RegisterDto {
    fullName: string;
    email: string;
    password: string;
    organization?: string;
    role?: 'DOCTOR' | 'PHARMACIST' | 'ADMIN';
}
