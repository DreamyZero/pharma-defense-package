import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Иванов Иван' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'doctor@clinic.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'Городская больница №1' })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({ enum: ['DOCTOR', 'PHARMACIST', 'ADMIN'] })
  @IsOptional()
  @IsIn(['DOCTOR', 'PHARMACIST', 'ADMIN'])
  role?: 'DOCTOR' | 'PHARMACIST' | 'ADMIN';
}
