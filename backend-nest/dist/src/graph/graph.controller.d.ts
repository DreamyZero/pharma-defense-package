import { GraphService } from './graph.service';
export declare class GraphController {
    private readonly graphService;
    constructor(graphService: GraphService);
    fullGraph(limit?: string): Promise<{
        nodes: import("./graph.service").GraphNode[];
        edges: import("./graph.service").GraphEdge[];
    }>;
    drugGraph(id: string): Promise<{
        nodes: import("./graph.service").GraphNode[];
        edges: import("./graph.service").GraphEdge[];
    }>;
    interactionGraph(body: {
        drugs: string[];
    }): Promise<{
        nodes: import("./graph.service").GraphNode[];
        edges: import("./graph.service").GraphEdge[];
    }>;
    sync(): Promise<{
        nodes: number;
        edges: number;
    }>;
}
