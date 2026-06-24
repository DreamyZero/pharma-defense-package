import { PrismaClient, InteractionSeverity } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

function resolveProcessedDir(): string {
  if (process.env.ETL_PROCESSED_DIR) return process.env.ETL_PROCESSED_DIR;
  if (process.env.ETL_DIR) return join(process.env.ETL_DIR, 'data', 'processed');
  return join(__dirname, '..', '..', 'etl', 'data', 'processed');
}

const CATALOG_JSON = join(__dirname, '..', '..', 'etl', 'data', 'samples', 'drugs_catalog.json');

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        values.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    values.push(cur);
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').trim();
    });
    return row;
  });
}

function readCsv(name: string): CsvRow[] {
  const path = join(resolveProcessedDir(), name);
  if (!existsSync(path)) {
    console.warn(`⚠️  ${path} не найден, пропуск`);
    return [];
  }
  return parseCsv(readFileSync(path, 'utf-8'));
}

function tradeNameFromRow(row: CsvRow): string {
  return String(row.trade_name ?? row.name ?? '').trim();
}

function slugFromRow(row: CsvRow, tradeName: string): string {
  const explicit = String(row.slug ?? '').trim();
  if (explicit) return explicit;
  return tradeName.toLowerCase().replace(/\s+/g, '-');
}

function readCatalogRows(): CsvRow[] {
  const fromProcessed = readCsv('drugs.csv');
  if (fromProcessed.length > 0) {
    return fromProcessed.filter(row => tradeNameFromRow(row).length > 0);
  }
  if (!existsSync(CATALOG_JSON)) {
    return [];
  }
  const items = JSON.parse(readFileSync(CATALOG_JSON, 'utf-8')) as Record<string, string>[];
  return items.map((item, index) => {
    const trade = item.trade_name || '';
    const slug = trade.toLowerCase().replace(/\s+/g, '-');
    return {
      drug_id: String(index + 1),
      trade_name: trade,
      substance: item.substance || '',
      atc: item.atc || '',
      group: item.group || '',
      slug,
      manufacturer: item.manufacturer || '',
      form: item.form || '',
      registration_number: item.registration_number || '',
      dosage_adult: item.dosage_adult || '',
      dosage_children: item.dosage_children || '',
      storage_conditions: item.storage_conditions || '',
      shelf_life: item.shelf_life || '',
      dispensing_rule: item.dispensing_rule || '',
      indications: item.indications || '',
      contraindications: item.contraindications || '',
      side_effects: item.side_effects || '',
    };
  });
}

function mapSeverity(risk: string): InteractionSeverity {
  const r = risk.toLowerCase();
  if (r === 'high' || r === 'высокий') return 'HIGH';
  if (r === 'medium' || r === 'moderate' || r === 'средний') return 'MODERATE';
  if (r === 'contraindicated') return 'CONTRAINDICATED';
  return 'LOW';
}

function splitSemi(value: string): string[] {
  return value
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
}

function buildInstructionPayload(row: CsvRow) {
  const indications = splitSemi(row.indications || '');
  const contraindications = splitSemi(row.contraindications || '');
  const sideEffects = splitSemi(row.side_effects || '');
  const dispensing = (row.dispensing_rule || '').toLowerCase();

  const instructionMeta = {
    dosageAdult: row.dosage_adult || undefined,
    dosageChildren: row.dosage_children || undefined,
    storageConditions: row.storage_conditions || undefined,
    shelfLife: row.shelf_life || undefined,
    dispensingRule: row.dispensing_rule || undefined,
    sideEffects: sideEffects.length ? sideEffects : undefined,
    indicationsList: indications.length ? indications : undefined,
    contraindicationsList: contraindications.length ? contraindications : undefined,
  };

  const parts: string[] = [];
  if (row.registration_number) parts.push(`Регистрационный номер: ${row.registration_number}`);
  if (row.manufacturer) parts.push(`Производитель: ${row.manufacturer}`);
  if (row.form) parts.push(`Лекарственная форма: ${row.form}`);
  if (indications.length) parts.push(`Показания к применению: ${indications.join('; ')}`);
  if (contraindications.length) parts.push(`Противопоказания: ${contraindications.join('; ')}`);
  if (sideEffects.length) parts.push(`Побочные действия: ${sideEffects.join('; ')}`);
  if (row.dosage_adult) parts.push(`Дозировка (взрослые): ${row.dosage_adult}`);
  if (row.dosage_children) parts.push(`Дозировка (дети): ${row.dosage_children}`);
  if (row.storage_conditions) parts.push(`Условия хранения: ${row.storage_conditions}`);
  if (row.shelf_life) parts.push(`Срок годности: ${row.shelf_life}`);
  if (dispensing) {
    parts.push(`Условия отпуска: ${dispensing === 'prescription' ? 'по рецепту' : 'без рецепта'}`);
  }

  return {
    description: parts.join('\n\n'),
    instructionMeta,
    manufacturer: row.manufacturer || null,
    dosageForm: row.form || 'Таблетки',
    registrationNumber: row.registration_number || null,
    rxRequired: dispensing === 'prescription',
  };
}

function mapContra(condition: string): {
  minAge: number | null;
  maxAge: number | null;
  context: string | null;
} {
  const c = condition.toLowerCase();
  if (c.includes('детск')) return { minAge: 18, maxAge: null, context: 'pediatric' };
  if (c.includes('беремен')) return { minAge: null, maxAge: null, context: 'pregnancy' };
  if (c.includes('лактац') || c.includes('кормлен')) return { minAge: null, maxAge: null, context: 'lactation' };
  if (c.includes('почечн')) return { minAge: null, maxAge: null, context: 'renal' };
  if (c.includes('печеночн') || c.includes('печён')) return { minAge: null, maxAge: null, context: 'hepatic' };
  return { minAge: null, maxAge: null, context: null };
}

export async function loadEtlData(): Promise<void> {
  const drugsRows = readCatalogRows();
  if (drugsRows.length === 0) {
    console.warn('⚠️  Нет drugs.csv — запустите: cd etl/src && python parse_sources.py && python run_etl.py');
    return;
  }

  const etlIdToDbId = new Map<string, number>();
  const nameToDbId = new Map<string, number>();

  console.log(`📦 Загрузка ${drugsRows.length} препаратов...`);

  for (const row of drugsRows) {
    const tradeName = tradeNameFromRow(row);
    if (!tradeName) {
      console.warn(`⚠️  Пропуск строки без названия (drug_id=${row.drug_id ?? '?'})`);
      continue;
    }

    const slug = slugFromRow(row, tradeName);
    const instr = buildInstructionPayload(row);
    const drug = await prisma.drug.upsert({
      where: { slug },
      update: {
        name: tradeName,
        atcCode: row.atc || null,
        pharmacologicalGroup: row.group || null,
        manufacturer: instr.manufacturer,
        dosageForm: instr.dosageForm,
        registrationNumber: instr.registrationNumber,
        description: instr.description,
        instructionMeta: instr.instructionMeta,
        rxRequired: instr.rxRequired,
        active: true,
      },
      create: {
        name: tradeName,
        slug,
        atcCode: row.atc || null,
        pharmacologicalGroup: row.group || null,
        manufacturer: instr.manufacturer,
        dosageForm: instr.dosageForm,
        registrationNumber: instr.registrationNumber,
        description: instr.description,
        instructionMeta: instr.instructionMeta,
        rxRequired: instr.rxRequired,
        active: true,
      },
    });

    etlIdToDbId.set(String(row.drug_id ?? drug.id), drug.id);
    nameToDbId.set(tradeName.toLowerCase(), drug.id);

    if (row.substance) {
      const substance = await prisma.substance.upsert({
        where: { name: row.substance },
        update: {},
        create: { name: row.substance },
      });
      await prisma.drugSubstance.upsert({
        where: { drugId_substanceId: { drugId: drug.id, substanceId: substance.id } },
        update: { isPrimary: true },
        create: { drugId: drug.id, substanceId: substance.id, isPrimary: true },
      });
    }
  }

  await prisma.drugIndication.deleteMany({
    where: { drugId: { in: [...etlIdToDbId.values()] } },
  });
  for (const row of readCsv('indications.csv')) {
    const drugId = etlIdToDbId.get(row.drug_id);
    if (!drugId || !row.indication) continue;
    await prisma.drugIndication.create({
      data: { drugId, name: row.indication },
    });
  }

  const substanceByDrug = new Map<number, number>();
  for (const [etlId, dbId] of etlIdToDbId) {
    const link = await prisma.drugSubstance.findFirst({
      where: { drugId: dbId, isPrimary: true },
      select: { substanceId: true },
    });
    if (link) substanceByDrug.set(dbId, link.substanceId);
  }
  for (const row of readCsv('synonyms.csv')) {
    const drugId = etlIdToDbId.get(row.drug_id);
    const substanceId = drugId ? substanceByDrug.get(drugId) : undefined;
    if (!substanceId || !row.synonym) continue;
    await prisma.substanceSynonym.upsert({
      where: { substanceId_synonym: { substanceId, synonym: row.synonym.toLowerCase() } },
      update: {},
      create: { substanceId, synonym: row.synonym.toLowerCase() },
    });
  }

  await prisma.contraindication.deleteMany({
    where: { drugId: { in: [...etlIdToDbId.values()] } },
  });
  for (const row of readCsv('contraindications.csv')) {
    const drugId = etlIdToDbId.get(row.drug_id);
    if (!drugId || !row.contraindication) continue;
    const mapped = mapContra(row.contraindication);
    await prisma.contraindication.create({
      data: {
        drugId,
        condition: row.contraindication,
        minAge: mapped.minAge,
        maxAge: mapped.maxAge,
        context: mapped.context,
      },
    });
  }

  for (const row of readCsv('analogs.csv')) {
    const sourceId = etlIdToDbId.get(row.drug_id);
    const analogName = String(row.analog_name ?? '').trim();
    if (!sourceId || !analogName) continue;

    let targetId = nameToDbId.get(analogName.toLowerCase());
    if (!targetId) {
      const slug = analogName.toLowerCase().replace(/\s+/g, '-');
      const created = await prisma.drug.upsert({
        where: { slug },
        update: { name: analogName },
        create: {
          name: analogName,
          slug,
          active: false,
        },
      });
      targetId = created.id;
      nameToDbId.set(analogName.toLowerCase(), targetId);
    }

    await prisma.drugAnalog.upsert({
      where: { sourceDrugId_targetDrugId: { sourceDrugId: sourceId, targetDrugId: targetId } },
      update: { reason: 'Одно действующее вещество / группа', confidence: 90 },
      create: {
        sourceDrugId: sourceId,
        targetDrugId: targetId,
        reason: 'Одно действующее вещество / группа',
        confidence: 90,
      },
    });
  }

  for (const row of readCsv('interactions.csv')) {
    const drugAId = etlIdToDbId.get(row.drug_id);
    const withName = String(row.with_name ?? '').trim();
    if (!drugAId || !withName) continue;
    const drugBId = nameToDbId.get(withName.toLowerCase());
    if (!drugBId || drugAId === drugBId) continue;

    const [aId, bId] = drugAId < drugBId ? [drugAId, drugBId] : [drugBId, drugAId];
    await prisma.drugInteraction.upsert({
      where: { drugAId_drugBId: { drugAId: aId, drugBId: bId } },
      update: {
        severity: mapSeverity(row.risk_level || 'low'),
        clinicalEffect: row.note || null,
        recommendation: row.note || null,
        source: row.source || 'etl',
      },
      create: {
        drugAId: aId,
        drugBId: bId,
        severity: mapSeverity(row.risk_level || 'low'),
        clinicalEffect: row.note || null,
        recommendation: row.note || null,
        source: row.source || 'etl',
      },
    });
  }

  await prisma.drug.updateMany({
    where: { registrationNumber: null },
    data: { active: false },
  });

  console.log(`✅ Загружено препаратов: ${etlIdToDbId.size}`);
}
