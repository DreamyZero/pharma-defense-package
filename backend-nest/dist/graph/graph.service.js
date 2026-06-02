"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GraphService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = require("neo4j-driver");
const neo4j_module_1 = require("./neo4j/neo4j.module");
const prisma_service_1 = require("../database/prisma.service");
const EMPTY_GRAPH = { nodes: [], edges: [] };
let GraphService = GraphService_1 = class GraphService {
    constructor(driver, prisma) {
        this.driver = driver;
        this.prisma = prisma;
        this.logger = new common_1.Logger(GraphService_1.name);
    }
    async run(cypher, params = {}) {
        const session = this.driver.session();
        try {
            const result = await session.run(cypher, params);
            return result.records.map((r) => r.toObject());
        }
        finally {
            await session.close();
        }
    }
    async getFullGraph(limit = 60) {
        try {
            const cypher = `
        MATCH (d:Drug)-[r1:CONTAINS]->(s:Substance)
        OPTIONAL MATCH (d)-[r2:INTERACTS_WITH]->(d2:Drug)
        OPTIONAL MATCH (d)-[r3:BELONGS_TO]->(g:PharmacologicalGroup)
        RETURN d, s, r1, d2, r2, g, r3
        LIMIT $limit
      `;
            const records = await this.run(cypher, { limit: neo4j_driver_1.default.int(limit) });
            return this.mapToGraph(records);
        }
        catch (err) {
            this.logger.warn(`[getFullGraph] Neo4j недоступен. Причина: ${err.message}`);
            return EMPTY_GRAPH;
        }
    }
    async getDrugGraph(drugId) {
        try {
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
        catch (err) {
            this.logger.warn(`[getDrugGraph] Neo4j недоступен для drugId="${drugId}". Причина: ${err.message}`);
            return EMPTY_GRAPH;
        }
    }
    async getInteractionGraph(drugNames) {
        try {
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
        catch (err) {
            this.logger.warn(`[getInteractionGraph] Neo4j недоступен. Причина: ${err.message}`);
            return EMPTY_GRAPH;
        }
    }
    async syncFromPostgres() {
        const drugs = await this.prisma.drug.findMany({
            include: {
                substances: { include: { substance: true } },
                indications: true,
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
                await session.run(`MERGE (d:Drug {id: $id}) SET d.name = $name, d.atcCode = $atcCode, d.dosageForm = $dosageForm`, {
                    id: String(drug.id),
                    name: drug.name,
                    atcCode: drug.atcCode ?? '',
                    dosageForm: drug.dosageForm ?? '',
                });
                nodeCount++;
                if (drug.pharmacologicalGroup) {
                    const groupId = `group_${drug.pharmacologicalGroup.replace(/\s+/g, '_').toLowerCase()}`;
                    await session.run(`MERGE (g:PharmacologicalGroup {id: $id}) SET g.name = $name`, { id: groupId, name: drug.pharmacologicalGroup });
                    await session.run(`MATCH (d:Drug {id: $drugId}), (g:PharmacologicalGroup {id: $groupId})
             MERGE (d)-[:BELONGS_TO]->(g)`, { drugId: String(drug.id), groupId });
                    nodeCount++;
                    edgeCount++;
                }
                for (const ind of drug.indications) {
                    const indId = `ind_${ind.id}`;
                    await session.run(`MERGE (i:Indication {id: $id}) SET i.name = $name`, { id: indId, name: ind.name });
                    await session.run(`MATCH (d:Drug {id: $drugId}), (i:Indication {id: $indId})
             MERGE (d)-[:HAS_INDICATION]->(i)`, { drugId: String(drug.id), indId });
                    nodeCount++;
                    edgeCount++;
                }
                for (const ds of drug.substances) {
                    await session.run(`MERGE (s:Substance {id: $id}) SET s.name = $name`, { id: String(ds.substance.id), name: ds.substance.name });
                    await session.run(`MATCH (d:Drug {id: $drugId}), (s:Substance {id: $subId})
             MERGE (d)-[:CONTAINS {isPrimary: $isPrimary}]->(s)`, { drugId: String(drug.id), subId: String(ds.substance.id), isPrimary: ds.isPrimary });
                    nodeCount++;
                    edgeCount++;
                }
                for (const interaction of drug.interactionA) {
                    await session.run(`MATCH (a:Drug {id: $src}), (b:Drug {id: $tgt})
             MERGE (a)-[:INTERACTS_WITH {severity: $severity, mechanism: $mechanism}]->(b)`, {
                        src: String(drug.id),
                        tgt: String(interaction.drugBId),
                        severity: interaction.severity,
                        mechanism: interaction.mechanism ?? '',
                    });
                    edgeCount++;
                }
                for (const contra of drug.contraindications) {
                    const contraId = `contra_${contra.id}`;
                    await session.run(`MERGE (c:Contraindication {id: $id}) SET c.name = $condition`, { id: contraId, condition: contra.condition });
                    await session.run(`MATCH (d:Drug {id: $drugId}), (c:Contraindication {id: $contraId})
             MERGE (d)-[:HAS_CONTRAINDICATION {severity: $severity}]->(c)`, { drugId: String(drug.id), contraId, severity: contra.severity ?? '' });
                    nodeCount++;
                    edgeCount++;
                }
            }
        }
        finally {
            await session.close();
        }
        return { nodes: nodeCount, edges: edgeCount };
    }
    mapToGraph(records, highlightId) {
        const nodesMap = new Map();
        const edgesSet = new Set();
        const edges = [];
        const addNode = (id, label, type, extra = {}) => {
            if (id && !nodesMap.has(id))
                nodesMap.set(id, { id, label, type, ...extra });
        };
        const addEdge = (source, target, type, severity) => {
            const key = `${source}:${target}:${type}`;
            const keyRev = `${target}:${source}:${type}`;
            if (source && target && !edgesSet.has(key) && !edgesSet.has(keyRev)) {
                edgesSet.add(key);
                edges.push({ source, target, type, severity });
            }
        };
        for (const rec of records) {
            const d = rec['d']?.properties;
            const s = rec['s']?.properties;
            const d2 = rec['d2']?.properties;
            const g = rec['g']?.properties;
            const ind = rec['ind']?.properties;
            const cont = rec['cont']?.properties;
            const iw = rec['iw']?.properties;
            if (d?.id)
                addNode(d.id, d.name || d.id, 'Drug', { atcCode: d.atcCode });
            if (s?.id) {
                addNode(s.id, s.name || s.id, 'Substance');
                if (d?.id)
                    addEdge(d.id, s.id, 'CONTAINS');
            }
            if (d2?.id) {
                addNode(d2.id, d2.name || d2.id, 'Drug', { atcCode: d2.atcCode });
                if (d?.id)
                    addEdge(d.id, d2.id, 'INTERACTS_WITH', iw?.severity);
            }
            if (g?.id) {
                addNode(g.id, g.name || g.id, 'Group');
                if (d?.id)
                    addEdge(d.id, g.id, 'BELONGS_TO');
            }
            if (ind?.id) {
                addNode(ind.id, ind.name || ind.id, 'Indication');
                if (d?.id)
                    addEdge(d.id, ind.id, 'HAS_INDICATION');
            }
            if (cont?.id) {
                addNode(cont.id, cont.name || cont.id, 'Contraindication');
                if (d?.id)
                    addEdge(d.id, cont.id, 'HAS_CONTRAINDICATION');
            }
        }
        const nodes = Array.from(nodesMap.values());
        if (highlightId && nodesMap.has(highlightId))
            nodesMap.get(highlightId).highlight = true;
        return { nodes, edges };
    }
};
exports.GraphService = GraphService;
exports.GraphService = GraphService = GraphService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(neo4j_module_1.NEO4J_DRIVER)),
    __metadata("design:paramtypes", [neo4j_driver_1.Driver,
        prisma_service_1.PrismaService])
], GraphService);
//# sourceMappingURL=graph.service.js.map