import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { AuditModule } from '../audit/audit.module';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [AuditModule, GraphModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
