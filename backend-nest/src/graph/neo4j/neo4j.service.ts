import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session, Record as Neo4jRecord } from 'neo4j-driver';

export const NEO4J_DRIVER = 'NEO4J_DRIVER';

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  constructor(@Inject(NEO4J_DRIVER) private readonly driver: Driver) {}

  getSession(): Session {
    return this.driver.session();
  }

  async run(cypher: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>[]> {
    const session = this.getSession();
    try {
      const result = await session.run(cypher, params);
      return result.records.map((r: Neo4jRecord) => r.toObject() as Record<string, unknown>);
    } finally {
      await session.close();
    }
  }

  async onModuleDestroy() {
    await this.driver.close();
  }
}
