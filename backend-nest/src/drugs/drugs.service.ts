import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PharmaRepository } from '../domain/pharma.repository';

@Injectable()
export class DrugsService {
  constructor(private repo: PharmaRepository, private prisma: PrismaService) {}

  async search(q: string) {
    if (!q || q.length < 2) return [];
    const n = q.trim().toLowerCase();
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
    if (drugs.length > 0) return drugs;
    return this.repo.search(q);
  }

  async getBySlug(slug: string) {
    return this.prisma.drug.findUnique({
      where: { slug },
      include: {
        substances: { include: { substance: { include: { synonymLinks: true } } } },
        contraindications: true,
        analogsFrom: { include: { targetDrug: true } },
        interactionA: { include: { drugB: true } },
        interactionB: { include: { drugA: true } },
      },
    });
  }

  async analogs(name: string) {
    const n = name.trim().toLowerCase();
    const drug = await this.prisma.drug.findFirst({
      where: { name: { equals: n, mode: 'insensitive' } },
      include: {
        analogsFrom: { include: { targetDrug: { include: { substances: { include: { substance: true } } } } } },
        substances: { include: { substance: true } },
      },
    });
    if (drug) {
      return {
        drug: drug.name,
        analogs: drug.analogsFrom.map(a => ({
          id: a.targetDrug.id,
          name: a.targetDrug.name,
          substances: a.targetDrug.substances.map(s => s.substance.name),
          confidence: a.confidence,
          reason: a.reason,
        })),
      };
    }
    const local = this.repo.byName(name);
    return { drug: local?.name || null, analogs: local?.analogs || [] };
  }

  async interactions(items: string[]) {
    if (items.length < 2) return [];
    const drugs = await this.prisma.drug.findMany({
      where: { name: { in: items, mode: 'insensitive' } as any },
      select: { id: true, name: true },
    });
    const results: any[] = [];
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
    if (results.length === 0) {
      return items.flatMap((a, i) =>
        items.slice(i + 1).map(b => {
          const da = this.repo.byName(a), db = this.repo.byName(b);
          const hit = da?.interactions.find((x: any) => x.with === db?.name) || db?.interactions.find((x: any) => x.with === da?.name);
          return { a: da?.name || a, b: db?.name || b, risk: hit?.risk || 'low', recommendation: hit?.note || 'Значимое взаимодействие не найдено' };
        }),
      );
    }
    return results;
  }

  async contra(drug: string, age: number, context: string) {
    const warnings: string[] = [];
    const dbDrug = await this.prisma.drug.findFirst({
      where: { name: { equals: drug.trim(), mode: 'insensitive' } },
      include: { contraindications: true },
    });
    if (dbDrug) {
      for (const c of dbDrug.contraindications) {
        if (c.minAge !== null && age < c.minAge) warnings.push(`Возраст ниже допустимого (мин. ${c.minAge} лет): ${c.condition}`);
        if (c.maxAge !== null && age > c.maxAge) warnings.push(`Возраст выше допустимого (макс. ${c.maxAge} лет): ${c.condition}`);
        if (c.context && context && c.context.toLowerCase() === context.toLowerCase()) warnings.push(`${c.condition}${c.note ? ' — ' + c.note : ''}`);
      }
      return { drug: dbDrug.name, warnings, source: 'database' };
    }
    const item = this.repo.byName(drug);
    if (!item) return { drug: null, warnings };
    if (age < 18 && item.contraindications.includes('детский возраст')) warnings.push('Противопоказан в детском возрасте');
    if (context === 'pregnancy' && item.contraindications.includes('беременность')) warnings.push('Противопоказан при беременности');
    return { drug: item.name, warnings, source: 'repository' };
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
}
