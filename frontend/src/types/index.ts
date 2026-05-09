export type PageKey = 'dashboard' | 'search' | 'interactions' | 'analogs' | 'contra' | 'graph' | 'profile' | 'admin' | 'api';
export type RiskLevel = 'high' | 'medium' | 'low';
export interface Drug { id:number; name:string; substance:string; atc:string; indications:string[]; group:string; forms:string[]; contraindications:string[]; sideEffects:string[]; interactions:{with:string;risk:RiskLevel;note:string}[]; analogs:string[]; }
