import { Body, Controller, Get, Param, Patch, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '../auth/roles.enum';
import { AdminService } from './admin.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Список пользователей' })
  @Get('users')
  users() { return this.adminService.users(); }

  @ApiOperation({ summary: 'Список ETL-импортов' })
  @Get('etl')
  etl() { return this.adminService.etl(); }

  @ApiOperation({ summary: 'Установить роль пользователю' })
  @Patch('users/:id/role')
  setRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role: Role },
    @Req() req: { user?: { userId?: number }; ip?: string },
  ) {
    return this.adminService.setRole(id, body.role, req.user?.userId, req.ip);
  }

  @ApiOperation({ summary: 'Обновить email и/или пароль пользователя' })
  @Patch('users/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
    @Req() req: { user?: { userId?: number }; ip?: string },
  ) {
    return this.adminService.updateUser(id, dto, req.user?.userId, req.ip);
  }
}
