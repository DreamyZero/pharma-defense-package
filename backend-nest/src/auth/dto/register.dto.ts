import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
export class RegisterDto { @IsString() fullName!: string; @IsEmail() email!: string; @IsString() @MinLength(6) password!: string; @IsOptional() @IsString() organization?: string; @IsOptional() @IsIn(['DOCTOR','PHARMACIST','ADMIN']) role?: 'DOCTOR'|'PHARMACIST'|'ADMIN'; }
