import { Controller, Delete, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Журнал аудита (только ADMIN)' })
  @Get()
  list() {
    return this.auditService.list();
  }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Очистить журнал аудита (только ADMIN)' })
  @Delete()
  clear(@Request() req: { user?: { userId?: number }; ip?: string }) {
    return this.auditService.clear(req.user?.userId, req.ip);
  }
}
