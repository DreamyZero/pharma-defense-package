import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organization?: string;
}
