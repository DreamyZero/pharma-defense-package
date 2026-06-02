import { api } from '../../config/api';

export type AuditRow = { time: string; user: string; action: string; entity: string; ip: string };

export async function fetchAudit(): Promise<AuditRow[]> {
  const { data } = await api.get('/audit');
  return data as AuditRow[];
}
