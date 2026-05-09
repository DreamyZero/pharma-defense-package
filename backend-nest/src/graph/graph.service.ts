import { Inject, Injectable } from '@nestjs/common';
import { Driver } from 'neo4j-driver';
import { NEO4J_DRIVER } from './neo4j/neo4j.module';

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

@Injectable()
export class GraphService {
  constructor(@Inject(NEO4J_DRIVER) private readonly driver: Driver) {}

  private async run(cypher: string, params: Record<string, any> = {}) {
    const session = this.driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records.map((r) => r.toObject());
    } finally {
      await session.close();
    }
  }

  /** Полный граф: препараты, вещества, группы, взаимодействия */
  async getFullGraph(limit = 60): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const cypher = `
      MATCH (d:Drug)-[r1:CONTAINS]->(s:Substance)
      OPTIONAL MATCH (d)-[r2:INTERACTS_WITH]->(d2:Drug)
      OPTIONAL MATCH (d)-[r3:BELONGS_TO]->(g:PharmacologicalGroup)
      RETURN d, s, r1, d2, r2, g, r3
      LIMIT $limit
    `;
    const records = await this.run(cypher, { limit });
    return this.mapToGraph(records);
  }

  /** Граф для конкретного препарата (соседи 1-го и 2-го порядка) */
  async getDrugGraph(drugId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const cypher = `
      MATCH (d:Drug {id: $drugId})
      OPTIONAL MATCH (d)-[:CONTAINS]->(s:Substance)
      OPTIONAL MATCH (d)-[iw:INTERACTS_WITH]->(d2:Drug)
      OPTIONAL MATCH (d)-[:BELONGS_TO]->(g:PharmacologicalGroup)
      OPTIONAL MATCH (d)-[:HAS_INDICATION]->(ind:Indication)
      OPTIONAL MATCH (d)-[:HAS_CONTRAINDICATION]->(cont:Contraindication)
      RETURN d, s, d2, iw, g, ind, cont
    `;
    const records = await this.run(cypher, { drugId });
    return this.mapToGraph(records, drugId);
  }

  /** Граф взаимодействий для списка препаратов */
  async getInteractionGraph(drugNames: string[]): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const cypher = `
      MATCH (d:Drug)
      WHERE toLower(d.name) IN $names
      OPTIONAL MATCH (d)-[iw:INTERACTS_WITH]->(d2:Drug)
      OPTIONAL MATCH (d)-[:CONTAINS]->(s:Substance)
      RETURN d, d2, iw, s
    `;
    const normalized = drugNames.map((n) => n.toLowerCase().trim());
    const records = await this.run(cypher, { names: normalized });
    return this.mapToGraph(records);
  }

  private mapToGraph(
    records: any[],
    highlightId?: string,
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodesMap = new Map<string, GraphNode>();
    const edgesSet = new Set<string>();
    const edges: GraphEdge[] = [];

    const addNode = (id: string, label: string, type: GraphNode['type'], extra: Partial<GraphNode> = {}) => {
      if (id && !nodesMap.has(id)) {
        nodesMap.set(id, { id, label, type, ...extra });
      }
    };

    const addEdge = (source: string, target: string, type: string, severity?: string) => {
      const key = `${source}:${target}:${type}`;
      const keyRev = `${target}:${source}:${type}`;
      if (source && target && !edgesSet.has(key) && !edgesSet.has(keyRev)) {
        edgesSet.add(key);
        edges.push({ source, target, type, severity });
      }
    };

    for (const rec of records) {
      const d = rec.d?.properties;
      const s = rec.s?.properties;
      const d2 = rec.d2?.properties;
      const g = rec.g?.properties;
      const ind = rec.ind?.properties;
      const cont = rec.cont?.properties;
      const iw = rec.iw?.properties;

      if (d?.id) addNode(d.id, d.name || d.id, 'Drug', { atcCode: d.atcCode });
      if (s?.id) {
        addNode(s.id, s.name || s.id, 'Substance');
        if (d?.id) addEdge(d.id, s.id, 'CONTAINS');
      }
      if (d2?.id) {
        addNode(d2.id, d2.name || d2.id, 'Drug', { atcCode: d2.atcCode });
        if (d?.id) addEdge(d.id, d2.id, 'INTERACTS_WITH', iw?.severity);
      }
      if (g?.id) {
        addNode(g.id, g.name || g.id, 'Group');
        if (d?.id) addEdge(d.id, g.id, 'BELONGS_TO');
      }
      if (ind?.id) {
        addNode(ind.id, ind.name || ind.id, 'Indication');
        if (d?.id) addEdge(d.id, ind.id, 'HAS_INDICATION');
      }
      if (cont?.id) {
        addNode(cont.id, cont.name || cont.id, 'Contraindication');
        if (d?.id) addEdge(d.id, cont.id, 'HAS_CONTRAINDICATION');
      }
    }

    const nodes = Array.from(nodesMap.values());
    if (highlightId && nodesMap.has(highlightId)) {
      (nodesMap.get(highlightId) as any).highlight = true;
    }
    return { nodes, edges };
  }
}
