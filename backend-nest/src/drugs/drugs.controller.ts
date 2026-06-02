import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DrugsService } from './drugs.service';

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
  @ApiOperation({ summary: 'Каталог препаратов (40 демо-позиций с полной инструкцией)' })
  @UseGuards(JwtAuthGuard)
  @Get('drugs/catalog')
  catalog() {
    return this.drugsService.catalog();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Поиск препаратов по названию или веществу' })
  @ApiQuery({ name: 'q', required: true, example: 'аспирин' })
  @UseGuards(JwtAuthGuard)
  @Get('drugs/search')
  search(@Query('q') q = '') {
    return this.drugsService.search(q);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Детальная карточка препарата по slug' })
  @UseGuards(JwtAuthGuard)
  @Get('drugs/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.drugsService.getBySlug(slug);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Аналоги препарата по торговому/МНН названию' })
  @UseGuards(JwtAuthGuard)
  @Get('analogs/:name')
  analogs(@Param('name') name: string) {
    return this.drugsService.analogs(name);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Проверка взаимодействий списка препаратов' })
  @UseGuards(JwtAuthGuard)
  @Post('interactions/check')
  interactions(@Body() body: { items: string[] }) {
    return this.drugsService.interactions(body.items || []);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Проверка противопоказаний' })
  @UseGuards(JwtAuthGuard)
  @Post('contra/check')
  contra(@Body() body: { drug: string; age: number; context: string }) {
    return this.drugsService.contra(body.drug, body.age, body.context);
  }
}
