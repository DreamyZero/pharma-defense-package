import { Body, Controller, Get, Param, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { GraphService } from './graph.service';

@ApiTags('graph')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @ApiOperation({ summary: 'Полный граф знаний (препараты, вещества, группы)' })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  @Get('full')
  fullGraph(@Query('limit') limit = '30') {
    return this.graphService.getFullGraph(parseInt(limit, 10));
  }

  @ApiOperation({ summary: 'Граф соседей препарата (id, slug или название)' })
  @Get('drug/:id')
  drugGraph(@Param('id') id: string) {
    return this.graphService.getDrugGraph(id);
  }

  @ApiOperation({ summary: 'Граф взаимодействий для набора препаратов' })
  @Post('interactions')
  interactionGraph(@Body() body: { drugs: string[] }) {
    return this.graphService.getInteractionGraph(body.drugs || []);
  }

  @ApiOperation({ summary: 'Синхронизировать Neo4j из PostgreSQL (только ADMIN)' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('sync')
  sync() {
    return this.graphService.syncFromPostgres();
  }
}