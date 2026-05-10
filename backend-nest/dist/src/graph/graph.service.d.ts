import { Driver } from 'neo4j-driver';
import { PrismaService } from '../database/prisma.service';
export interface GraphNode {
    id: string;
    label: string;
    type: 'Drug' | 'Substance' | 'Group' | 'Indication' | 'Contraindication';
    atcCode?: string;
}
export interface GraphEdge {
    source: string;
    target: string;
    type: string;
    severity?: string;
}
export declare class GraphService {
    private readonly driver;
    private readonly prisma;
    constructor(driver: Driver, prisma: PrismaService);
    private run;
    getFullGraph(limit?: number): Promise<{
        nodes: GraphNode[];
        edges: GraphEdge[];
    }>;
    getDrugGraph(drugId: string): Promise<{
        nodes: GraphNode[];
        edges: GraphEdge[];
    }>;
    getInteractionGraph(drugNames: string[]): Promise<{
        nodes: GraphNode[];
        edges: GraphEdge[];
    }>;
    syncFromPostgres(): Promise<{
        nodes: number;
        edges: number;
    }>;
    private mapToGraph;
}
