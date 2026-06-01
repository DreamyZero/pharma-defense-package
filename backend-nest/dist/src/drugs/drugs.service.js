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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrugsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const pharma_repository_1 = require("../domain/pharma.repository");
const pharma_data_1 = require("../domain/pharma.data");
let DrugsService = class DrugsService {
    constructor(repo, prisma) {
        this.repo = repo;
        this.prisma = prisma;
    }
    localBySlug(slug) {
        return pharma_data_1.drugs.find(d => d.name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase());
    }
    localByName(name) {
        const n = name.trim().toLowerCase();
        return pharma_data_1.drugs.find(d => d.name.toLowerCase() === n ||
            d.substance.toLowerCase() === n ||
            (d.synonyms || []).some((s) => s.toLowerCase() === n));
    }
    enrichDrugDetail(dbDrug, local) {
        if (!local)
            return dbDrug;
        return {
            ...dbDrug,
            description: dbDrug.description ||
                `${local.group}. Показания: ${local.indications.join(', ')}. ` +
                    `Побочные эффекты: ${(local.sideEffects || []).join(', ')}.`,
            dosageForm: dbDrug.dosageForm || 'Таблетки',
            contraindications: dbDrug.contraindications?.length
                ? dbDrug.contraindications
                : (local.contraindications || []).map((c) => ({ condition: c })),
            analogsFrom: dbDrug.analogsFrom?.length
                ? dbDrug.analogsFrom
                : (local.analogs || []).map((name, i) => ({
                    targetDrug: { id: -(i + 1), name },
                    confidence: 90,
                    reason: 'Одно действующее вещество / группа',
                })),
            interactionA: dbDrug.interactionA?.length
                ? dbDrug.interactionA
                : (local.interactions || []).map((ix) => ({
                    drugB: { name: ix.with },
                    severity: ix.risk,
                    clinicalEffect: ix.note,
                    recommendation: ix.note,
                })),
            interactionB: dbDrug.interactionB || [],
        };
    }
    async search(q) {
        if (!q || q.length < 2)
            return [];
        const n = q.trim().toLowerCase();
        try {
            const drugs = await this.prisma.drug.findMany({
                where: {
                    active: true,
                    OR: [
                        { name: { contains: n, mode: 'insensitive' } },
                        { atcCode: { contains: n, mode: 'insensitive' } },
                        { substances: { some: { substance: { name: { contains: n, mode: 'insensitive' } } } } },
                    ],
                },
                include: { substances: { include: { substance: true } } },
                take: 20,
            });
            if (drugs.length > 0)
                return drugs;
        }
        catch { }
        return this.repo.search(q).map(d => ({
            id: d.id,
            name: d.name,
            slug: d.name.toLowerCase().replace(/\s+/g, '-'),
            atcCode: d.atc,
            manufacturer: '',
            pharmacologicalGroup: d.group,
            substances: [{ substance: { name: d.substance } }],
        }));
    }
    async getBySlug(slug) {
        try {
            const dbDrug = await this.prisma.drug.findUnique({
                where: { slug },
                include: {
                    substances: { include: { substance: { include: { synonymLinks: true } } } },
                    contraindications: true,
                    analogsFrom: { include: { targetDrug: true } },
                    interactionA: { include: { drugB: true } },
                    interactionB: { include: { drugA: true } },
                },
            });
            if (dbDrug) {
                const local = this.localByName(dbDrug.name);
                return this.enrichDrugDetail(dbDrug, local);
            }
        }
        catch { }
        const local = this.localBySlug(slug);
        if (!local)
            return null;
        return {
            id: local.id,
            name: local.name,
            slug,
            atcCode: local.atc,
            manufacturer: '',
            pharmacologicalGroup: local.group,
            dosageForm: 'Таблетки',
            description: `${local.group}. Показания: ${local.indications.join(', ')}. ` +
                `Побочные эффекты: ${(local.sideEffects || []).join(', ')}.`,
            substances: [{ substance: { name: local.substance } }],
            contraindications: (local.contraindications || []).map((c) => ({ condition: c })),
            analogsFrom: (local.analogs || []).map((name, i) => ({
                targetDrug: { id: -(i + 1), name },
                confidence: 90,
                reason: 'Одно действующее вещество / группа',
            })),
            interactionA: (local.interactions || []).map((ix) => ({
                drugB: { name: ix.with },
                severity: ix.risk,
                clinicalEffect: ix.note,
                recommendation: ix.note,
            })),
            interactionB: [],
        };
    }
    async analogs(name) {
        const n = name.trim().toLowerCase();
        try {
            const drug = await this.prisma.drug.findFirst({
                where: { name: { equals: n, mode: 'insensitive' } },
                include: {
                    analogsFrom: { include: { targetDrug: { include: { substances: { include: { substance: true } } } } } },
                    substances: { include: { substance: true } },
                },
            });
            if (drug && drug.analogsFrom.length > 0) {
                return {
                    drug: drug.name,
                    analogs: drug.analogsFrom.map((a) => ({
                        id: a.targetDrug.id,
                        name: a.targetDrug.name,
                        substances: a.targetDrug.substances.map((s) => s.substance.name),
                        confidence: a.confidence != null
                            ? (a.confidence <= 1 ? Math.round(a.confidence * 100) : Math.round(a.confidence))
                            : 0,
                        reason: a.reason,
                    })),
                };
            }
        }
        catch { }
        const local = this.localByName(name);
        if (!local)
            return { drug: name, analogs: [] };
        return {
            drug: local.name,
            analogs: (local.analogs || []).map((aName, i) => ({
                id: -(i + 1),
                name: aName,
                substances: [local.substance],
                confidence: 90,
                reason: 'Одно действующее вещество / группа',
            })),
        };
    }
    async interactions(items) {
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
                        const a = drugs[i], b = drugs[j];
                        const interaction = await this.prisma.drugInteraction.findFirst({
                            where: { OR: [{ drugAId: a.id, drugBId: b.id }, { drugAId: b.id, drugBId: a.id }] },
                        });
                        results.push({
                            a: a.name, b: b.name,
                            risk: interaction?.severity?.toLowerCase() || 'low',
                            mechanism: interaction?.mechanism || null,
                            clinicalEffect: interaction?.clinicalEffect || null,
                            recommendation: interaction?.recommendation || 'Значимое взаимодействие не найдено',
                        });
                    }
                }
                if (results.some(r => r.mechanism || r.clinicalEffect))
                    return results;
            }
        }
        catch { }
        return items.flatMap((a, i) => items.slice(i + 1).map(b => {
            const da = this.localByName(a);
            const db = this.localByName(b);
            const hit = (da?.interactions || []).find((x) => x.with.toLowerCase() === (db?.name || b).toLowerCase()) ||
                (db?.interactions || []).find((x) => x.with.toLowerCase() === (da?.name || a).toLowerCase());
            return {
                a: da?.name || a,
                b: db?.name || b,
                risk: hit?.risk || 'low',
                mechanism: null,
                clinicalEffect: hit?.note || null,
                recommendation: hit?.note || 'Значимое взаимодействие не найдено в базе',
            };
        }));
    }
    async contra(drug, age, context) {
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
                if (warnings.length > 0)
                    return { drug: dbDrug.name, warnings, source: 'database' };
            }
        }
        catch { }
        const local = this.localByName(drug);
        if (!local)
            return { drug: null, warnings: [] };
        if (age < 18 && local.contraindications.includes('детский возраст'))
            warnings.push('Противопоказан в детском возрасте');
        if (context === 'pregnancy' && local.contraindications.includes('беременность'))
            warnings.push('Противопоказан при беременности');
        return { drug: local.name, warnings, source: 'repository' };
    }
    async dashboard() {
        const [drugsCount, substancesCount, interactionsCount] = await Promise.all([
            this.prisma.drug.count({ where: { active: true } }),
            this.prisma.substance.count(),
            this.prisma.drugInteraction.count(),
        ]).catch(() => [0, 0, 0]);
        return {
            metrics: [
                { label: 'Препаратов в базе', value: drugsCount || '14 283', note: '+247 за месяц' },
                { label: 'Действующих веществ', value: substancesCount || '3 841', note: 'Синонимов: 9 124' },
                { label: 'Взаимодействий в графе', value: interactionsCount || '28 654', note: 'HIGH: 4 201' },
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
exports.DrugsService = DrugsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pharma_repository_1.PharmaRepository, prisma_service_1.PrismaService])
], DrugsService);
//# sourceMappingURL=drugs.service.js.map