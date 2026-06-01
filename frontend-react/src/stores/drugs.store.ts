import { makeAutoObservable, runInAction } from 'mobx';
import { api } from '../shared/api';

export interface DrugResult {
  id: number;
  name: string;
  slug: string;
  atcCode: string;
  manufacturer?: string;
  pharmacologicalGroup?: string;
  dosageForm?: string;
  substances?: Array<{ substance: { name: string; canonicalName?: string } }>;
}

export interface DrugDetail extends DrugResult {
  description?: string;
  dispensingRule?: string;
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

// ── Локальный каталог (fallback когда бэкенд недоступен) ───────────────────────────────────────
interface LocalDrug {
  id: number; name: string; slug: string; substance: string;
  atc: string; group: string;
  indications: string[]; contraindications: string[];
  sideEffects: string[]; analogs: string[]; synonyms: string[];
  interactions: Array<{ with: string; risk: string; note: string }>;
}

const LOCAL_DRUGS: LocalDrug[] = [
  {
    id: 1, name: 'Аспирин', slug: 'аспирин', substance: 'Ацетилсалициловая кислота',
    atc: 'C01EB02', group: 'НПВС',
    indications: ['боль', 'жар', 'тромбоз'],
    contraindications: ['язвенная болезнь', 'детский возраст'],
    sideEffects: ['диспепсия', 'кровотечение'],
    analogs: ['Аспикор', 'Тромбо АСС'],
    synonyms: ['ацетилсалициловая кислота', 'аспикор', 'тромбо асс'],
    interactions: [{ with: 'Варфарин', risk: 'high', note: 'Повышается риск кровотечения — совместное применение требует контроля МНО' }],
  },
  {
    id: 2, name: 'Метформин', slug: 'метформин', substance: 'Метформина гидрохлорид',
    atc: 'A10BA02', group: 'Гипогликемические средства',
    indications: ['диабет 2 типа', 'гипергликемия'],
    contraindications: ['почечная недостаточность', 'лактацидоз'],
    sideEffects: ['тошнота', 'диарея', 'лактацидоз'],
    analogs: ['Глюкофаж', 'Сиофор'],
    synonyms: ['метформина гидрохлорид', 'глюкофаж', 'сиофор'],
    interactions: [{ with: 'Йодсодержащие контрасты', risk: 'high', note: 'Риск лактацидоза — отменить за 48 ч до введения контраста' }],
  },
  {
    id: 3, name: 'Лизиноприл', slug: 'лизиноприл', substance: 'Лизиноприл',
    atc: 'C09AA03', group: 'Ингибиторы АПФ',
    indications: ['артериальная гипертензия', 'сердечная недостаточность'],
    contraindications: ['беременность', 'ангионевротический отёк в анамнезе'],
    sideEffects: ['сухой кашель', 'гипотензия', 'гиперкалиемия'],
    analogs: ['Диротон', 'Лизорил'],
    synonyms: ['диротон', 'лизорил'],
    interactions: [{ with: 'Спиронолактон', risk: 'medium', note: 'Риск гиперкалиемии — контроль уровня калия' }],
  },
  {
    id: 4, name: 'Варфарин', slug: 'варфарин', substance: 'Варфарин',
    atc: 'B01AA03', group: 'Антикоагулянты',
    indications: ['тромбоз', 'фибрилляция предсердий', 'ТЭЛА'],
    contraindications: ['беременность', 'активное кровотечение'],
    sideEffects: ['кровотечение', 'некроз кожи'],
    analogs: ['Варфарекс'],
    synonyms: ['варфарекс'],
    interactions: [{ with: 'Аспирин', risk: 'high', note: 'Повышается риск кровотечения — совместное применение требует контроля МНО' }],
  },
  {
    id: 5, name: 'Ибупрофен', slug: 'ибупрофен', substance: 'Ибупрофен',
    atc: 'M01AE01', group: 'НПВС',
    indications: ['боль', 'воспаление', 'лихорадка'],
    contraindications: ['язвенная болезнь', 'тяжёлая почечная недостаточность'],
    sideEffects: ['гастропатия', 'отёки', 'повышение АД'],
    analogs: ['Нурофен', 'Миг', 'Адвил'],
    synonyms: ['нурофен', 'миг', 'адвил'],
    interactions: [{ with: 'Аспирин', risk: 'medium', note: 'Снижается антиагрегантный эффект аспирина при совместном приёме' }],
  },
];

function localByName(name: string): LocalDrug | undefined {
  const n = name.trim().toLowerCase();
  return LOCAL_DRUGS.find(
    d => d.name.toLowerCase() === n ||
         d.substance.toLowerCase() === n ||
         d.synonyms.some(s => s.toLowerCase() === n),
  );
}

function localBySlug(slug: string): LocalDrug | undefined {
  return LOCAL_DRUGS.find(d => d.slug === slug.toLowerCase());
}

function localToDetail(d: LocalDrug): DrugDetail {
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    atcCode: d.atc,
    manufacturer: '',
    pharmacologicalGroup: d.group,
    dosageForm: 'Таблетки',
    description:
      `${d.group}. Показания: ${d.indications.join(', ')}. ` +
      `Побочные эффекты: ${d.sideEffects.join(', ')}.`,
    substances: [{ substance: { name: d.substance } }],
    contraindications: d.contraindications.map(c => ({ condition: c })),
    analogsFrom: d.analogs.map((name, i) => ({
      targetDrug: { id: -(i + 1), name },
      confidence: 90,
      reason: 'Одно действующее вещество / группа',
    })),
    interactionA: d.interactions.map(ix => ({
      drugB: { name: ix.with },
      severity: ix.risk,
      clinicalEffect: ix.note,
      recommendation: ix.note,
    })),
    interactionB: [],
  };
}

function normalizeConfidence(c: number): number {
  if (c === null || c === undefined) return 0;
  return c <= 1 ? Math.round(c * 100) : Math.round(c);
}

// ── Store ───────────────────────────────────────────────────────────────────────────────────────
class DrugsStore {
  results: DrugResult[] = [];
  selectedDrug: DrugDetail | null = null;
  analogs: any = null;
  interactions: InteractionResult[] = [];
  contraResult: ContraResult | null = null;
  isLoading = false;
  error: string | null = null;
  searchQuery = '';
  interactionList: string[] = [];

  constructor() { makeAutoObservable(this); }

  // ── search ────────────────────────────────────────────────────────────────────────────────
  async searchDrugs(q: string) {
    this.searchQuery = q;
    if (!q || q.length < 2) { runInAction(() => { this.results = []; }); return; }
    this.isLoading = true;
    this.error = null;
    const localFallback = (): DrugResult[] =>
      LOCAL_DRUGS
        .filter(d =>
          d.name.toLowerCase().includes(q.toLowerCase()) ||
          d.substance.toLowerCase().includes(q.toLowerCase()) ||
          d.synonyms.some(s => s.includes(q.toLowerCase())))
        .map(d => ({
          id: d.id, name: d.name, slug: d.slug,
          atcCode: d.atc, manufacturer: '',
          pharmacologicalGroup: d.group,
          dosageForm: 'Таблетки',
          substances: [{ substance: { name: d.substance } }],
        }));
    try {
      const { data } = await api.get('/drugs/search', { params: { q } });
      runInAction(() => {
        this.results = Array.isArray(data) && data.length > 0 ? data : localFallback();
      });
    } catch {
      runInAction(() => { this.results = localFallback(); });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  // ── detail ───────────────────────────────────────────────────────────────────────────────
  async fetchDrugDetail(slug: string) {
    this.isLoading = true;
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
              (loc ? `${loc.group}. Показания: ${loc.indications.join(', ')}. Побочные эффекты: ${loc.sideEffects.join(', ')}.` : undefined),
            dosageForm: data.dosageForm || 'Таблетки',
            contraindications: data.contraindications?.length
              ? data.contraindications
              : (loc?.contraindications.map(c => ({ condition: c })) ?? []),
            analogsFrom: data.analogsFrom?.length
              ? data.analogsFrom
              : (loc?.analogs.map((name, i) => ({ targetDrug: { id: -(i+1), name }, confidence: 90, reason: 'Одно действующее вещество / группа' })) ?? []),
            interactionA: data.interactionA?.length
              ? data.interactionA
              : (loc?.interactions.map(ix => ({ drugB: { name: ix.with }, severity: ix.risk, clinicalEffect: ix.note, recommendation: ix.note })) ?? []),
            interactionB: data.interactionB ?? [],
          };
        });
        return;
      }
    } catch { /* fall through to local */ }
    const loc = localBySlug(slug) || localByName(slug);
    runInAction(() => {
      this.selectedDrug = loc ? localToDetail(loc) : null;
      this.error = loc ? null : 'Препарат не найден';
      this.isLoading = false;
    });
  }

  clearSelectedDrug() { this.selectedDrug = null; }

  // ── analogs ─────────────────────────────────────────────────────────────────────────────
  async fetchAnalogs(name: string) {
    this.isLoading = true;
    this.analogs = null;
    const localFallback = () => {
      const loc = localByName(name);
      return {
        drug: loc?.name ?? name,
        analogs: (loc?.analogs ?? []).map((aName, i) => ({
          id: -(i + 1), name: aName,
          substances: [loc?.substance ?? ''],
          confidence: 90,
          reason: 'Одно действующее вещество / группа',
        })),
      };
    };
    try {
      const { data } = await api.get(`/analogs/${encodeURIComponent(name)}`);
      const analogs = (data.analogs || []).map((a: any) => ({
        ...a,
        confidence: normalizeConfidence(a.confidence),
      }));
      runInAction(() => {
        this.analogs = analogs.length > 0
          ? { drug: data.drug, analogs }
          : localFallback();
      });
    } catch {
      runInAction(() => { this.analogs = localFallback(); });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  // ── interactions ──────────────────────────────────────────────────────────────────────────
  async checkInteractions(items: string[]) {
    this.isLoading = true;
    this.error = null;
    const localFallback = (): InteractionResult[] =>
      items.flatMap((a, i) =>
        items.slice(i + 1).map(b => {
          const da = localByName(a);
          const db = localByName(b);
          const hit =
            da?.interactions.find(x => x.with.toLowerCase() === (db?.name ?? b).toLowerCase()) ??
            db?.interactions.find(x => x.with.toLowerCase() === (da?.name ?? a).toLowerCase());
          return {
            a: da?.name ?? a,
            b: db?.name ?? b,
            risk: (hit?.risk ?? 'low') as 'high' | 'medium' | 'low',
            mechanism: undefined,
            clinicalEffect: hit?.note ?? undefined,
            recommendation: hit?.note ?? 'Значимое взаимодействие не найдено в базе',
          };
        }),
      );
    try {
      const { data } = await api.post('/interactions/check', { items });
      const results: InteractionResult[] = Array.isArray(data) && data.length > 0 ? data : localFallback();
      runInAction(() => { this.interactions = results; });
    } catch {
      runInAction(() => { this.interactions = localFallback(); });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  // ── contra ──────────────────────────────────────────────────────────────────────────────
  async checkContra(drug: string, age: number, context: string) {
    this.isLoading = true;
    try {
      const { data } = await api.post('/contra/check', { drug, age, context });
      runInAction(() => { this.contraResult = data; });
    } catch {
      const loc = localByName(drug);
      const warnings: string[] = [];
      if (loc) {
        if (age < 18 && loc.contraindications.includes('детский возраст')) warnings.push('Противопоказан в детском возрасте');
        if (context === 'pregnancy' && loc.contraindications.includes('беременность')) warnings.push('Противопоказан при беременности');
        loc.contraindications.forEach(c => { if (!warnings.some(w => w.includes(c))) warnings.push(c); });
      }
      runInAction(() => {
        this.contraResult = { drug: loc?.name ?? drug, warnings: warnings.length ? warnings : ['Данные о противопоказаниях недоступны'] };
      });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  setInteractionList(list: string[]) { this.interactionList = list; }
}

export const drugsStore = new DrugsStore();
