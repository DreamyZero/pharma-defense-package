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
      substances: { include: { substance: true } },
      indications: true,
      interactionA: { include: { drugB: true } },
      contraindications: true,
    },
  });

  const session = driver.session();
  try {
    await session.run('MATCH (n) DETACH DELETE n');

    for (const drug of drugs) {
      await session.run(
        `MERGE (d:Drug {id: $id})
         SET d.name = $name, d.atcCode = $atcCode, d.dosageForm = $dosageForm`,
        {
          id: String(drug.id),
          name: drug.name,
          atcCode: drug.atcCode ?? '',
          dosageForm: drug.dosageForm ?? '',
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
          { drugId: String(drug.id), groupId },
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
            drugId: String(drug.id),
            subId: String(ds.substance.id),
            isPrimary: ds.isPrimary,
          },
        );
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
          { drugId: String(drug.id), indId },
        );
      }

      for (const interaction of drug.interactionA) {
        await session.run(
          `MATCH (a:Drug {id: $src}), (b:Drug {id: $tgt})
           MERGE (a)-[:INTERACTS_WITH {severity: $severity}]->(b)`,
          {
            src: String(drug.id),
            tgt: String(interaction.drugBId),
            severity: interaction.severity,
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
           MERGE (d)-[:HAS_CONTRAINDICATION]->(c)`,
          { drugId: String(drug.id), contraId },
        );
      }
    }

    console.log(`✅ Neo4j sync: ${drugs.length} препаратов`);
  } finally {
    await session.close();
    await driver.close();
  }
}
