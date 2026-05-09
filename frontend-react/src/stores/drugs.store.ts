import { makeAutoObservable, runInAction } from 'mobx';
import { api } from '../shared/api';

export interface DrugResult {
  id: number;
  name: string;
  slug: string;
  atcCode: string;
  manufacturer?: string;
  pharmacologicalGroup?: string;
  substances?: Array<{ substance: { name: string; canonicalName?: string } }>;
}

export interface DrugDetail extends DrugResult {
  description?: string;
  dosageForm?: string;
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

const FALLBACK_DRUGS: DrugResult[] = [
  { id: 1, name: 'Аспирин', slug: 'aspirin', atcCode: 'N02BA01', manufacturer: 'Bayer', pharmacologicalGroup: 'НПВП', substances: [{ substance: { name: 'Ацетилсалициловая кислота', canonicalName: 'Acetylsalicylic acid' } }] },
  { id: 2, name: 'Метформин', slug: 'metformin', atcCode: 'A10BA02', manufacturer: 'Teva', pharmacologicalGroup: 'Бигуаниды', substances: [{ substance: { name: 'Метформина гидрохлорид', canonicalName: 'Metformin' } }] },
  { id: 3, name: 'Лизиноприл', slug: 'lisinopril', atcCode: 'C09AA03', manufacturer: 'Stada', pharmacologicalGroup: 'Ингибиторы АПФ', substances: [{ substance: { name: 'Лизиноприл', canonicalName: 'Lisinopril' } }] },
  { id: 4, name: 'Амлодипин', slug: 'amlodipine', atcCode: 'C08CA01', manufacturer: 'Pfizer', pharmacologicalGroup: 'БКК', substances: [{ substance: { name: 'Амлодипина безилат', canonicalName: 'Amlodipine' } }] },
  { id: 5, name: 'Омепразол', slug: 'omeprazole', atcCode: 'A02BC01', manufacturer: 'AstraZeneca', pharmacologicalGroup: 'ИПП', substances: [{ substance: { name: 'Омепразол', canonicalName: 'Omeprazole' } }] },
];

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

  constructor() {
    makeAutoObservable(this);
  }

  async searchDrugs(q: string) {
    this.searchQuery = q;
    if (!q || q.length < 2) { runInAction(() => { this.results = []; }); return; }
    this.isLoading = true;
    this.error = null;
    try {
      const { data } = await api.get('/drugs/search', { params: { q } });
      runInAction(() => { this.results = Array.isArray(data) && data.length > 0 ? data : FALLBACK_DRUGS.filter(d => d.name.toLowerCase().includes(q.toLowerCase())); });
    } catch {
      runInAction(() => { this.results = FALLBACK_DRUGS.filter(d => d.name.toLowerCase().includes(q.toLowerCase())); });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async fetchDrugDetail(slug: string) {
    this.isLoading = true;
    this.selectedDrug = null;
    this.error = null;
    try {
      const { data } = await api.get(`/drugs/${slug}`);
      runInAction(() => { this.selectedDrug = data; });
    } catch {
      const fallback = FALLBACK_DRUGS.find(d => d.slug === slug);
      runInAction(() => { this.selectedDrug = fallback || null; this.error = !fallback ? 'Препарат не найден' : null; });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  clearSelectedDrug() {
    this.selectedDrug = null;
  }

  async fetchAnalogs(name: string) {
    this.isLoading = true;
    try {
      const { data } = await api.get(`/analogs/${encodeURIComponent(name)}`);
      runInAction(() => { this.analogs = data; });
    } catch {
      runInAction(() => { this.analogs = { drug: name, analogs: [{ id: 2, name: 'Метформин', substances: ['Метформина гидрохлорид'], confidence: 1.0, reason: 'Одно действующее вещество' }] }; });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async checkInteractions(items: string[]) {
    this.isLoading = true;
    this.error = null;
    try {
      const { data } = await api.post('/interactions/check', { items });
      runInAction(() => { this.interactions = data; });
    } catch {
      runInAction(() => {
        this.interactions = items.length >= 2
          ? [{ a: items[0], b: items[1], risk: 'low', recommendation: 'Данные о взаимодействии недоступны (демо-режим)' }]
          : [];
      });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async checkContra(drug: string, age: number, context: string) {
    this.isLoading = true;
    try {
      const { data } = await api.post('/contra/check', { drug, age, context });
      runInAction(() => { this.contraResult = data; });
    } catch {
      runInAction(() => { this.contraResult = { drug, warnings: ['Данные о противопоказаниях недоступны (демо-режим)'] }; });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  setInteractionList(list: string[]) {
    this.interactionList = list;
  }
}

export const drugsStore = new DrugsStore();
