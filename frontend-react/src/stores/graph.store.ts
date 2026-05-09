import { makeAutoObservable, runInAction } from 'mobx';
import { api } from '../shared/api';

export interface GraphNode {
  id: string;
  label: string;
  type: 'Drug' | 'Substance' | 'Group' | 'Indication' | 'Contraindication';
  atcCode?: string;
  highlight?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  severity?: string;
}

const FALLBACK_GRAPH = {
  nodes: [
    { id: 'drug001', label: 'Аспирин', type: 'Drug' as const, atcCode: 'N02BA01' },
    { id: 'drug002', label: 'Метформин', type: 'Drug' as const, atcCode: 'A10BA02' },
    { id: 'drug003', label: 'Лизиноприл', type: 'Drug' as const, atcCode: 'C09AA03' },
    { id: 'drug004', label: 'Амлодипин', type: 'Drug' as const, atcCode: 'C08CA01' },
    { id: 'sub001', label: 'Ацетилсалициловая к-та', type: 'Substance' as const },
    { id: 'sub002', label: 'Метформина гидрохлорид', type: 'Substance' as const },
    { id: 'sub003', label: 'Лизиноприл', type: 'Substance' as const },
    { id: 'grp001', label: 'НПВП', type: 'Group' as const },
    { id: 'grp002', label: 'Бигуаниды', type: 'Group' as const },
    { id: 'grp003', label: 'Ингибиторы АПФ', type: 'Group' as const },
  ],
  edges: [
    { source: 'drug001', target: 'sub001', type: 'CONTAINS' },
    { source: 'drug002', target: 'sub002', type: 'CONTAINS' },
    { source: 'drug003', target: 'sub003', type: 'CONTAINS' },
    { source: 'drug001', target: 'grp001', type: 'BELONGS_TO' },
    { source: 'drug002', target: 'grp002', type: 'BELONGS_TO' },
    { source: 'drug003', target: 'grp003', type: 'BELONGS_TO' },
    { source: 'drug001', target: 'drug002', type: 'INTERACTS_WITH', severity: 'LOW' },
    { source: 'drug003', target: 'drug004', type: 'INTERACTS_WITH', severity: 'MEDIUM' },
  ],
};

class GraphStore {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  isLoading = false;
  error: string | null = null;
  mode: 'full' | 'drug' | 'interaction' = 'full';

  constructor() {
    makeAutoObservable(this);
  }

  async loadFullGraph(limit = 60) {
    this.isLoading = true;
    this.error = null;
    this.mode = 'full';
    try {
      const { data } = await api.get('/graph/full', { params: { limit } });
      runInAction(() => {
        this.nodes = data.nodes?.length > 0 ? data.nodes : FALLBACK_GRAPH.nodes;
        this.edges = data.edges?.length > 0 ? data.edges : FALLBACK_GRAPH.edges;
      });
    } catch {
      runInAction(() => {
        this.nodes = FALLBACK_GRAPH.nodes;
        this.edges = FALLBACK_GRAPH.edges;
        this.error = 'Neo4j недоступен — отображаются демо-данные';
      });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async loadDrugGraph(drugId: string) {
    this.isLoading = true;
    this.error = null;
    this.mode = 'drug';
    try {
      const { data } = await api.get(`/graph/drug/${drugId}`);
      runInAction(() => {
        this.nodes = data.nodes?.length > 0 ? data.nodes : FALLBACK_GRAPH.nodes.slice(0, 4);
        this.edges = data.edges?.length > 0 ? data.edges : FALLBACK_GRAPH.edges.slice(0, 3);
      });
    } catch {
      runInAction(() => {
        this.nodes = FALLBACK_GRAPH.nodes.slice(0, 4);
        this.edges = FALLBACK_GRAPH.edges.slice(0, 3);
        this.error = 'Neo4j недоступен — отображаются демо-данные';
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
        this.nodes = data.nodes?.length > 0 ? data.nodes : FALLBACK_GRAPH.nodes;
        this.edges = data.edges?.length > 0 ? data.edges : FALLBACK_GRAPH.edges;
      });
    } catch {
      runInAction(() => {
        this.nodes = FALLBACK_GRAPH.nodes;
        this.edges = FALLBACK_GRAPH.edges;
        this.error = 'Neo4j недоступен — отображаются демо-данные';
      });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }
}

export const graphStore = new GraphStore();
