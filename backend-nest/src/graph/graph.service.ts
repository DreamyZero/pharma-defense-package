import { Inject, Injectable, Logger } from '@nestjs/common';
import neo4j, { Driver, Record as Neo4jRecord } from 'neo4j-driver';
import { NEO4J_DRIVER } from './neo4j/neo4j.module';
import { PrismaService } from '../database/prisma.service';

export interface GraphNode {
  id: string;
  label: string;
  type: 'Drug' | 'Substance' | 'Group' | 'Indication' | 'Contraindication' | 'Synonym';
  atcCode?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  severity?: string;
}

const EMPTY_GRAPH = { nodes: [], edges: [] };

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

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

  private async resolveDrugId(idOrSlug: string): Promise<string | null> {
    const term = idOrSlug.trim();
    if (/^\d+$/.test(term)) return term;

    const drug = await this.prisma.drug.findFirst({
      where: {
        OR: [
          { slug: { equals: term, mode: 'insensitive' } },
          { name: { equals: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
        ],
      },
      orderBy: { id: 'asc' },
    });
    return drug ? String(drug.id) : null;
  }

  private async resolveDrugNames(drugNames: string[]): Promise<string[]> {
    const terms = drugNames.map((n) => n.toLowerCase().trim()).filter(Boolean);
    if (terms.length === 0) return [];

    const pgDrugs = await this.prisma.drug.findMany({
      where: {
        OR: terms.flatMap((term) => [
          { name: { contains: term, mode: 'insensitive' } },
          { slug: { contains: term, mode: 'insensitive' } },
        ]),
      },
      select: { name: true },
    });

    return [...new Set([...pgDrugs.map((d) => d.name.toLowerCase()), ...terms])];
  }

  async getFullGraph(limit = 30): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    try {
      const cypher = `
        MATCH (d:Drug)
        WITH d ORDER BY d.id LIMIT $limit
        OPTIONAL MATCH (d)-[:CONTAINS]->(s:Substance)
        OPTIONAL MATCH (d)-[iw:INTERACTS_WITH]-(d2:Drug)
        OPTIONAL MATCH (d)-[:BELONGS_TO]->(g:PharmacologicalGroup)
        OPTIONAL MATCH (d)-[ao:ANALOG_OF]->(da:Drug)
        OPTIONAL MATCH (s)-[:HAS_SYNONYM]->(syn:Synonym)
        RETURN d, s, d2, iw, g, da, ao, syn
      `;
      const records = await this.run(cypher, { limit: neo4j.int(limit) });
      return this.mapToGraph(records);
    } catch (err) {
      this.logger.warn(`[getFullGraph] Neo4j недоступен. Причина: ${(err as Error).message}`);
      return EMPTY_GRAPH;
    }
  }

  async getDrugGraph(idOrSlug: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const drugId = await this.resolveDrugId(idOrSlug);
    if (!drugId) return EMPTY_GRAPH;

    try {
      const cypher = `
        MATCH (d:Drug {id: $drugId})
        OPTIONAL MATCH (d)-[:CONTAINS]->(s:Substance)
        OPTIONAL MATCH (d)-[iw:INTERACTS_WITH]-(d2:Drug)
        OPTIONAL MATCH (d)-[:BELONGS_TO]->(g:PharmacologicalGroup)
        OPTIONAL MATCH (d)-[:HAS_INDICATION]->(ind:Indication)
        OPTIONAL MATCH (d)-[:HAS_CONTRAINDICATION]->(cont:Contraindication)
        OPTIONAL MATCH (d)-[ao:ANALOG_OF]->(da:Drug)
        OPTIONAL MATCH (s)-[:HAS_SYNONYM]->(syn:Synonym)
        RETURN d, s, d2, iw, g, ind, cont, da, ao, syn
      `;
      const records = await this.run(cypher, { drugId });
      return this.mapToGraph(records, drugId);
    } catch (err) {
      this.logger.warn(`[getDrugGraph] Neo4j недоступен для drugId="${drugId}". Причина: ${(err as Error).message}`);
      return EMPTY_GRAPH;
    }
  }

  async getInteractionGraph(drugNames: string[]): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    try {
      const names = await this.resolveDrugNames(drugNames);
      if (names.length === 0) return EMPTY_GRAPH;

      const cypher = `
        MATCH (d:Drug)
        WHERE toLower(d.name) IN $names
        OPTIONAL MATCH (d)-[iw:INTERACTS_WITH]-(d2:Drug)
        OPTIONAL MATCH (d)-[:CONTAINS]->(s:Substance)
        OPTIONAL MATCH (d)-[ao:ANALOG_OF]->(da:Drug)
        RETURN d, d2, iw, s, da, ao
      `;
      const records = await this.run(cypher, { names });
      return this.mapToGraph(records);
    } catch (err) {
      this.logger.warn(`[getInteractionGraph] Neo4j недоступен. Причина: ${(err as Error).message}`);
      return EMPTY_GRAPH;
    }
  }

  async syncFromPostgres(): Promise<{ nodes: number; edges: number }> {
    const drugs = await this.prisma.drug.findMany({
      include: {
        substances: { include: { substance: { include: { synonymLinks: true } } } },
        indications: true,
        interactionA: { include: { drugB: true } },
        interactionB: { include: { drugA: true } },
        analogsFrom: { include: { targetDrug: true } },
        contraindications: true,
      },
    });

    const session = this.driver.session();
    let nodeCount = 0;
    let edgeCount = 0;
    const drugIds = drugs.map((d) => String(d.id));

    try {
      await session.run(
        `MATCH (d:Drug) WHERE NOT d.id IN $ids DETACH DELETE d`,
        { ids: drugIds },
      );

      for (const drug of drugs) {
        const drugId = String(drug.id);

        await session.run(
          `MATCH (d:Drug {id: $id})-[r:CONTAINS|BELONGS_TO|HAS_INDICATION|HAS_CONTRAINDICATION|INTERACTS_WITH|ANALOG_OF]-() DELETE r`,
          { id: drugId },
        );

        await session.run(
          `MERGE (d:Drug {id: $id}) SET d.name = $name, d.atcCode = $atcCode, d.dosageForm = $dosageForm, d.slug = $slug`,
          {
            id: drugId,
            name: drug.name,
            atcCode: drug.atcCode ?? '',
            dosageForm: drug.dosageForm ?? '',
            slug: drug.slug ?? '',
          },
        );
        nodeCount++;

        if (drug.pharmacologicalGroup) {
          const groupId = `group_${drug.pharmacologicalGroup.replace(/\s+/g, '_').toLowerCase()}`;
          await session.run(
            `MERGE (g:PharmacologicalGroup {id: $id}) SET g.name = $name`,
            { id: groupId, name: drug.pharmacologicalGroup },
          );
          await session.run(
            `MATCH (d:Drug {id: $drugId}), (g:PharmacologicalGroup {id: $groupId})
             MERGE (d)-[:BELONGS_TO]->(g)`,
            { drugId, groupId },
          );
          nodeCount++;
          edgeCount++;
        }

        for (const ind of drug.indications) {
          const indId = `ind_${ind.id}`;
          await session.run(
            `MERGE (i:Indication {id: $id}) SET i.name = $name`,
            { id: indId, name: ind.name },
          );
          await session.run(
            `MATCH (d:Drug {id: $drugId}), (i:Indication {id: $indId})
             MERGE (d)-[:HAS_INDICATION]->(i)`,
            { drugId, indId },
          );
          nodeCount++;
          edgeCount++;
        }

        for (const ds of drug.substances) {
          await session.run(
            `MERGE (s:Substance {id: $id}) SET s.name = $name`,
            { id: String(ds.substance.id), name: ds.substance.name },
          );
          await session.run(
            `MATCH (d:Drug {id: $drugId}), (s:Substance {id: $subId})
             MERGE (d)-[:CONTAINS {isPrimary: $isPrimary}]->(s)`,
            { drugId, subId: String(ds.substance.id), isPrimary: ds.isPrimary },
          );
          nodeCount++;
          edgeCount++;

          for (const link of ds.substance.synonymLinks) {
            const synId = `syn_${link.id}`;
            await session.run(
              `MERGE (syn:Synonym {id: $id}) SET syn.name = $name`,
              { id: synId, name: link.synonym },
            );
            await session.run(
              `MATCH (s:Substance {id: $subId}), (syn:Synonym {id: $synId})
               MERGE (s)-[:HAS_SYNONYM]->(syn)`,
              { subId: String(ds.substance.id), synId },
            );
            nodeCount++;
            edgeCount++;
          }
        }

        for (const interaction of drug.interactionA) {
          await session.run(
            `MATCH (a:Drug {id: $src}), (b:Drug {id: $tgt})
             MERGE (a)-[:INTERACTS_WITH {severity: $severity, mechanism: $mechanism}]->(b)`,
            {
              src: drugId,
              tgt: String(interaction.drugBId),
              severity: interaction.severity,
              mechanism: interaction.mechanism ?? '',
            },
          );
          edgeCount++;
        }

        for (const interaction of drug.interactionB) {
          await session.run(
            `MATCH (a:Drug {id: $src}), (b:Drug {id: $tgt})
             MERGE (a)-[:INTERACTS_WITH {severity: $severity, mechanism: $mechanism}]->(b)`,
            {
              src: String(interaction.drugAId),
              tgt: drugId,
              severity: interaction.severity,
              mechanism: interaction.mechanism ?? '',
            },
          );
          edgeCount++;
        }

        for (const analog of drug.analogsFrom) {
          await session.run(
            `MATCH (a:Drug {id: $src}), (b:Drug {id: $tgt})
             MERGE (a)-[:ANALOG_OF {reason: $reason, confidence: $confidence}]->(b)`,
            {
              src: drugId,
              tgt: String(analog.targetDrugId),
              reason: analog.reason ?? '',
              confidence: analog.confidence ?? 0,
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
            { drugId, contraId, severity: contra.severity ?? '' },
          );
          nodeCount++;
          edgeCount++;
        }
      }

      await session.run(
        `MATCH (s:Substance) WHERE NOT (s)<-[:CONTAINS]-() DETACH DELETE s`,
      );
      await session.run(
        `MATCH (g:PharmacologicalGroup) WHERE NOT (g)<-[:BELONGS_TO]-() DETACH DELETE g`,
      );
      await session.run(
        `MATCH (i:Indication) WHERE NOT (i)<-[:HAS_INDICATION]-() DETACH DELETE i`,
      );
      await session.run(
        `MATCH (c:Contraindication) WHERE NOT (c)<-[:HAS_CONTRAINDICATION]-() DETACH DELETE c`,
      );
      await session.run(
        `MATCH (syn:Synonym) WHERE NOT (syn)<-[:HAS_SYNONYM]-() DETACH DELETE syn`,
      );
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
      const da = (rec['da'] as any)?.properties;
      const syn = (rec['syn'] as any)?.properties;
      const iw = (rec['iw'] as any)?.properties;

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
      if (da?.id) {
        addNode(da.id, da.name || da.id, 'Drug', { atcCode: da.atcCode });
        if (d?.id) addEdge(d.id, da.id, 'ANALOG_OF');
      }
      if (syn?.id) {
        addNode(syn.id, syn.name || syn.id, 'Synonym');
        if (s?.id) addEdge(s.id, syn.id, 'HAS_SYNONYM');
      }
    }

    const nodes = Array.from(nodesMap.values());
    if (highlightId && nodesMap.has(highlightId)) (nodesMap.get(highlightId) as any).highlight = true;
    return { nodes, edges };
  }
}
