import { Body, Controller, Get, Param, Patch, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Список пользователей' })
  @Get('users')
  users() { return this.adminService.users(); }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Журнал аудита' })
  @Get('audit')
  audit() { return this.adminService.audit(); }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Список ETL-импортов' })
  @Get('etl')
  etl() { return this.adminService.etl(); }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Установить роль пользователю' })
  @Patch('users/:id/role')
  setRole(@Param('id', ParseIntPipe) id: number, @Body() body: { role: 'DOCTOR' | 'PHARMACIST' | 'ADMIN' }) {
    return this.adminService.setRole(id, body.role);
  }
}
