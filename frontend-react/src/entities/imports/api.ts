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

export type EtlStatus = {
  status: 'ok' | 'failed' | 'never_run';
  started_at?: string;
  finished_at?: string;
  source_file?: string;
  error?: string;
  metrics?: Record<string, number>;
};

export type EtlReportMetric = {
  key: string;
  label: string;
  value: number;
};

export type EtlReport = {
  status: EtlStatus;
  metrics: EtlReportMetric[];
  files: { html: boolean; csv: boolean };
  finishedAt?: string;
  outputDir?: string;
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

export async function fetchImports(): Promise<ImportJob[]> {
  try {
    const { data } = await api.get('/imports');
    return (data as any[]).map(mapJob);
  } catch {
    return [];
  }
}

export async function runImport(source: string) {
  const { data } = await api.post('/imports/run', { source }, { timeout: 300_000 });
  return {
    message: data.message as string,
    job: mapJob(data.job),
    report: data.report as EtlReport | undefined,
    pipeline: data.pipeline as { ok: boolean; stages?: string[] } | undefined,
  };
}

export async function clearImports(): Promise<{ deleted: number; outputFilesRemoved: number }> {
  const { data } = await api.delete('/imports');
  return {
    deleted: Number(data?.deleted ?? 0),
    outputFilesRemoved: Number(data?.outputFilesRemoved ?? 0),
  };
}

export async function syncEtlReport(): Promise<EtlReport | null> {
  try {
    const { data } = await api.post<{ report: EtlReport; updated: { updated: number } }>(
      '/imports/sync',
    );
    return data.report;
  } catch {
    return null;
  }
}

export async function fetchEtlReport(): Promise<EtlReport | null> {
  try {
    const { data } = await api.get<EtlReport>('/imports/report');
    return data;
  } catch {
    return null;
  }
}

export async function downloadEtlReportHtml(): Promise<string> {
  const { data } = await api.get<string>('/imports/report/html', {
    responseType: 'text',
    transformResponse: [(r: string) => r],
  });
  return data;
}

export async function downloadEtlReportCsv(): Promise<string> {
  const { data } = await api.get<string>('/imports/report/csv', {
    responseType: 'text',
    transformResponse: [(r: string) => r],
  });
  return data;
}

function saveTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function saveEtlReportHtml() {
  const html = await downloadEtlReportHtml();
  saveTextFile(html, 'etl_report.html', 'text/html;charset=utf-8');
}

export async function saveEtlReportCsv() {
  const csv = await downloadEtlReportCsv();
  saveTextFile(csv, 'etl_report.csv', 'text/csv;charset=utf-8');
}
