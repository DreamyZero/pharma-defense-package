import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { NEO4J_DRIVER } from './neo4j.module';

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  constructor(@Inject(NEO4J_DRIVER) private readonly driver: neo4j.Driver) {}

  getSession(): neo4j.Session {
    return this.driver.session();
  }

  async run(cypher: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>[]> {
    const session = this.getSession();
    try {
      const result = await session.run(cypher, params);
      return result.records.map((r: neo4j.Record) => r.toObject() as Record<string, unknown>);
    } finally {
      await session.close();
    }
  }

  async onModuleDestroy() {
    await this.driver.close();
  }
}
