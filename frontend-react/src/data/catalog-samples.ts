/**
 * Полный демо-каталог (40 препаратов) из etl/data/samples/drugs_catalog.json.
 * Используется, если API недоступен или вернул неполные данные.
 */
import catalogRaw from '../../../etl/data/samples/drugs_catalog.json';
import type { DrugResult, InstructionMeta } from '../stores/drugs.store';

type CatalogItem = {
  trade_name: string;
  substance: string;
  atc: string;
  group: string;
  manufacturer?: string;
  form?: string;
  indications?: string;
  contraindications?: string;
  side_effects?: string;
  registration_number?: string;
  dosage_adult?: string;
  dosage_children?: string;
  storage_conditions?: string;
  shelf_life?: string;
  dispensing_rule?: string;
};

function splitSemi(value: string): string[] {
  return value
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
}

function buildFromItem(item: CatalogItem, index: number): DrugResult {
  const name = item.trade_name || '';
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  const indications = splitSemi(item.indications || '');
  const contraindications = splitSemi(item.contraindications || '');
  const sideEffects = splitSemi(item.side_effects || '');

  const instructionMeta: InstructionMeta = {
    dosageAdult: item.dosage_adult,
    dosageChildren: item.dosage_children,
    storageConditions: item.storage_conditions,
    shelfLife: item.shelf_life,
    dispensingRule: item.dispensing_rule,
    sideEffects: sideEffects.length ? sideEffects : undefined,
    indicationsList: indications.length ? indications : undefined,
    contraindicationsList: contraindications.length ? contraindications : undefined,
  };

  const parts: string[] = [];
  if (item.registration_number) parts.push(`Регистрационный номер: ${item.registration_number}`);
  if (item.manufacturer) parts.push(`Производитель: ${item.manufacturer}`);
  if (item.form) parts.push(`Лекарственная форма: ${item.form}`);
  if (indications.length) parts.push(`Показания к применению: ${indications.join('; ')}`);
  if (contraindications.length) parts.push(`Противопоказания: ${contraindications.join('; ')}`);
  if (sideEffects.length) parts.push(`Побочные действия: ${sideEffects.join('; ')}`);
  if (item.dosage_adult) parts.push(`Дозировка (взрослые): ${item.dosage_adult}`);
  if (item.dosage_children) parts.push(`Дозировка (дети): ${item.dosage_children}`);
  if (item.storage_conditions) parts.push(`Условия хранения: ${item.storage_conditions}`);
  if (item.shelf_life) parts.push(`Срок годности: ${item.shelf_life}`);
  if (item.dispensing_rule) {
    parts.push(
      `Условия отпуска: ${item.dispensing_rule === 'prescription' ? 'по рецепту' : 'без рецепта'}`,
    );
  }

  return {
    id: index + 1,
    name,
    slug,
    atcCode: item.atc || '',
    manufacturer: item.manufacturer,
    pharmacologicalGroup: item.group,
    dosageForm: item.form || 'Таблетки',
    registrationNumber: item.registration_number,
    description: parts.join('\n\n'),
    instructionMeta,
    substances: [{ substance: { name: item.substance || '' } }],
    indications: indications.map((n, i) => ({ id: i + 1, name: n })),
  };
}

export const BUNDLED_CATALOG: DrugResult[] = (catalogRaw as CatalogItem[]).map(buildFromItem);

export const EXPECTED_CATALOG_SIZE = BUNDLED_CATALOG.length;
