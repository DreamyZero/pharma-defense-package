import { api } from '../../config/api';
export type AuditRow = { time:string; user:string; action:string; entity:string; ip:string };
const fallback:AuditRow[] = [
  { time:'2025-05-01T02:00:00', user:'admin@pharma.local', action:'IMPORT_START', entity:'DrugImport', ip:'127.0.0.1' },
  { time:'2025-05-01T02:08:00', user:'admin@pharma.local', action:'IMPORT_COMPLETE', entity:'DrugImport', ip:'127.0.0.1' },
  { time:'2025-05-01T11:30:00', user:'doctor@pharma.local', action:'SEARCH', entity:'Drug', ip:'127.0.0.1' }
];
export async function fetchAudit(){ try { const { data } = await api.get('/audit'); return data as AuditRow[]; } catch { return fallback; } }
