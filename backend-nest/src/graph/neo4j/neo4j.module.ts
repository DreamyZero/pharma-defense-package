import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver } from 'neo4j-driver';

export const NEO4J_DRIVER = 'NEO4J_DRIVER';

@Global()
@Module({
  providers: [
    {
      provide: NEO4J_DRIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Driver => {
        const uri = config.get<string>('NEO4J_URI', 'bolt://localhost:7687');
        const user = config.get<string>('NEO4J_USER', 'neo4j');
        const pass = config.get<string>('NEO4J_PASSWORD', 'password');
        return neo4j.driver(uri, neo4j.auth.basic(user, pass));
      },
    },
  ],
  exports: [NEO4J_DRIVER],
})
export class Neo4jModule {}
