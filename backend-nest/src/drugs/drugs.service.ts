import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PharmaRepository } from '../domain/pharma.repository';
import { AuditService } from '../audit/audit.service';
import { drugs as localDrugs } from '../domain/pharma.data';

type LocalDrug = {
  id: number;
  name: string;
  substance: string;
  atc: string;
  group: string;
  synonyms?: string[];
  indications: string[];
  sideEffects?: string[];
  contraindications: string[];
  analogs?: string[];
  interactions?: Array<{ with: string; risk: string; note: string }>;
};

@Injectable()
export class DrugsService {
  private readonly logger = new Logger(DrugsService.name);

  constructor(
    private repo: PharmaRepository,
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── helpers ───────────────────────────────────────────────────────────────

  private localBySlug(slug: string): LocalDrug | undefined {
    return (localDrugs as LocalDrug[]).find(
      d => d.name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase(),
    );
  }

  private localByName(name: string): LocalDrug | undefined {
    const n = name.trim().toLowerCase();
    return (localDrugs as LocalDrug[]).find(
      d =>
        d.name.toLowerCase() === n ||
        d.substance.toLowerCase() === n ||
        (d.synonyms ?? []).some((s: string) => s.toLowerCase() === n),
    );
  }

  private enrichDrugDetail(dbDrug: Record<string, any>, local: LocalDrug | undefined): Record<string, any> {
    if (!local) return dbDrug;
    return {
      ...dbDrug,
      description:
        dbDrug['description'] ||
        `${local.group}. Показания: ${local.indications.join(', ')}. ` +
          `Побочные эффекты: ${(local.sideEffects ?? []).join(', ')}.`,
      dosageForm: dbDrug['dosageForm'] || 'Таблетки',
      contraindications: (dbDrug['contraindications'] as any[])?.length
        ? dbDrug['contraindications']
        : (local.contraindications).map((c: string) => ({ condition: c })),
      analogsFrom: (dbDrug['analogsFrom'] as any[])?.length
        ? dbDrug['analogsFrom']
        : (local.analogs ?? []).map((n: string, i: number) => ({
            targetDrug: { id: -(i + 1), name: n },
            confidence: 90,
            reason: 'Одно действующее вещество / группа',
          })),
      interactionA: (dbDrug['interactionA'] as any[])?.length
        ? dbDrug['interactionA']
        : (local.interactions ?? []).map((ix: { with: string; risk: string; note: string }) => ({
            drugB: { name: ix.with },
            severity: ix.risk,
            clinicalEffect: ix.note,
            recommendation: ix.note,
          })),
      interactionB: dbDrug['interactionB'] ?? [],
    };
  }

  // ── routes ────────────────────────────────────────────────────────────────

  private isCompleteCatalogDrug(drug: {
    registrationNumber?: string | null;
    manufacturer?: string | null;
    atcCode?: string | null;
    pharmacologicalGroup?: string | null;
    description?: string | null;
    instructionMeta?: unknown;
    indications?: Array<{ name: string }>;
  }): boolean {
    if (!drug.registrationNumber?.trim()) return false;
    if (!drug.manufacturer?.trim()) return false;
    if (!drug.atcCode?.trim()) return false;
    if (!drug.pharmacologicalGroup?.trim()) return false;
    if (!drug.description?.trim() || drug.description.length < 30) return false;
    const meta = drug.instructionMeta as Record<string, unknown> | null;
    if (!meta || typeof meta !== 'object') return false;
    const dosage = String(meta['dosageAdult'] ?? '').trim();
    if (!dosage || dosage === 'По инструкции') return false;
    const hasIndications =
      (Array.isArray(meta['indicationsList']) && (meta['indicationsList'] as unknown[]).length > 0) ||
      (drug.indications?.length ?? 0) > 0;
    return hasIndications;
  }

  async catalog() {
    try {
      const drugs = await this.prisma.drug.findMany({
        where: {
          active: true,
          registrationNumber: { not: null },
          instructionMeta: { not: Prisma.DbNull },
        },
        include: {
          substances: { include: { substance: true } },
          indications: true,
        },
        orderBy: { name: 'asc' },
        take: 100,
      });
      const complete = drugs.filter(d => this.isCompleteCatalogDrug(d));
      if (complete.length > 0) return complete;
    } catch (err) {
      this.logger.warn(`[catalog] Prisma недоступна. ${(err as Error).message}`);
    }
    return (localDrugs as LocalDrug[]).map(d => ({
      id: d.id,
      name: d.name,
      slug: d.name.toLowerCase().replace(/\s+/g, '-'),
      atcCode: d.atc,
      manufacturer: '',
      pharmacologicalGroup: d.group,
      dosageForm: 'Таблетки',
      substances: [{ substance: { name: d.substance } }],
      indications: d.indications.map((name: string) => ({ name })),
    }));
  }

  async search(q: string, userId?: number, ipAddress?: string) {
    const trimmed = (q ?? '').trim();
    if (!trimmed) return this.catalog();
    if (trimmed.length < 2) return [];
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
    } catch (err) {
      this.logger.warn(`[search] Prisma недоступна. Причина: ${(err as Error).message}`);
    }
    const localResults = (localDrugs as LocalDrug[]).filter(d =>
      d.name.toLowerCase().includes(n) ||
      d.substance.toLowerCase().includes(n) ||
      (d.synonyms ?? []).some(s => s.toLowerCase().includes(n)) ||
      d.indications.some(i => i.toLowerCase().includes(n)),
    );
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

  async getBySlug(slug: string, userId?: number, ipAddress?: string) {
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
        const enriched = this.enrichDrugDetail(dbDrug as unknown as Record<string, any>, local);
        const indicationNames = dbDrug.indications.map((i: { name: string }) => i.name);
        if (!enriched['description'] && indicationNames.length > 0) {
          const group = dbDrug.pharmacologicalGroup ?? '';
          enriched['description'] = `${group ? `${group}. ` : ''}Показания: ${indicationNames.join(', ')}.`.trim();
        }
        return enriched;
      }
    } catch (err) {
      this.logger.warn(`[getBySlug] Prisma недоступна для slug="${slug}". Причина: ${(err as Error).message}`);
    }
    const local = this.localBySlug(slug);
    if (!local) return null;

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
      description:
        `${local.group}. Показания: ${local.indications.join(', ')}. ` +
        `Побочные эффекты: ${(local.sideEffects ?? []).join(', ')}.`,
      substances: [{ substance: { name: local.substance } }],
      contraindications: local.contraindications.map((c: string) => ({ condition: c })),
      analogsFrom: (local.analogs ?? []).map((n: string, i: number) => ({
        targetDrug: { id: -(i + 1), name: n },
        confidence: 90,
        reason: 'Одно действующее вещество / группа',
      })),
      interactionA: (local.interactions ?? []).map((ix: { with: string; risk: string; note: string }) => ({
        drugB: { name: ix.with },
        severity: ix.risk,
        clinicalEffect: ix.note,
        recommendation: ix.note,
      })),
      interactionB: [],
    };
  }

  async analogs(name: string, userId?: number, ipAddress?: string) {
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

        const merged = new Map<number, { id: number; name: string; substances: string[]; confidence: number; reason: string }>();

        for (const a of drug.analogsFrom) {
          merged.set(a.targetDrug.id, {
            id: a.targetDrug.id,
            name: a.targetDrug.name,
            substances: a.targetDrug.substances.map(s => s.substance.name),
            confidence:
              a.confidence != null
                ? a.confidence <= 1
                  ? Math.round(a.confidence * 100)
                  : Math.round(a.confidence)
                : 90,
            reason: a.reason ?? 'Запись в справочнике аналогов',
          });
        }
        for (const candidate of bySubstance) {
          if (merged.has(candidate.id)) continue;
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
    } catch (err) {
      this.logger.warn(`[analogs] Prisma недоступна для "${name}". Причина: ${(err as Error).message}`);
    }
    const local = this.localByName(name);
    if (!local) return { drug: name, analogs: [] };

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
      analogs: (local.analogs ?? []).map((aName: string, i: number) => ({
        id: -(i + 1),
        name: aName,
        substances: [local.substance],
        confidence: 90,
        reason: 'Одно действующее вещество / группа',
      })),
    };
  }

  async interactions(items: string[], userId?: number, ipAddress?: string) {
    if (items.length < 2) return [];
    try {
      const drugs = await this.prisma.drug.findMany({
        where: { name: { in: items, mode: 'insensitive' } },
        select: { id: true, name: true },
      });
      if (drugs.length >= 2) {
        const results: Array<{
          a: string; b: string; risk: string;
          mechanism: string | null; clinicalEffect: string | null; recommendation: string;
        }> = [];
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
    } catch (err) {
      this.logger.warn(`[interactions] Prisma недоступна. Причина: ${(err as Error).message}`);
    }
    const result = items.flatMap((a: string, i: number) =>
      items.slice(i + 1).map((b: string) => {
        const da = this.localByName(a);
        const db = this.localByName(b);
        const hit =
          (da?.interactions ?? []).find((x: { with: string; risk: string; note: string }) =>
            x.with.toLowerCase() === (db?.name ?? b).toLowerCase(),
          ) ??
          (db?.interactions ?? []).find((x: { with: string; risk: string; note: string }) =>
            x.with.toLowerCase() === (da?.name ?? a).toLowerCase(),
          );
        return {
          a: da?.name ?? a,
          b: db?.name ?? b,
          risk: hit?.risk ?? 'low',
          mechanism: null as string | null,
          clinicalEffect: hit?.note ?? null,
          recommendation: hit?.note ?? 'Значимое взаимодействие не найдено в базе',
        };
      }),
    );

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

  async contra(drug: string, age: number, context: string, userId?: number, ipAddress?: string) {
    const warnings: string[] = [];
    try {
      const dbDrug = await this.prisma.drug.findFirst({
        where: { name: { equals: drug.trim(), mode: 'insensitive' } },
        include: { contraindications: true },
      });
      if (dbDrug) {
        for (const c of dbDrug.contraindications) {
          if (c.minAge !== null && age < c.minAge) warnings.push(`Возраст ниже допустимого (мин. ${c.minAge} лет): ${c.condition}`);
          if (c.maxAge !== null && age > c.maxAge) warnings.push(`Возраст выше допустимого (макс. ${c.maxAge} лет): ${c.condition}`);
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
        if (warnings.length > 0) return { drug: dbDrug.name, warnings, source: 'database' };
      }
    } catch (err) {
      this.logger.warn(`[contra] Prisma недоступна для "${drug}". Причина: ${(err as Error).message}`);
    }
    const local = this.localByName(drug);
    if (!local) return { drug: null, warnings: [] };
    const has = (part: string) => local.contraindications.some((c: string) => c.toLowerCase().includes(part));
    if (age < 18 && has('детск')) warnings.push('Противопоказан в детском возрасте');
    if (context === 'pregnancy' && has('беремен')) warnings.push('Противопоказан при беременности');
    if (context === 'lactation' && has('лактац')) warnings.push('Противопоказан при кормлении грудью');
    if (context === 'renal' && has('почечн')) warnings.push('Противопоказан при почечной недостаточности');
    if (context === 'hepatic' && has('печен')) warnings.push('Противопоказан при печёночной недостаточности');
    if (context === 'pediatric' && has('детск')) warnings.push('Противопоказан в детском возрасте');
    if (!context && warnings.length === 0) local.contraindications.forEach((c: string) => warnings.push(c));

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
      this.logger.warn(`[dashboard] Prisma недоступна. Причина: ${(err as Error).message}`);
      return [0, 0, 0] as [number, number, number];
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
}
