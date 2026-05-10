import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { Neo4jModule } from './neo4j/neo4j.module';
import { PrismaService } from '../database/prisma.service'; 
@Module({
  imports: [Neo4jModule],
  controllers: [GraphController],
  providers: [GraphService, PrismaService], // ← добавлено PrismaService
})
export class GraphModule {}