import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles.enum';
import { ImportsService } from './imports.service';

@ApiTags('imports')
@ApiBearerAuth()
@Controller('imports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Загрузить CSV с препаратами (только ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @Post('drugs/csv')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(200)
  async importDrugsCsv(@UploadedFile() file: Express.Multer.File) {
    return this.importsService.importDrugsCsv(file.buffer);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Загрузить JSON с взаимодействиями (только ADMIN)' })
  @Post('interactions/json')
  @HttpCode(200)
  async importInteractionsJson(@Body() body: { data: any[] }) {
    return this.importsService.importInteractionsJson(body.data);
  }

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Синхронизация данных в Neo4j (только ADMIN)' })
  @Post('neo4j/sync')
  @HttpCode(200)
  async syncNeo4j() {
    return this.importsService.syncNeo4j();
  }

  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Статус последнего импорта' })
  @Get('status')
  status() {
    return this.importsService.getStatus();
  }
}
