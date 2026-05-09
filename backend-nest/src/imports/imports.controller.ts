import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { ImportsService } from './imports.service';
@Controller('imports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportsController {
  constructor(private readonly service: ImportsService) {}
  @Get()
  @Roles('ADMIN')
  list(){ return this.service.list(); }
  @Post('run')
  @Roles('ADMIN')
  run(@Body() body:{source:string}){ return this.service.run(body.source || 'manual_job'); }
}
