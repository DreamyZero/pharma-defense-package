import type { DrugResult, InstructionMeta } from '../stores/drugs.store';

export function normalizeDrugFromApi(raw: Record<string, unknown>): DrugResult {
  let meta = raw.instructionMeta;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = null;
    }
  }

  const indications = Array.isArray(raw.indications)
    ? (raw.indications as Array<{ id?: number; name: string }>)
    : [];

  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    atcCode: String(raw.atcCode ?? ''),
    manufacturer: raw.manufacturer as string | undefined,
    pharmacologicalGroup: raw.pharmacologicalGroup as string | undefined,
    dosageForm: raw.dosageForm as string | undefined,
    description: raw.description as string | undefined,
    registrationNumber: raw.registrationNumber as string | undefined,
    instructionMeta: (meta as InstructionMeta | null) ?? null,
    substances: Array.isArray(raw.substances)
      ? (raw.substances as DrugResult['substances'])
      : [],
    indications,
  };
}

/** Полная карточка каталога (без заглушек и пустых полей). */
export function isCompleteCatalogDrug(drug: DrugResult): boolean {
  if (!drug.registrationNumber?.trim()) return false;
  if (!drug.manufacturer?.trim()) return false;
  if (!drug.atcCode?.trim()) return false;
  if (!drug.pharmacologicalGroup?.trim()) return false;
  if (!drug.description?.trim() || drug.description.length < 30) return false;

  const meta = (drug.instructionMeta || {}) as InstructionMeta;
  const dosage = (meta.dosageAdult || '').trim();
  if (!dosage || dosage === 'По инструкции') return false;

  const hasIndications =
    (meta.indicationsList?.length ?? 0) > 0 ||
    (drug.indications?.length ?? 0) > 0;
  if (!hasIndications) return false;

  return true;
}

export function filterCompleteCatalog(drugs: DrugResult[]): DrugResult[] {
  return drugs.filter(isCompleteCatalogDrug);
}

/** API + локальный каталог: приоритет у записей с сервера. */
export function mergeCatalog(apiDrugs: DrugResult[], bundled: DrugResult[]): DrugResult[] {
  const complete = filterCompleteCatalog(apiDrugs);
  if (complete.length >= bundled.length - 2) {
    return complete.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }
  const bySlug = new Map<string, DrugResult>();
  for (const d of bundled) bySlug.set(d.slug, d);
  for (const d of complete) bySlug.set(d.slug, d);
  return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}
