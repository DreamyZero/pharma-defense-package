import { Inject, Injectable } from '@nestjs/common';
import neo4j, { Driver, Record as Neo4jRecord } from 'neo4j-driver';
import { NEO4J_DRIVER } from './neo4j/neo4j.module';
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

@Injectable()
export class GraphService {
  constructor(
    @Inject(NEO4J_DRIVER) private readonly driver: Driver,
    private readonly prisma: PrismaService,
  ) {}

  private async run(cypher: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records.map((r: Neo4jRecord) => r.toObject() as Record<string, unknown>);
    } finally {
      await session.close();
    }
  }

  async getFullGraph(limit = 60): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const cypher = `
      MATCH (d:Drug)-[r1:CONTAINS]->(s:Substance)
      OPTIONAL MATCH (d)-[r2:INTERACTS_WITH]->(d2:Drug)
      OPTIONAL MATCH (d)-[r3:BELONGS_TO]->(g:PharmacologicalGroup)
      RETURN d, s, r1, d2, r2, g, r3
      LIMIT $limit
    `;
    const records = await this.run(cypher, { limit: neo4j.int(limit) }); // ← фикс float
    return this.mapToGraph(records);
  }

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

  // ← добавлен новый метод
  async syncFromPostgres(): Promise<{ nodes: number; edges: number }> {
    const drugs = await this.prisma.drug.findMany({
      include: {
        substances: { include: { substance: true } },
        interactionA: { include: { drugB: true } },
        contraindications: true,
      },
    });

    const session = this.driver.session();
    let nodeCount = 0;
    let edgeCount = 0;

    try {
      await session.run('MATCH (n) DETACH DELETE n');

      for (const drug of drugs) {
        await session.run(
          `MERGE (d:Drug {id: $id}) SET d.name = $name, d.atcCode = $atcCode, d.dosageForm = $dosageForm`,
          {
            id: String(drug.id),
            name: drug.name,
            atcCode: drug.atcCode ?? '',
            dosageForm: drug.dosageForm ?? '',
          },
        );
        nodeCount++;

        for (const ds of drug.substances) {
          await session.run(
            `MERGE (s:Substance {id: $id}) SET s.name = $name`,
            { id: String(ds.substance.id), name: ds.substance.name },
          );
          await session.run(
            `MATCH (d:Drug {id: $drugId}), (s:Substance {id: $subId})
             MERGE (d)-[:CONTAINS {isPrimary: $isPrimary}]->(s)`,
            { drugId: String(drug.id), subId: String(ds.substance.id), isPrimary: ds.isPrimary },
          );
          nodeCount++;
          edgeCount++;
        }

        for (const interaction of drug.interactionA) {
          await session.run(
            `MATCH (a:Drug {id: $src}), (b:Drug {id: $tgt})
             MERGE (a)-[:INTERACTS_WITH {severity: $severity, mechanism: $mechanism}]->(b)`,
            {
              src: String(drug.id),
              tgt: String(interaction.drugBId),
              severity: interaction.severity,
              mechanism: interaction.mechanism ?? '',
            },
          );
          edgeCount++;
        }

        for (const contra of drug.contraindications) {
          const contraId = `contra_${contra.id}`;
          await session.run(
            `MERGE (c:Contraindication {id: $id}) SET c.name = $condition`,
            { id: contraId, condition: contra.condition },
          );
          await session.run(
            `MATCH (d:Drug {id: $drugId}), (c:Contraindication {id: $contraId})
             MERGE (d)-[:HAS_CONTRAINDICATION {severity: $severity}]->(c)`,
            { drugId: String(drug.id), contraId, severity: contra.severity ?? '' },
          );
          nodeCount++;
          edgeCount++;
        }
      }
    } finally {
      await session.close();
    }

    return { nodes: nodeCount, edges: edgeCount };
  }

  private mapToGraph(
    records: Record<string, unknown>[],
    highlightId?: string,
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodesMap = new Map<string, GraphNode>();
    const edgesSet = new Set<string>();
    const edges: GraphEdge[] = [];

    const addNode = (id: string, label: string, type: GraphNode['type'], extra: Partial<GraphNode> = {}) => {
      if (id && !nodesMap.has(id)) nodesMap.set(id, { id, label, type, ...extra });
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
      const d = (rec['d'] as any)?.properties;
      const s = (rec['s'] as any)?.properties;
      const d2 = (rec['d2'] as any)?.properties;
      const g = (rec['g'] as any)?.properties;
      const ind = (rec['ind'] as any)?.properties;
      const cont = (rec['cont'] as any)?.properties;
      const iw = (rec['iw'] as any)?.properties;

      if (d?.id) addNode(d.id, d.name || d.id, 'Drug', { atcCode: d.atcCode });
      if (s?.id) { addNode(s.id, s.name || s.id, 'Substance'); if (d?.id) addEdge(d.id, s.id, 'CONTAINS'); }
      if (d2?.id) { addNode(d2.id, d2.name || d2.id, 'Drug', { atcCode: d2.atcCode }); if (d?.id) addEdge(d.id, d2.id, 'INTERACTS_WITH', iw?.severity); }
      if (g?.id) { addNode(g.id, g.name || g.id, 'Group'); if (d?.id) addEdge(d.id, g.id, 'BELONGS_TO'); }
      if (ind?.id) { addNode(ind.id, ind.name || ind.id, 'Indication'); if (d?.id) addEdge(d.id, ind.id, 'HAS_INDICATION'); }
      if (cont?.id) { addNode(cont.id, cont.name || cont.id, 'Contraindication'); if (d?.id) addEdge(d.id, cont.id, 'HAS_CONTRAINDICATION'); }
    }

    const nodes = Array.from(nodesMap.values());
    if (highlightId && nodesMap.has(highlightId)) (nodesMap.get(highlightId) as any).highlight = true;
    return { nodes, edges };
  }
}