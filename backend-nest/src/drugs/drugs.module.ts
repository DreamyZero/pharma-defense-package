import { Module } from '@nestjs/common';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';
import { PharmaRepository } from '../domain/pharma.repository';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DrugsController],
  providers: [DrugsService, PharmaRepository],
})
export class DrugsModule {}
