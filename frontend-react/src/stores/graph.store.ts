import { makeAutoObservable, runInAction } from 'mobx';
import { api } from '../shared/api';

export interface GraphNode {
  id: string;
  label: string;
  type: 'Drug' | 'Substance' | 'Group' | 'Indication' | 'Contraindication' | 'Synonym';
  atcCode?: string;
  highlight?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  severity?: string;
}

const EMPTY_GRAPH = { nodes: [], edges: [] };

const EMPTY_MESSAGE = 'Граф пуст. Выполните seed PostgreSQL и синхронизацию Neo4j (кнопка «Синхронизировать»).';
const ERROR_MESSAGE = 'Neo4j недоступен. Проверьте docker compose и подключение к bolt://localhost:7687.';

class GraphStore {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  isLoading = false;
  isSyncing = false;
  error: string | null = null;
  mode: 'full' | 'drug' | 'interaction' = 'full';

  constructor() {
    makeAutoObservable(this);
  }

  private applyGraph(data: { nodes?: GraphNode[]; edges?: GraphEdge[] }, emptyHint?: string) {
    const nodes = data.nodes ?? [];
    const edges = data.edges ?? [];
    this.nodes = nodes;
    this.edges = edges;
    if (nodes.length === 0) {
      this.error = emptyHint ?? EMPTY_MESSAGE;
    }
  }

  async loadFullGraph(limit = 30) {
    this.isLoading = true;
    this.error = null;
    this.mode = 'full';
    try {
      const { data } = await api.get('/graph/full', { params: { limit } });
      runInAction(() => this.applyGraph(data));
    } catch {
      runInAction(() => {
        this.nodes = EMPTY_GRAPH.nodes;
        this.edges = EMPTY_GRAPH.edges;
        this.error = ERROR_MESSAGE;
      });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async loadDrugGraph(idOrName: string) {
    const term = idOrName.trim();
    if (!term) return;

    this.isLoading = true;
    this.error = null;
    this.mode = 'drug';
    try {
      const { data } = await api.get(`/graph/drug/${encodeURIComponent(term)}`);
      runInAction(() => {
        this.applyGraph(data, 'Препарат не найден в PostgreSQL или граф пуст — выполните синхронизацию Neo4j.');
      });
    } catch {
      runInAction(() => {
        this.nodes = EMPTY_GRAPH.nodes;
        this.edges = EMPTY_GRAPH.edges;
        this.error = ERROR_MESSAGE;
      });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async loadInteractionGraph(drugs: string[]) {
    this.isLoading = true;
    this.error = null;
    this.mode = 'interaction';
    try {
      const { data } = await api.post('/graph/interactions', { drugs });
      runInAction(() => {
        this.applyGraph(data, 'Препараты не найдены или взаимодействий нет в графе.');
      });
    } catch {
      runInAction(() => {
        this.nodes = EMPTY_GRAPH.nodes;
        this.edges = EMPTY_GRAPH.edges;
        this.error = ERROR_MESSAGE;
      });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async syncFromPostgres() {
    this.isSyncing = true;
    this.error = null;
    try {
      await api.post('/graph/sync');
      await this.loadFullGraph(30);
    } catch {
      runInAction(() => {
        this.error = 'Синхронизация не выполнена. Нужны права ADMIN и доступный Neo4j.';
      });
    } finally {
      runInAction(() => { this.isSyncing = false; });
    }
  }
}

export const graphStore = new GraphStore();
