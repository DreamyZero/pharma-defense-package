import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
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
  run(
    @Body() body: { source?: string },
    @Req() req: { user?: { userId?: number }; ip?: string },
  ) {
    return this.importsService.run(
      body.source || 'manual_demo_job',
      req.user?.userId,
      req.ip,
    );
  }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Статус последнего ETL (etl_status.json)' })
  @Get('status')
  getStatus() {
    return this.importsService.getEtlStatus();
  }
}
