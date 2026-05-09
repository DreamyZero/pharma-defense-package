import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Driver, Session } from 'neo4j-driver';
import { NEO4J_DRIVER } from './neo4j.module';

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  constructor(@Inject(NEO4J_DRIVER) private readonly driver: Driver) {}

  getSession(): Session {
    return this.driver.session();
  }

  async run(cypher: string, params: Record<string, any> = {}): Promise<any[]> {
    const session = this.getSession();
    try {
      const result = await session.run(cypher, params);
      return result.records.map((r) => r.toObject());
    } finally {
      await session.close();
    }
  }

  async onModuleDestroy() {
    await this.driver.close();
  }
}
