import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
@Controller('admin') @UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController { constructor(private readonly adminService:AdminService){} @Roles('ADMIN')
  @Get('users') users(){ return this.adminService.users(); } @Roles('ADMIN')
  @Get('audit') audit(){ return this.adminService.audit(); } @Roles('ADMIN')
  @Get('etl') etl(){ return this.adminService.etl(); } }
