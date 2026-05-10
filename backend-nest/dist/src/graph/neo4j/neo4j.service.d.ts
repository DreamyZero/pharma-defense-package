import { OnModuleDestroy } from '@nestjs/common';
import { Driver, Session } from 'neo4j-driver';
export declare const NEO4J_DRIVER = "NEO4J_DRIVER";
export declare class Neo4jService implements OnModuleDestroy {
    private readonly driver;
    constructor(driver: Driver);
    getSession(): Session;
    run(cypher: string, params?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
    onModuleDestroy(): Promise<void>;
}
