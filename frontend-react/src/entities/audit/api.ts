import { api } from '../../config/api';

export type AuditRow = { time: string; user: string; action: string; entity: string; ip: string };

function mapRow(raw: Record<string, unknown>): AuditRow {
  const timeRaw = raw.time ?? raw.createdAt;
  const time =
    typeof timeRaw === 'string' && timeRaw
      ? new Date(timeRaw).toLocaleString('ru-RU')
      : '—';

  const userObj = raw.user as { email?: string; fullName?: string } | null | undefined;
  const user =
    typeof raw.user === 'string'
      ? raw.user
      : userObj?.email ?? userObj?.fullName ?? '—';

  const entity =
    typeof raw.entity === 'string'
      ? raw.entity
      : [raw.entityType, raw.entityId].filter(Boolean).join(':') || '—';

  return {
    time,
    user,
    action: String(raw.action ?? '—'),
    entity,
    ip: String(raw.ip ?? raw.ipAddress ?? '—'),
  };
}

export async function fetchAudit(): Promise<AuditRow[]> {
  const { data } = await api.get('/audit');
  if (!Array.isArray(data)) return [];
  return data.map(row => mapRow(row as Record<string, unknown>));
}

export async function clearAudit(): Promise<{ deleted: number }> {
  const { data } = await api.delete('/audit');
  return { deleted: Number(data?.deleted ?? 0) };
}
