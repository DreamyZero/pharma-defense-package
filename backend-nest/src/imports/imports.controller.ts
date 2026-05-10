import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  HttpCode,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ImportsService } from './imports.service';

@ApiTags('imports')
@ApiBearerAuth()
@Controller('imports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Список импортов (только ADMIN)' })
  @Get()
  list() {
    return this.importsService.list();
  }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Запустить ETL импорт (только ADMIN)' })
  @Post('run')
  @HttpCode(200)
  async run(@Body() body: { source: string }, @Request() req: any) {
    return this.importsService.run(body.source, req.user?.id);
  }
}