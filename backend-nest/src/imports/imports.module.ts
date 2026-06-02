import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
