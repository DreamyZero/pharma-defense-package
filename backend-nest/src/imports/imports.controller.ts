import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
  @ApiOperation({ summary: 'Очистить журнал импортов (только ADMIN)' })
  @Delete()
  clear(@Req() req: { user?: { userId?: number }; ip?: string }) {
    return this.importsService.clearImports(req.user?.userId, req.ip);
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
  @ApiOperation({ summary: 'Синхронизировать отчёт ETL из etl/output' })
  @Post('sync')
  @HttpCode(200)
  syncReport() {
    return this.importsService.syncFromFilesystem();
  }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Статус последнего ETL (etl_status.json)' })
  @Get('status')
  getStatus() {
    return this.importsService.getEtlStatus();
  }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Сводный отчёт ETL (JSON)' })
  @Get('report')
  getReport() {
    return this.importsService.getEtlReport();
  }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'HTML-отчёт ETL (demo_report.html)' })
  @Get('report/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getReportHtml() {
    return this.importsService.getEtlReportHtml();
  }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'CSV-отчёт ETL (etl_report.csv)' })
  @Get('report/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="etl_report.csv"')
  getReportCsv() {
    return this.importsService.getEtlReportCsv();
  }
}
