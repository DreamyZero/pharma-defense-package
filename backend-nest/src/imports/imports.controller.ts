import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ImportsService } from './imports.service';

@ApiTags('imports')
@ApiBearerAuth()
@Controller('imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @ApiOperation({ summary: 'История импортов' })
  @Get()
  list() { return this.importsService.list(); }

  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Запустить новый импорт (ADMIN)' })
  @Post('run')
  run(@Body() body: { source: string }, @Req() req: any) {
    return this.importsService.run(body.source, req.user?.userId);
  }
}
