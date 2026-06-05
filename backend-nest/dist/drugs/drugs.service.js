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
var DrugsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrugsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
const pharma_repository_1 = require("../domain/pharma.repository");
const audit_service_1 = require("../audit/audit.service");
const pharma_data_1 = require("../domain/pharma.data");
let DrugsService = DrugsService_1 = class DrugsService {
    constructor(repo, prisma, audit) {
        this.repo = repo;
        this.prisma = prisma;
        this.audit = audit;
        this.logger = new common_1.Logger(DrugsService_1.name);
    }
    localBySlug(slug) {
        return pharma_data_1.drugs.find(d => d.name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase());
    }
    localByName(name) {
        const n = name.trim().toLowerCase();
        return pharma_data_1.drugs.find(d => d.name.toLowerCase() === n ||
            d.substance.toLowerCase() === n ||
            (d.synonyms ?? []).some((s) => s.toLowerCase() === n));
    }
    enrichDrugDetail(dbDrug, local) {
        if (!local)
            return dbDrug;
        return {
            ...dbDrug,
            description: dbDrug['description'] ||
                `${local.group}. Показания: ${local.indications.join(', ')}. ` +
                    `Побочные эффекты: ${(local.sideEffects ?? []).join(', ')}.`,
            dosageForm: dbDrug['dosageForm'] || 'Таблетки',
            contraindications: dbDrug['contraindications']?.length
                ? dbDrug['contraindications']
                : (local.contraindications).map((c) => ({ condition: c })),
            analogsFrom: dbDrug['analogsFrom']?.length
                ? dbDrug['analogsFrom']
                : (local.analogs ?? []).map((n, i) => ({
                    targetDrug: { id: -(i + 1), name: n },
                    confidence: 90,
                    reason: 'Одно действующее вещество / группа',
                })),
            interactionA: dbDrug['interactionA']?.length
                ? dbDrug['interactionA']
                : (local.interactions ?? []).map((ix) => ({
                    drugB: { name: ix.with },
                    severity: ix.risk,
                    clinicalEffect: ix.note,
                    recommendation: ix.note,
                })),
            interactionB: dbDrug['interactionB'] ?? [],
        };
    }
    isCompleteCatalogDrug(drug) {
        if (!drug.registrationNumber?.trim())
            return false;
        if (!drug.manufacturer?.trim())
            return false;
        if (!drug.atcCode?.trim())
            return false;
        if (!drug.pharmacologicalGroup?.trim())
            return false;
        if (!drug.description?.trim() || drug.description.length < 30)
            return false;
        const meta = drug.instructionMeta;
        if (!meta || typeof meta !== 'object')
            return false;
        const dosage = String(meta['dosageAdult'] ?? '').trim();
        if (!dosage || dosage === 'По инструкции')
            return false;
        const hasIndications = (Array.isArray(meta['indicationsList']) && meta['indicationsList'].length > 0) ||
            (drug.indications?.length ?? 0) > 0;
        return hasIndications;
    }
    async catalog() {
        try {
            const drugs = await this.prisma.drug.findMany({
                where: {
                    active: true,
                    registrationNumber: { not: null },
                    instructionMeta: { not: client_1.Prisma.DbNull },
                },
                include: {
                    substances: { include: { substance: true } },
                    indications: true,
                },
                orderBy: { name: 'asc' },
                take: 100,
            });
            const complete = drugs.filter(d => this.isCompleteCatalogDrug(d));
            if (complete.length > 0)
                return complete;
        }
        catch (err) {
            this.logger.warn(`[catalog] Prisma недоступна. ${err.message}`);
        }
        return pharma_data_1.drugs.map(d => ({
            id: d.id,
            name: d.name,
            slug: d.name.toLowerCase().replace(/\s+/g, '-'),
            atcCode: d.atc,
            manufacturer: '',
            pharmacologicalGroup: d.group,
            dosageForm: 'Таблетки',
            substances: [{ substance: { name: d.substance } }],
            indications: d.indications.map((name) => ({ name })),
        }));
    }
    async search(q, userId, ipAddress) {
        const trimmed = (q ?? '').trim();
        if (!trimmed)
            return this.catalog();
        if (trimmed.length < 2)
            return [];
        const n = trimmed.toLowerCase();
        try {
            const drugs = await this.prisma.drug.findMany({
                where: {
                    active: true,
                    OR: [
                        { name: { contains: n, mode: 'insensitive' } },
                        { atcCode: { contains: n, mode: 'insensitive' } },
                        { pharmacologicalGroup: { contains: n, mode: 'insensitive' } },
                        { substances: { some: { substance: { name: { contains: n, mode: 'insensitive' } } } } },
                        {
                            substances: {
                                some: {
                                    substance: {
                                        synonymLinks: { some: { synonym: { contains: n, mode: 'insensitive' } } },
                                    },
                                },
                            },
                        },
                        { indications: { some: { name: { contains: n, mode: 'insensitive' } } } },
                    ],
                },
                include: { substances: { include: { substance: true } }, indications: true },
                take: 50,
            });
            const complete = drugs.filter(d => this.isCompleteCatalogDrug(d));
            if (complete.length > 0) {
                await this.audit.logSafe({
                    userId,
                    action: 'DRUG_SEARCH',
                    entityType: 'Drug',
                    entityId: trimmed,
                    newValues: { query: trimmed, resultsCount: complete.length, source: 'database' },
                    ipAddress,
                });
                return complete;
            }
        }
        catch (err) {
            this.logger.warn(`[search] Prisma недоступна. Причина: ${err.message}`);
        }
        const localResults = pharma_data_1.drugs.filter(d => d.name.toLowerCase().includes(n) ||
            d.substance.toLowerCase().includes(n) ||
            (d.synonyms ?? []).some(s => s.toLowerCase().includes(n)) ||
            d.indications.some(i => i.toLowerCase().includes(n)));
        await this.audit.logSafe({
            userId,
            action: 'DRUG_SEARCH',
            entityType: 'Drug',
            entityId: trimmed,
            newValues: { query: trimmed, resultsCount: localResults.length, source: 'local' },
            ipAddress,
        });
        return localResults.map(d => ({
            id: d.id,
            name: d.name,
            slug: d.name.toLowerCase().replace(/\s+/g, '-'),
            atcCode: d.atc,
            manufacturer: '',
            pharmacologicalGroup: d.group,
            substances: [{ substance: { name: d.substance } }],
        }));
    }
    async getBySlug(slug, userId, ipAddress) {
        try {
            const dbDrug = await this.prisma.drug.findUnique({
                where: { slug },
                include: {
                    substances: { include: { substance: { include: { synonymLinks: true } } } },
                    indications: true,
                    contraindications: true,
                    analogsFrom: { include: { targetDrug: true } },
                    interactionA: { include: { drugB: true } },
                    interactionB: { include: { drugA: true } },
                },
            });
            if (dbDrug) {
                await this.audit.logSafe({
                    userId,
                    action: 'DRUG_VIEW',
                    entityType: 'Drug',
                    entityId: String(dbDrug.id),
                    newValues: { slug, name: dbDrug.name },
                    ipAddress,
                });
                const local = this.localByName(dbDrug.name);
                const enriched = this.enrichDrugDetail(dbDrug, local);
                const indicationNames = dbDrug.indications.map((i) => i.name);
                if (!enriched['description'] && indicationNames.length > 0) {
                    const group = dbDrug.pharmacologicalGroup ?? '';
                    enriched['description'] = `${group ? `${group}. ` : ''}Показания: ${indicationNames.join(', ')}.`.trim();
                }
                return enriched;
            }
        }
        catch (err) {
            this.logger.warn(`[getBySlug] Prisma недоступна для slug="${slug}". Причина: ${err.message}`);
        }
        const local = this.localBySlug(slug);
        if (!local)
            return null;
        await this.audit.logSafe({
            userId,
            action: 'DRUG_VIEW',
            entityType: 'Drug',
            entityId: slug,
            newValues: { slug, source: 'local' },
            ipAddress,
        });
        return {
            id: local.id,
            name: local.name,
            slug,
            atcCode: local.atc,
            manufacturer: '',
            pharmacologicalGroup: local.group,
            dosageForm: 'Таблетки',
            description: `${local.group}. Показания: ${local.indications.join(', ')}. ` +
                `Побочные эффекты: ${(local.sideEffects ?? []).join(', ')}.`,
            substances: [{ substance: { name: local.substance } }],
            contraindications: local.contraindications.map((c) => ({ condition: c })),
            analogsFrom: (local.analogs ?? []).map((n, i) => ({
                targetDrug: { id: -(i + 1), name: n },
                confidence: 90,
                reason: 'Одно действующее вещество / группа',
            })),
            interactionA: (local.interactions ?? []).map((ix) => ({
                drugB: { name: ix.with },
                severity: ix.risk,
                clinicalEffect: ix.note,
                recommendation: ix.note,
            })),
            interactionB: [],
        };
    }
    async analogs(name, userId, ipAddress) {
        const n = name.trim().toLowerCase();
        try {
            const drug = await this.prisma.drug.findFirst({
                where: {
                    OR: [
                        { name: { equals: n, mode: 'insensitive' } },
                        { substances: { some: { substance: { name: { equals: n, mode: 'insensitive' } } } } },
                        {
                            substances: {
                                some: {
                                    substance: {
                                        synonymLinks: { some: { synonym: { equals: n, mode: 'insensitive' } } },
                                    },
                                },
                            },
                        },
                    ],
                },
                include: {
                    analogsFrom: { include: { targetDrug: { include: { substances: { include: { substance: true } } } } } },
                    substances: { include: { substance: true } },
                },
            });
            if (drug) {
                const primarySubstance = drug.substances.find(ds => ds.isPrimary) ?? drug.substances[0];
                const bySubstance = primarySubstance
                    ? await this.prisma.drug.findMany({
                        where: {
                            id: { not: drug.id },
                            active: true,
                            substances: { some: { isPrimary: true, substanceId: primarySubstance.substanceId } },
                        },
                        include: { substances: { include: { substance: true } } },
                        take: 30,
                    })
                    : [];
                const merged = new Map();
                for (const a of drug.analogsFrom) {
                    merged.set(a.targetDrug.id, {
                        id: a.targetDrug.id,
                        name: a.targetDrug.name,
                        substances: a.targetDrug.substances.map(s => s.substance.name),
                        confidence: a.confidence != null
                            ? a.confidence <= 1
                                ? Math.round(a.confidence * 100)
                                : Math.round(a.confidence)
                            : 90,
                        reason: a.reason ?? 'Запись в справочнике аналогов',
                    });
                }
                for (const candidate of bySubstance) {
                    if (merged.has(candidate.id))
                        continue;
                    merged.set(candidate.id, {
                        id: candidate.id,
                        name: candidate.name,
                        substances: candidate.substances.map(s => s.substance.name),
                        confidence: 95,
                        reason: `Одно действующее вещество: ${primarySubstance?.substance.name ?? ''}`,
                    });
                }
                if (merged.size > 0) {
                    await this.audit.logSafe({
                        userId,
                        action: 'ANALOG_SEARCH',
                        entityType: 'Drug',
                        entityId: String(drug.id),
                        newValues: { query: name, resultsCount: merged.size },
                        ipAddress,
                    });
                    return { drug: drug.name, analogs: Array.from(merged.values()) };
                }
            }
        }
        catch (err) {
            this.logger.warn(`[analogs] Prisma недоступна для "${name}". Причина: ${err.message}`);
        }
        const local = this.localByName(name);
        if (!local)
            return { drug: name, analogs: [] };
        await this.audit.logSafe({
            userId,
            action: 'ANALOG_SEARCH',
            entityType: 'Drug',
            entityId: name,
            newValues: { query: name, source: 'local' },
            ipAddress,
        });
        return {
            drug: local.name,
            analogs: (local.analogs ?? []).map((aName, i) => ({
                id: -(i + 1),
                name: aName,
                substances: [local.substance],
                confidence: 90,
                reason: 'Одно действующее вещество / группа',
            })),
        };
    }
    async interactions(items, userId, ipAddress) {
        if (items.length < 2)
            return [];
        try {
            const drugs = await this.prisma.drug.findMany({
                where: { name: { in: items, mode: 'insensitive' } },
                select: { id: true, name: true },
            });
            if (drugs.length >= 2) {
                const results = [];
                for (let i = 0; i < drugs.length; i++) {
                    for (let j = i + 1; j < drugs.length; j++) {
                        const a = drugs[i];
                        const b = drugs[j];
                        const interaction = await this.prisma.drugInteraction.findFirst({
                            where: { OR: [{ drugAId: a.id, drugBId: b.id }, { drugAId: b.id, drugBId: a.id }] },
                        });
                        results.push({
                            a: a.name,
                            b: b.name,
                            risk: interaction?.severity?.toLowerCase() ?? 'low',
                            mechanism: interaction?.mechanism ?? null,
                            clinicalEffect: interaction?.clinicalEffect ?? null,
                            recommendation: interaction?.recommendation ?? 'Значимое взаимодействие не найдено',
                        });
                    }
                }
                if (results.some(r => r.mechanism ?? r.clinicalEffect)) {
                    await this.audit.logSafe({
                        userId,
                        action: 'INTERACTION_CHECK',
                        entityType: 'Drug',
                        entityId: items.join(','),
                        newValues: { items, resultsCount: results.length },
                        ipAddress,
                    });
                    return results;
                }
            }
        }
        catch (err) {
            this.logger.warn(`[interactions] Prisma недоступна. Причина: ${err.message}`);
        }
        const result = items.flatMap((a, i) => items.slice(i + 1).map((b) => {
            const da = this.localByName(a);
            const db = this.localByName(b);
            const hit = (da?.interactions ?? []).find((x) => x.with.toLowerCase() === (db?.name ?? b).toLowerCase()) ??
                (db?.interactions ?? []).find((x) => x.with.toLowerCase() === (da?.name ?? a).toLowerCase());
            return {
                a: da?.name ?? a,
                b: db?.name ?? b,
                risk: hit?.risk ?? 'low',
                mechanism: null,
                clinicalEffect: hit?.note ?? null,
                recommendation: hit?.note ?? 'Значимое взаимодействие не найдено в базе',
            };
        }));
        await this.audit.logSafe({
            userId,
            action: 'INTERACTION_CHECK',
            entityType: 'Drug',
            entityId: items.join(','),
            newValues: { items, source: 'local' },
            ipAddress,
        });
        return result;
    }
    async contra(drug, age, context, userId, ipAddress) {
        const warnings = [];
        try {
            const dbDrug = await this.prisma.drug.findFirst({
                where: { name: { equals: drug.trim(), mode: 'insensitive' } },
                include: { contraindications: true },
            });
            if (dbDrug) {
                for (const c of dbDrug.contraindications) {
                    if (c.minAge !== null && age < c.minAge)
                        warnings.push(`Возраст ниже допустимого (мин. ${c.minAge} лет): ${c.condition}`);
                    if (c.maxAge !== null && age > c.maxAge)
                        warnings.push(`Возраст выше допустимого (макс. ${c.maxAge} лет): ${c.condition}`);
                    if (c.context && context && c.context.toLowerCase() === context.toLowerCase())
                        warnings.push(`${c.condition}${c.note ? ' — ' + c.note : ''}`);
                }
                await this.audit.logSafe({
                    userId,
                    action: 'CONTRA_CHECK',
                    entityType: 'Drug',
                    entityId: String(dbDrug.id),
                    newValues: { drug: dbDrug.name, age, context, warningsCount: warnings.length },
                    ipAddress,
                });
                if (warnings.length > 0)
                    return { drug: dbDrug.name, warnings, source: 'database' };
            }
        }
        catch (err) {
            this.logger.warn(`[contra] Prisma недоступна для "${drug}". Причина: ${err.message}`);
        }
        const local = this.localByName(drug);
        if (!local)
            return { drug: null, warnings: [] };
        const has = (part) => local.contraindications.some((c) => c.toLowerCase().includes(part));
        if (age < 18 && has('детск'))
            warnings.push('Противопоказан в детском возрасте');
        if (context === 'pregnancy' && has('беремен'))
            warnings.push('Противопоказан при беременности');
        if (context === 'lactation' && has('лактац'))
            warnings.push('Противопоказан при кормлении грудью');
        if (context === 'renal' && has('почечн'))
            warnings.push('Противопоказан при почечной недостаточности');
        if (context === 'hepatic' && has('печен'))
            warnings.push('Противопоказан при печёночной недостаточности');
        if (context === 'pediatric' && has('детск'))
            warnings.push('Противопоказан в детском возрасте');
        if (!context && warnings.length === 0)
            local.contraindications.forEach((c) => warnings.push(c));
        await this.audit.logSafe({
            userId,
            action: 'CONTRA_CHECK',
            entityType: 'Drug',
            entityId: drug,
            newValues: { drug, age, context, source: 'local', warningsCount: warnings.length },
            ipAddress,
        });
        return { drug: local.name, warnings, source: 'repository' };
    }
    async dashboard() {
        const [drugsCount, substancesCount, interactionsCount] = await Promise.all([
            this.prisma.drug.count({ where: { active: true } }),
            this.prisma.substance.count(),
            this.prisma.drugInteraction.count(),
        ]).catch((err) => {
            this.logger.warn(`[dashboard] Prisma недоступна. Причина: ${err.message}`);
            return [0, 0, 0];
        });
        const isFallback = drugsCount === 0 && substancesCount === 0 && interactionsCount === 0;
        return {
            isFallback,
            metrics: [
                { label: 'Препаратов в базе', value: isFallback ? '14 283*' : drugsCount, note: isFallback ? '* демо-данные' : '+247 за месяц' },
                { label: 'Действующих веществ', value: isFallback ? '3 841*' : substancesCount, note: isFallback ? '* демо-данные' : 'Синонимов: 9 124' },
                { label: 'Взаимодействий в графе', value: isFallback ? '28 654*' : interactionsCount, note: isFallback ? '* демо-данные' : 'HIGH: 4 201' },
                { label: 'Покрытие ГРЛС', value: '98%', note: 'Обновлено: 01.05.2025' },
            ],
            recentQueries: [
                { name: 'Аспирин', subtitle: 'Ацетилсалициловая кислота · C01EB02', time: '12:34' },
                { name: 'Метформин', subtitle: 'Метформина гидрохлорид · A10BA02', time: '11:20' },
                { name: 'Лизиноприл', subtitle: 'Лизиноприл · C09AA03', time: '10:05' },
            ],
        };
    }
};
exports.DrugsService = DrugsService;
exports.DrugsService = DrugsService = DrugsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pharma_repository_1.PharmaRepository,
        prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], DrugsService);
//# sourceMappingURL=drugs.service.js.map