import { api } from '../../config/api';

export type ImportJob = {
  id: number;
  source: string;
  status: string;
  recordsProcessed: number;
  recordsFailed: number;
  startedAt: string;
  completedAt: string | null;
  errorLog: string;
};

function mapJob(raw: any): ImportJob {
  return {
    id: raw.id,
    source: raw.source,
    status: String(raw.status || '').toLowerCase(),
    recordsProcessed: raw.recordsProcessed ?? 0,
    recordsFailed: raw.recordsFailed ?? 0,
    startedAt: raw.startedAt ? new Date(raw.startedAt).toISOString() : '',
    completedAt: raw.completedAt ? new Date(raw.completedAt).toISOString() : null,
    errorLog: raw.errorLog ?? '',
  };
}

const fallback: ImportJob[] = [];

export async function fetchImports(): Promise<ImportJob[]> {
  try {
    const { data } = await api.get('/imports');
    return (data as any[]).map(mapJob);
  } catch {
    return fallback;
  }
}

export async function runImport(source: string) {
  const { data } = await api.post('/imports/run', { source });
  return {
    message: data.message as string,
    job: mapJob(data.job),
  };
}
