"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEtlData = loadEtlData;
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma = new client_1.PrismaClient();
const PROCESSED_DIR = (0, path_1.join)(__dirname, '..', '..', 'etl', 'data', 'processed');
function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2)
        return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = [];
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
        const row = {};
        headers.forEach((h, i) => {
            row[h] = (values[i] ?? '').trim();
        });
        return row;
    });
}
function readCsv(name) {
    const path = (0, path_1.join)(PROCESSED_DIR, name);
    if (!(0, fs_1.existsSync)(path)) {
        console.warn(`⚠️  ${path} не найден, пропуск`);
        return [];
    }
    return parseCsv((0, fs_1.readFileSync)(path, 'utf-8'));
}
function mapSeverity(risk) {
    const r = risk.toLowerCase();
    if (r === 'high' || r === 'высокий')
        return 'HIGH';
    if (r === 'medium' || r === 'moderate' || r === 'средний')
        return 'MODERATE';
    if (r === 'contraindicated')
        return 'CONTRAINDICATED';
    return 'LOW';
}
function mapContra(condition) {
    const c = condition.toLowerCase();
    if (c.includes('детск'))
        return { minAge: 18, maxAge: null, context: 'pediatric' };
    if (c.includes('беремен'))
        return { minAge: null, maxAge: null, context: 'pregnancy' };
    if (c.includes('лактац') || c.includes('кормлен'))
        return { minAge: null, maxAge: null, context: 'lactation' };
    if (c.includes('почечн'))
        return { minAge: null, maxAge: null, context: 'renal' };
    if (c.includes('печеночн') || c.includes('печён'))
        return { minAge: null, maxAge: null, context: 'hepatic' };
    return { minAge: null, maxAge: null, context: null };
}
async function loadEtlData() {
    const drugsRows = readCsv('drugs.csv');
    if (drugsRows.length === 0) {
        console.warn('⚠️  Нет drugs.csv — запустите: cd etl/src && python parse_sources.py && python run_etl.py');
        return;
    }
    const etlIdToDbId = new Map();
    const nameToDbId = new Map();
    console.log(`📦 Загрузка ${drugsRows.length} препаратов...`);
    for (const row of drugsRows) {
        const slug = row.slug || row.trade_name.toLowerCase().replace(/\s+/g, '-');
        const drug = await prisma.drug.upsert({
            where: { slug },
            update: {
                name: row.trade_name,
                atcCode: row.atc || null,
                pharmacologicalGroup: row.group || null,
                dosageForm: 'Таблетки',
                active: true,
            },
            create: {
                name: row.trade_name,
                slug,
                atcCode: row.atc || null,
                pharmacologicalGroup: row.group || null,
                dosageForm: 'Таблетки',
                active: true,
            },
        });
        etlIdToDbId.set(row.drug_id, drug.id);
        nameToDbId.set(row.trade_name.toLowerCase(), drug.id);
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
        if (!drugId || !row.indication)
            continue;
        await prisma.drugIndication.create({
            data: { drugId, name: row.indication },
        });
    }
    const substanceByDrug = new Map();
    for (const [etlId, dbId] of etlIdToDbId) {
        const link = await prisma.drugSubstance.findFirst({
            where: { drugId: dbId, isPrimary: true },
            select: { substanceId: true },
        });
        if (link)
            substanceByDrug.set(dbId, link.substanceId);
    }
    for (const row of readCsv('synonyms.csv')) {
        const drugId = etlIdToDbId.get(row.drug_id);
        const substanceId = drugId ? substanceByDrug.get(drugId) : undefined;
        if (!substanceId || !row.synonym)
            continue;
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
        if (!drugId || !row.contraindication)
            continue;
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
        if (!sourceId || !row.analog_name)
            continue;
        let targetId = nameToDbId.get(row.analog_name.toLowerCase());
        if (!targetId) {
            const slug = row.analog_name.toLowerCase().replace(/\s+/g, '-');
            const created = await prisma.drug.upsert({
                where: { slug },
                update: { name: row.analog_name },
                create: {
                    name: row.analog_name,
                    slug,
                    active: true,
                },
            });
            targetId = created.id;
            nameToDbId.set(row.analog_name.toLowerCase(), targetId);
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
        if (!drugAId || !row.with_name)
            continue;
        const drugBId = nameToDbId.get(row.with_name.toLowerCase());
        if (!drugBId || drugAId === drugBId)
            continue;
        const [aId, bId] = drugAId < drugBId ? [drugAId, drugBId] : [drugBId, drugAId];
        await prisma.drugInteraction.upsert({
            where: { drugAId_drugBId: { drugAId: aId, drugBId: bId } },
            update: {
                severity: mapSeverity(row.risk_level || 'low'),
                clinicalEffect: row.note || null,
                recommendation: row.note || null,
                source: 'etl',
            },
            create: {
                drugAId: aId,
                drugBId: bId,
                severity: mapSeverity(row.risk_level || 'low'),
                clinicalEffect: row.note || null,
                recommendation: row.note || null,
                source: 'etl',
            },
        });
    }
    console.log(`✅ Загружено препаратов: ${etlIdToDbId.size}`);
}
//# sourceMappingURL=load-etl-data.js.map