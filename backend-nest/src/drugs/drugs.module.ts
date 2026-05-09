import { Module } from '@nestjs/common';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';
import { PharmaRepository } from '../domain/pharma.repository';

@Module({ controllers: [DrugsController], providers: [DrugsService, PharmaRepository] })
export class DrugsModule {}
