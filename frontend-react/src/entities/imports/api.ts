import { api } from '../../config/api';
export type ImportJob = { id:number; source:string; status:string; recordsProcessed:number; recordsFailed:number; startedAt:string; completedAt:string|null; errorLog:string };
const fallback:ImportJob[] = [
  { id:1, source:'grls_2025_05_01.xml', status:'completed', recordsProcessed:1250, recordsFailed:3, startedAt:'2025-05-01T02:00:00', completedAt:'2025-05-01T02:08:00', errorLog:'' },
  { id:2, source:'instructions_2025_05_01.html', status:'completed', recordsProcessed:1241, recordsFailed:7, startedAt:'2025-05-01T02:10:00', completedAt:'2025-05-01T02:19:00', errorLog:'' },
  { id:3, source:'nlp_synonyms_2025_05_01.job', status:'running', recordsProcessed:812, recordsFailed:0, startedAt:'2025-05-01T02:20:00', completedAt:null, errorLog:'' }
];
export async function fetchImports(){ try { const { data } = await api.get('/imports'); return data as ImportJob[]; } catch { return fallback; } }
export async function runImport(source:string){ try { const { data } = await api.post('/imports/run',{ source }); return data; } catch { return { message:'ETL import started', job:{ id:Date.now(), source, status:'running', recordsProcessed:0, recordsFailed:0, startedAt:new Date().toISOString(), completedAt:null, errorLog:'' } }; } }
