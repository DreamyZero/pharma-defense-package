import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches, IsOptional, IsEnum } from 'class-validator';
import { Role } from '../roles.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Иванов Иван Иванович' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'doctor@clinic.local' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'email must be an email' })
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Городская больница №1', required: false })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiProperty({ enum: Role, default: Role.DOCTOR, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
