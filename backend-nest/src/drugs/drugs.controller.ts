import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DrugsService } from './drugs.service';

/**
 * Разграничение ролей:
 *   PHARMACIST — чтение каталога, поиска, карточки, аналогов (без клинических операций)
 *   DOCTOR     — то же + проверка взаимодействий + противопоказания
 *   ADMIN      — полный доступ ко всему
 */
@ApiTags('drugs')
@Controller()
export class DrugsController {
  constructor(private readonly drugsService: DrugsService) {}

  @ApiOperation({ summary: 'Метрики дашборда' })
  @Get('dashboard')
  dashboard() {
    return this.drugsService.dashboard();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Каталог препаратов (PHARMACIST, DOCTOR, ADMIN)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'DOCTOR', 'ADMIN')
  @Get('drugs/catalog')
  catalog(@Req() req: any) {
    return this.drugsService.catalog();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Поиск препаратов по названию или веществу (PHARMACIST, DOCTOR, ADMIN)' })
  @ApiQuery({ name: 'q', required: true, example: 'аспирин' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'DOCTOR', 'ADMIN')
  @Get('drugs/search')
  search(@Query('q') q = '', @Req() req: any) {
    return this.drugsService.search(q, req.user?.userId, req.ip);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Детальная карточка препарата по slug (PHARMACIST, DOCTOR, ADMIN)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'DOCTOR', 'ADMIN')
  @Get('drugs/:slug')
  getBySlug(@Param('slug') slug: string, @Req() req: any) {
    return this.drugsService.getBySlug(slug, req.user?.userId, req.ip);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Аналоги препарата (PHARMACIST, DOCTOR, ADMIN)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'DOCTOR', 'ADMIN')
  @Get('analogs/:name')
  analogs(@Param('name') name: string, @Req() req: any) {
    return this.drugsService.analogs(name, req.user?.userId, req.ip);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Проверка взаимодействий списка препаратов (DOCTOR, ADMIN)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR', 'ADMIN')
  @Post('interactions/check')
  interactions(@Body() body: { items: string[] }, @Req() req: any) {
    return this.drugsService.interactions(body.items || [], req.user?.userId, req.ip);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Проверка противопоказаний (DOCTOR, ADMIN)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR', 'ADMIN')
  @Post('contra/check')
  contra(@Body() body: { drug: string; age: number; context: string }, @Req() req: any) {
    return this.drugsService.contra(body.drug, body.age, body.context, req.user?.userId, req.ip);
  }
}
