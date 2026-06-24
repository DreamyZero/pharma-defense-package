import neo4j, { Driver } from 'neo4j-driver';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function syncNeo4jFromPostgres(): Promise<void> {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'password12345';

  let driver: Driver;
  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    await driver.verifyConnectivity();
  } catch (err) {
    console.warn(`⚠️  Neo4j недоступен (${uri}), пропуск sync: ${(err as Error).message}`);
    return;
  }

  const drugs = await prisma.drug.findMany({
    include: {
      substances: { include: { substance: { include: { synonymLinks: true } } } },
      indications: true,
      interactionA: { include: { drugB: true } },
      interactionB: { include: { drugA: true } },
      analogsFrom: { include: { targetDrug: true } },
      contraindications: true,
    },
  });

  const session = driver.session();
  const drugIds = drugs.map((d) => String(d.id));

  try {
    await session.run(`MATCH (d:Drug) WHERE NOT d.id IN $ids DETACH DELETE d`, { ids: drugIds });

    for (const drug of drugs) {
      const drugId = String(drug.id);

      await session.run(
        `MATCH (d:Drug {id: $id})-[r:CONTAINS|BELONGS_TO|HAS_INDICATION|HAS_CONTRAINDICATION|INTERACTS_WITH|ANALOG_OF]-() DELETE r`,
        { id: drugId },
      );

      await session.run(
        `MERGE (d:Drug {id: $id})
         SET d.name = $name, d.atcCode = $atcCode, d.dosageForm = $dosageForm, d.slug = $slug`,
        {
          id: drugId,
          name: drug.name,
          atcCode: drug.atcCode ?? '',
          dosageForm: drug.dosageForm ?? '',
          slug: drug.slug ?? '',
        },
      );

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
      }

      for (const ds of drug.substances) {
        await session.run(
          `MERGE (s:Substance {id: $id}) SET s.name = $name`,
          { id: String(ds.substance.id), name: ds.substance.name },
        );
        await session.run(
          `MATCH (d:Drug {id: $drugId}), (s:Substance {id: $subId})
           MERGE (d)-[:CONTAINS {isPrimary: $isPrimary}]->(s)`,
          {
            drugId,
            subId: String(ds.substance.id),
            isPrimary: ds.isPrimary,
          },
        );

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
        }
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
      }
    }

    await session.run(`MATCH (s:Substance) WHERE NOT (s)<-[:CONTAINS]-() DETACH DELETE s`);
    await session.run(`MATCH (g:PharmacologicalGroup) WHERE NOT (g)<-[:BELONGS_TO]-() DETACH DELETE g`);
    await session.run(`MATCH (i:Indication) WHERE NOT (i)<-[:HAS_INDICATION]-() DETACH DELETE i`);
    await session.run(`MATCH (c:Contraindication) WHERE NOT (c)<-[:HAS_CONTRAINDICATION]-() DETACH DELETE c`);
    await session.run(`MATCH (syn:Synonym) WHERE NOT (syn)<-[:HAS_SYNONYM]-() DETACH DELETE syn`);

    console.log(`✅ Neo4j sync: ${drugs.length} препаратов`);
  } finally {
    await session.close();
    await driver.close();
  }
}
