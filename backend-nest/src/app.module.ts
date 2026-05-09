import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DrugsModule } from './drugs/drugs.module';
import { ImportsModule } from './imports/imports.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { GraphModule } from './graph/graph.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    DrugsModule,
    AdminModule,
    AuditModule,
    ImportsModule,
    GraphModule,
  ],
})
export class AppModule {}
