import { makeAutoObservable, runInAction } from 'mobx';
import { api } from '../shared/api';
import { BUNDLED_CATALOG, EXPECTED_CATALOG_SIZE } from '../data/catalog-samples';
import {
  filterCompleteCatalog,
  mergeCatalog,
  normalizeDrugFromApi,
} from '../shared/catalog-utils';

export interface InstructionMeta {
  dosageAdult?: string;
  dosageChildren?: string;
  storageConditions?: string;
  shelfLife?: string;
  dispensingRule?: string;
  sideEffects?: string[];
  indicationsList?: string[];
  contraindicationsList?: string[];
}

export interface DrugResult {
  id: number;
  name: string;
  slug: string;
  atcCode: string;
  manufacturer?: string;
  pharmacologicalGroup?: string;
  dosageForm?: string;
  description?: string;
  registrationNumber?: string;
  instructionMeta?: InstructionMeta | null;
  substances?: Array<{ substance: { name: string; canonicalName?: string } }>;
  indications?: Array<{ id?: number; name: string }>;
}

export interface DrugDetail extends DrugResult {
  description?: string;
  dispensingRule?: string;
  rxRequired?: boolean;
  contraindications?: Array<{ condition: string; note?: string }>;
  analogsFrom?: Array<{ targetDrug: { name: string; id: number }; confidence: number; reason?: string }>;
  interactionA?: Array<{ drugB: { name: string }; severity: string; clinicalEffect?: string; recommendation?: string }>;
  interactionB?: Array<{ drugA: { name: string }; severity: string; clinicalEffect?: string; recommendation?: string }>;
}

export interface InteractionResult {
  a: string;
  b: string;
  risk: 'high' | 'medium' | 'low';
  mechanism?: string;
  clinicalEffect?: string;
  recommendation: string;
}

export interface ContraResult {
  drug: string | null;
  warnings: string[];
  source?: string;
}

interface LocalDrug {
  id: number; name: string; slug: string; substance: string;
  atc: string; group: string;
  indications: string[]; contraindications: string[];
  sideEffects: string[]; analogs: string[]; synonyms: string[];
  interactions: Array<{ with: string; risk: string; note: string }>;
}

const LOCAL_DRUGS: LocalDrug[] = [
  { id: 1, name: 'Аспирин', slug: 'аспирин', substance: 'Ацетилсалициловая кислота', atc: 'C01EB02', group: 'НПВС', indications: ['боль', 'жар'], contraindications: ['язвенная болезнь', 'детский возраст'], sideEffects: ['диспепсия'], analogs: ['Аспикор'], synonyms: ['аспикор'], interactions: [{ with: 'Варфарин', risk: 'high', note: 'Риск кровотечения' }] },
  { id: 2, name: 'Метформин', slug: 'метформин', substance: 'Метформина гидрохлорид', atc: 'A10BA02', group: 'Гипогликемические', indications: ['диабет'], contraindications: ['почечная недостаточность'], sideEffects: ['тошнота'], analogs: ['Глюкофаж'], synonyms: ['глюкофаж'], interactions: [] },
  { id: 3, name: 'Лизиноприл', slug: 'лизиноприл', substance: 'Лизиноприл', atc: 'C09AA03', group: 'Ингибиторы АПФ', indications: ['гипертензия'], contraindications: ['беременность'], sideEffects: ['кашель'], analogs: ['Диротон'], synonyms: ['диротон'], interactions: [] },
  { id: 4, name: 'Варфарин', slug: 'варфарин', substance: 'Варфарин', atc: 'B01AA03', group: 'Антикоагулянты', indications: ['тромбоз'], contraindications: ['беременность'], sideEffects: ['кровотечение'], analogs: [], synonyms: [], interactions: [{ with: 'Аспирин', risk: 'high', note: 'Риск кровотечения' }] },
  { id: 5, name: 'Ибупрофен', slug: 'ибупрофен', substance: 'Ибупрофен', atc: 'M01AE01', group: 'НПВС', indications: ['боль'], contraindications: ['язвенная болезнь'], sideEffects: ['гастропатия'], analogs: ['Нурофен'], synonyms: ['нурофен'], interactions: [] },
];

function localToResult(d: LocalDrug): DrugResult {
  return {
    id: d.id, name: d.name, slug: d.slug, atcCode: d.atc,
    pharmacologicalGroup: d.group, dosageForm: 'Таблетки',
    substances: [{ substance: { name: d.substance } }],
  };
}

function localByName(name: string): LocalDrug | undefined {
  const n = name.trim().toLowerCase();
  return LOCAL_DRUGS.find(
    d => d.name.toLowerCase() === n || d.substance.toLowerCase() === n ||
      d.synonyms.some(s => s.toLowerCase() === n),
  );
}

function localBySlug(slug: string): LocalDrug | undefined {
  return LOCAL_DRUGS.find(d => d.slug === slug.toLowerCase());
}

function localToDetail(d: LocalDrug): DrugDetail {
  return {
    ...localToResult(d),
    description: `${d.group}. Показания: ${d.indications.join(', ')}.`,
    contraindications: d.contraindications.map(c => ({ condition: c })),
    analogsFrom: d.analogs.map((name, i) => ({
      targetDrug: { id: -(i + 1), name }, confidence: 90, reason: 'То же МНН / группа',
    })),
    interactionA: d.interactions.map(ix => ({
      drugB: { name: ix.with }, severity: ix.risk, clinicalEffect: ix.note, recommendation: ix.note,
    })),
    interactionB: [],
  };
}

function normalizeConfidence(c: number): number {
  if (c == null) return 0;
  return c <= 1 ? Math.round(c * 100) : Math.round(c);
}

const CATALOG_CACHE_KEY = 'pharma_catalog_cache_v1';

function readCatalogCache(): DrugResult[] | null {
  try {
    const raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DrugResult[];
    const complete = filterCompleteCatalog(parsed);
    if (complete.length >= EXPECTED_CATALOG_SIZE - 2) return complete;
    return null;
  } catch {
    return null;
  }
}

function writeCatalogCache(catalog: DrugResult[]) {
  if (filterCompleteCatalog(catalog).length < EXPECTED_CATALOG_SIZE - 2) return;
  try {
    sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(catalog));
  } catch {
    /* ignore quota */
  }
}

function matchesQuery(drug: DrugResult, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  if (drug.name.toLowerCase().includes(n)) return true;
  if (drug.atcCode?.toLowerCase().includes(n)) return true;
  if (drug.pharmacologicalGroup?.toLowerCase().includes(n)) return true;
  if (drug.substances?.some(s => s.substance.name.toLowerCase().includes(n))) return true;
  if (drug.indications?.some(i => i.name.toLowerCase().includes(n))) return true;
  return false;
}

class DrugsStore {
  catalog: DrugResult[] = [];
  catalogLoaded = false;
  searchQuery = '';
  selectedSlug: string | null = null;
  selectedDrug: DrugDetail | null = null;
  analogs: { drug: string; analogs: Array<{ id: number; name: string; substances?: string[]; confidence?: number; reason?: string }> } | null = null;
  interactions: InteractionResult[] = [];
  contraResult: ContraResult | null = null;
  catalogLoading = false;
  detailLoading = false;
  actionLoading = false;
  error: string | null = null;
  interactionList: string[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  get isLoading() {
    return this.catalogLoading || this.detailLoading || this.actionLoading;
  }

  get visibleDrugs(): DrugResult[] {
    const q = this.searchQuery.trim();
    if (!q) return this.catalog;
    return this.catalog.filter(d => matchesQuery(d, q));
  }

  resetCatalog() {
    this.catalog = [];
    this.catalogLoaded = false;
    this.catalogLoading = false;
    try {
      sessionStorage.removeItem(CATALOG_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }

  hydrateCatalogFromCache() {
    const cached = readCatalogCache();
    if (!cached?.length) return false;
    this.catalog = cached;
    this.catalogLoaded = true;
    return true;
  }

  async loadCatalog(force = false) {
    const hasFullCatalog =
      this.catalogLoaded &&
      filterCompleteCatalog(this.catalog).length >= EXPECTED_CATALOG_SIZE - 2;
    if (!force && hasFullCatalog) {
      return;
    }

    if (!this.catalog.length || force) {
      if (!this.hydrateCatalogFromCache()) {
        runInAction(() => {
          this.catalog = BUNDLED_CATALOG;
        });
      }
    }

    if (!force && filterCompleteCatalog(this.catalog).length >= EXPECTED_CATALOG_SIZE - 2) {
      this.catalogLoaded = true;
      return;
    }

    this.catalogLoading = true;
    this.error = null;

    try {
      const { data } = await api.get('/drugs/catalog');
      runInAction(() => {
        const raw = (Array.isArray(data) ? data : []).map((d: Record<string, unknown>) =>
          normalizeDrugFromApi(d),
        );
        this.catalog = mergeCatalog(raw, BUNDLED_CATALOG);
        this.catalogLoaded = true;
        writeCatalogCache(this.catalog);
      });
    } catch {
      runInAction(() => {
        this.catalog = BUNDLED_CATALOG;
        this.catalogLoaded = true;
        this.error = 'Не удалось связаться с API — показан локальный каталог (40 препаратов)';
      });
    } finally {
      runInAction(() => { this.catalogLoading = false; });
    }
  }

  setSearchQuery(q: string) {
    this.searchQuery = q;
  }

  /** Сброс поиска и полный каталог (кнопка «Показать все препараты»). */
  showAllDrugs() {
    this.searchQuery = '';
    const complete = filterCompleteCatalog(this.catalog).length;
    if (complete >= EXPECTED_CATALOG_SIZE - 2) {
      return;
    }
    try {
      sessionStorage.removeItem(CATALOG_CACHE_KEY);
    } catch {
      /* ignore */
    }
    this.catalog = [];
    this.catalogLoaded = false;
    void this.loadCatalog(true);
  }

  async refreshCatalogFromApi() {
    const q = this.searchQuery.trim();
    if (q.length < 2) return;
    this.catalogLoading = true;
    try {
      const { data } = await api.get('/drugs/search', { params: { q } });
      if (Array.isArray(data) && data.length > 0) {
        runInAction(() => {
          const ids = new Set(this.catalog.map(c => c.id));
          for (const d of filterCompleteCatalog(data)) {
            if (!ids.has(d.id)) {
              this.catalog.push(d);
              ids.add(d.id);
            }
          }
        });
      }
    } catch { /* keep local filter */ }
    finally {
      runInAction(() => { this.catalogLoading = false; });
    }
  }

  selectDrug(slug: string) {
    this.selectedSlug = slug;
    this.fetchDrugDetail(slug);
  }

  async fetchDrugDetail(slug: string) {
    this.detailLoading = true;
    this.selectedDrug = null;
    this.error = null;
    try {
      const { data } = await api.get(`/drugs/${slug}`);
      if (data) {
        const loc = localByName(data.name) || localBySlug(slug);
        runInAction(() => {
          this.selectedDrug = {
            ...data,
            description: data.description ||
              (loc ? `${loc.group}. Показания: ${loc.indications.join(', ')}.` : undefined),
            dosageForm: data.dosageForm || 'Таблетки',
            contraindications: data.contraindications?.length
              ? data.contraindications
              : (loc?.contraindications.map(c => ({ condition: c })) ?? []),
            analogsFrom: data.analogsFrom?.length
              ? data.analogsFrom
              : (loc?.analogs.map((name, i) => ({
                targetDrug: { id: -(i + 1), name }, confidence: 90, reason: 'То же МНН',
              })) ?? []),
            interactionA: data.interactionA?.length
              ? data.interactionA
              : (loc?.interactions.map(ix => ({
                drugB: { name: ix.with }, severity: ix.risk, clinicalEffect: ix.note, recommendation: ix.note,
              })) ?? []),
            interactionB: data.interactionB ?? [],
          };
          this.detailLoading = false;
        });
        return;
      }
    } catch { /* local */ }
    const loc = localBySlug(slug) || localByName(slug);
    runInAction(() => {
      this.selectedDrug = loc ? localToDetail(loc) : null;
      this.error = loc ? null : 'Препарат не найден';
      this.detailLoading = false;
    });
  }

  clearSelectedDrug() {
    this.selectedDrug = null;
    this.selectedSlug = null;
  }

  async fetchAnalogs(name: string) {
    this.actionLoading = true;
    const localFallback = () => {
      const loc = localByName(name);
      return {
        drug: loc?.name ?? name,
        analogs: (loc?.analogs ?? []).map((aName, i) => ({
          id: -(i + 1), name: aName, substances: [loc?.substance ?? ''], confidence: 90,
          reason: 'То же МНН / группа',
        })),
      };
    };
    try {
      const { data } = await api.get(`/analogs/${encodeURIComponent(name)}`);
      const analogs = (data.analogs || []).map((a: { confidence: number }) => ({
        ...a,
        confidence: normalizeConfidence(a.confidence),
      }));
      runInAction(() => {
        this.analogs = analogs.length > 0 ? { drug: data.drug, analogs } : localFallback();
      });
      runInAction(() => { this.actionLoading = false; });
      return this.analogs;
    } catch {
      const fb = localFallback();
      runInAction(() => { this.analogs = fb; this.actionLoading = false; });
      return fb;
    }
  }

  async checkInteractions(items: string[]) {
    this.actionLoading = true;
    const localFallback = (): InteractionResult[] =>
      items.flatMap((a, i) =>
        items.slice(i + 1).map(b => {
          const da = localByName(a);
          const db = localByName(b);
          const hit =
            da?.interactions.find(x => x.with.toLowerCase() === (db?.name ?? b).toLowerCase()) ??
            db?.interactions.find(x => x.with.toLowerCase() === (da?.name ?? a).toLowerCase());
          return {
            a: da?.name ?? a, b: db?.name ?? b,
            risk: (hit?.risk ?? 'low') as 'high' | 'medium' | 'low',
            clinicalEffect: hit?.note,
            recommendation: hit?.note ?? 'Значимое взаимодействие не найдено',
          };
        }),
      );
    try {
      const { data } = await api.post('/interactions/check', { items });
      runInAction(() => {
        this.interactions = Array.isArray(data) && data.length > 0 ? data : localFallback();
      });
    } catch {
      runInAction(() => { this.interactions = localFallback(); });
    } finally {
      runInAction(() => { this.actionLoading = false; });
    }
  }

  async checkContra(drug: string, age: number, context: string) {
    this.actionLoading = true;
    try {
      const { data } = await api.post('/contra/check', { drug, age, context });
      runInAction(() => { this.contraResult = data; });
    } catch {
      const loc = localByName(drug);
      const warnings: string[] = [];
      if (loc) loc.contraindications.forEach(c => warnings.push(c));
      runInAction(() => {
        this.contraResult = { drug: loc?.name ?? drug, warnings };
      });
    } finally {
      runInAction(() => { this.actionLoading = false; });
    }
  }

  setInteractionList(list: string[]) { this.interactionList = list; }
}

export const drugsStore = new DrugsStore();
