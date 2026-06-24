import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchImports,
  fetchEtlReport,
  runImport,
  clearImports,
  syncEtlReport,
  saveEtlReportCsv,
  downloadEtlReportHtml,
  type ImportJob,
  type EtlReport,
} from '../../entities/imports/api';
import { fetchAudit, clearAudit, type AuditRow } from '../../entities/audit/api';
import { fetchAdminUsers, setUserRole, updateAdminUser, type AdminUser } from '../../entities/admin/api';
import { api } from '../../shared/api';
import { uiStore } from '../../stores/ui.store';
import { Icon } from '../../components/Icon';
import { EtlReportModal } from './EtlReportModal';

type Metric = { label: string; value: string | number; note: string };
type RecentQuery = { name: string; subtitle: string; time: string };

const DEFAULT_METRICS: Metric[] = [
  { label: 'Препаратов в базе', value: '—', note: '' },
  { label: 'Действующих веществ', value: '—', note: '' },
  { label: 'Взаимодействий в графе', value: '—', note: '' },
  { label: 'Покрытие ГРЛС', value: '—', note: '' },
];

const ROLES: AdminUser['role'][] = ['DOCTOR', 'PHARMACIST', 'ADMIN'];

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'completed') return 'admin-badge admin-badge--completed';
  if (s === 'running') return 'admin-badge admin-badge--running';
  if (s === 'failed') return 'admin-badge admin-badge--failed';
  return 'admin-badge admin-badge--pending';
}

function formatImportTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function AdminPage() {
  const navigate = useNavigate();
  const [imports, setImports] = useState<ImportJob[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('manual_demo_job');
  const [message, setMessage] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [userEdits, setUserEdits] = useState<Record<number, { email: string; password: string }>>({});
  const [metrics, setMetrics] = useState<Metric[]>(DEFAULT_METRICS);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [statsError, setStatsError] = useState(false);
  const [auditError, setAuditError] = useState(false);
  const [auditClearing, setAuditClearing] = useState(false);
  const [etlReport, setEtlReport] = useState<EtlReport | null>(null);
  const [etlReportOpen, setEtlReportOpen] = useState(false);
  const [etlHtmlPreview, setEtlHtmlPreview] = useState<string | null>(null);
  const [etlActionLoading, setEtlActionLoading] = useState(false);
  const [etlRunning, setEtlRunning] = useState(false);
  const [importsClearing, setImportsClearing] = useState(false);
  const [etlError, setEtlError] = useState('');

  const loadAudit = async () => {
    try {
      const rows = await fetchAudit();
      setAudit(rows);
      setAuditError(false);
      return rows;
    } catch {
      setAudit([]);
      setAuditError(true);
      return [];
    }
  };

  const handleClearAudit = async () => {
    if (!audit.length) return;
    if (!window.confirm('Удалить все записи журнала аудита? Это действие необратимо.')) return;

    setAuditClearing(true);
    try {
      const { deleted } = await clearAudit();
      await loadAudit();
      setMessage(`Журнал аудита очищен (удалено ${deleted} записей).`);
    } catch {
      setMessage('Не удалось очистить журнал аудита.');
    } finally {
      setAuditClearing(false);
    }
  };

  useEffect(() => {
    Promise.allSettled([
      fetchImports(),
      fetchAudit(),
      fetchAdminUsers(),
      api.get('/dashboard').then(r => r.data),
      fetchEtlReport(),
    ]).then(([importsResult, auditResult, usersResult, dashboardResult, etlResult]) => {
      if (importsResult.status === 'fulfilled') setImports(importsResult.value);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value);
      else setUsers([]);

      if (auditResult.status === 'fulfilled') {
        setAudit(auditResult.value);
        setAuditError(false);
      } else {
        setAudit([]);
        setAuditError(true);
      }

      if (dashboardResult.status === 'fulfilled' && dashboardResult.value?.metrics) {
        setMetrics(dashboardResult.value.metrics);
        setRecentQueries(dashboardResult.value.recentQueries ?? []);
        setStatsError(false);
      } else {
        setStatsError(true);
      }

      if (etlResult.status === 'fulfilled' && etlResult.value) {
        setEtlReport(etlResult.value);
      }

      setLoading(false);
    });
  }, []);

  const refreshImports = async () => {
    const list = await fetchImports();
    setImports(list);
  };

  const handleSyncReport = async () => {
    setEtlActionLoading(true);
    setEtlError('');
    try {
      const report = await syncEtlReport();
      if (!report) {
        setEtlError('Не удалось синхронизировать отчёт. Проверьте backend и путь etl/output');
        return;
      }
      setEtlReport(report);
      await refreshImports();
      if (report.status.status === 'ok') {
        setMessage('Отчёт ETL обновлён');
      } else if (report.status.status === 'never_run') {
        setEtlError(report.status.error ?? 'Сначала выполните: cd etl/src && python run_etl.py');
      }
    } catch {
      setEtlError('Синхронизация не удалась');
    } finally {
      setEtlActionLoading(false);
    }
  };

  const refreshEtlReport = async () => {
    const report = await fetchEtlReport();
    if (report) setEtlReport(report);
    return report;
  };

  const handleShowReport = async () => {
    setEtlActionLoading(true);
    setEtlError('');
    try {
      const report = await refreshEtlReport();
      if (!report) {
        setEtlError('Не удалось загрузить отчёт');
        return;
      }
      let html: string | null = null;
      if (report.files.html) {
        html = await downloadEtlReportHtml();
      }
      setEtlHtmlPreview(html);
      setEtlReportOpen(true);
    } catch {
      setEtlError('Отчёт не найден. Запустите ETL или обновите отчёт.');
    } finally {
      setEtlActionLoading(false);
    }
  };

  const handleOpenHtml = async () => {
    setEtlActionLoading(true);
    setEtlError('');
    try {
      const report = await refreshEtlReport();
      if (!report) {
        setEtlError('Не удалось загрузить отчёт');
        return;
      }
      const html = await downloadEtlReportHtml();
      setEtlHtmlPreview(html);
      setEtlReport(report);
      setEtlReportOpen(true);
    } catch {
      setEtlError('HTML-отчёт недоступен. Запустите ETL или обновите отчёт.');
    } finally {
      setEtlActionLoading(false);
    }
  };

  const handleDownloadCsv = async () => {
    setEtlActionLoading(true);
    setEtlError('');
    try {
      await saveEtlReportCsv();
    } catch {
      setEtlError('CSV-отчёт недоступен');
    } finally {
      setEtlActionLoading(false);
    }
  };

  const handleRun = async () => {
    setEtlRunning(true);
    setEtlError('');
    try {
      const res = await runImport(source);
      setMessage(res.message);
      setImports(prev => [res.job, ...prev.filter(j => j.id !== res.job.id)]);
      if (res.report) setEtlReport(res.report);
      await loadAudit();
    } catch {
      setEtlError('Не удалось запустить ETL. Проверьте Python (pandas) и доступность backend.');
    } finally {
      setEtlRunning(false);
    }
  };

  const handleClearImports = async () => {
    if (
      !window.confirm(
        'Удалить журнал импортов и файлы отчёта ETL (status, CSV, HTML)? Это действие необратимо.',
      )
    ) {
      return;
    }

    setImportsClearing(true);
    setEtlError('');
    try {
      const { deleted, outputFilesRemoved } = await clearImports();
      setImports([]);
      setEtlReport({
        status: { status: 'never_run' },
        metrics: [],
        files: { html: false, csv: false },
        outputDir: etlReport?.outputDir ?? '',
      });
      setEtlReportOpen(false);
      setEtlHtmlPreview(null);
      setMessage(
        `Очищено: ${deleted} записей журнала, ${outputFilesRemoved} файлов отчёта.`,
      );
      await loadAudit();
    } catch {
      setEtlError('Не удалось очистить журнал импортов и отчёты ETL.');
    } finally {
      setImportsClearing(false);
    }
  };

  const handleRoleChange = async (userId: number, role: AdminUser['role']) => {
    try {
      await setUserRole(userId, role);
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
      setUserMessage(`Роль пользователя #${userId} обновлена`);
      await loadAudit();
    } catch {
      setUserMessage('Не удалось обновить роль');
    }
  };

  const setUserEdit = (userId: number, field: 'email' | 'password', value: string) => {
    setUserEdits(prev => {
      const current = prev[userId] ?? { email: users.find(u => u.id === userId)?.email ?? '', password: '' };
      return { ...prev, [userId]: { ...current, [field]: value } };
    });
  };

  const handleSaveCredentials = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    const edit = userEdits[userId];
    if (!user || !edit) return;

    const payload: { email?: string; password?: string } = {};
    if (edit.email.trim() && edit.email.trim() !== user.email) {
      payload.email = edit.email.trim();
    }
    if (edit.password.trim().length >= 8) {
      payload.password = edit.password.trim();
    }
    if (!payload.email && !payload.password) {
      setUserMessage('Укажите новый email и/или пароль (не менее 8 символов)');
      return;
    }

    try {
      const updated = await updateAdminUser(userId, payload);
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...updated } : u)));
      setUserEdits(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setUserMessage(`Данные пользователя #${userId} сохранены`);
      await loadAudit();
    } catch {
      setUserMessage('Не удалось обновить email или пароль');
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1 className="page-title">Панель администратора</h1>
          <p className="text-muted text-sm">ETL, пользователи, аудит и превью мобильного интерфейса</p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--mobile"
          onClick={() => {
            uiStore.enableMobilePreview();
            navigate('/search');
          }}
        >
          <Icon name="layers" size={16} />
          Мобильная версия
        </button>
      </header>

      <section className="admin-metrics">
        {metrics.map(({ label, value, note }) => (
          <div key={label} className="admin-panel">
            <div className="admin-metric__label">{label}</div>
            <div className="admin-metric__value">
              {typeof value === 'number' ? value.toLocaleString('ru') : value}
            </div>
            {note && <div className="admin-metric__note">{note}</div>}
          </div>
        ))}
      </section>

      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2>Пользователи</h2>
          <span className="admin-panel__hint">Роли, email и пароль</span>
        </div>
        {userMessage && <div className="admin-msg admin-msg--ok">{userMessage}</div>}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {['ID', 'ФИО', 'Email', 'Роль', 'Организация', 'Новый email', 'Новый пароль', ''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="admin-select"
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value as AdminUser['role'])}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td>{u.organization ?? '—'}</td>
                  <td>
                    <input
                      type="email"
                      className="admin-input"
                      value={userEdits[u.id]?.email ?? u.email}
                      onChange={e => setUserEdit(u.id, 'email', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="password"
                      className="admin-input"
                      placeholder="мин. 8 символов"
                      value={userEdits[u.id]?.password ?? ''}
                      onChange={e => setUserEdit(u.id, 'password', e.target.value)}
                    />
                  </td>
                  <td>
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => handleSaveCredentials(u.id)}>
                      Сохранить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && users.length === 0 && (
            <div className="admin-empty">Пользователи не загружены</div>
          )}
        </div>
      </section>

      <section className="admin-cols">
        <div className="admin-panel admin-panel--etl">
          <div className="admin-panel__head">
            <h2>ETL-импорт</h2>
            <span className="admin-panel__hint">Пайплайн и отчёты</span>
          </div>

          <div className="admin-etl-hero">
            <div className="admin-etl-hero__main">
              <span className={`admin-etl-pill admin-etl-pill--${etlReport?.status.status ?? 'never_run'}`}>
                {etlReport?.status.status === 'ok'
                  ? 'Последний ETL: успешно'
                  : etlReport?.status.status === 'failed'
                    ? 'Последний ETL: ошибка'
                    : 'ETL ещё не запускался'}
              </span>
              {etlReport?.status.source_file && (
                <p className="admin-etl-hero__source">Источник: {etlReport.status.source_file}</p>
              )}
              {etlReport?.finishedAt && (
                <p className="admin-etl-hero__time">
                  Завершён: {new Date(etlReport.finishedAt).toLocaleString('ru-RU')}
                </p>
              )}
            </div>
            <div className="admin-etl-actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                disabled={etlActionLoading}
                onClick={handleSyncReport}
              >
                Обновить отчёт
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--report"
                disabled={etlActionLoading}
                onClick={handleShowReport}
              >
                Показать отчёт
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                disabled={etlActionLoading || !etlReport?.files.html}
                onClick={handleOpenHtml}
              >
                HTML
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                disabled={etlActionLoading || !etlReport?.files.csv}
                onClick={handleDownloadCsv}
              >
                CSV
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                disabled={importsClearing || etlActionLoading || etlRunning}
                onClick={handleClearImports}
              >
                {importsClearing ? 'Очистка…' : 'Очистить'}
              </button>
            </div>
          </div>

          {etlReport && etlReport.metrics.length > 0 && (
            <div className="admin-etl-metrics admin-etl-metrics--inline">
              {etlReport.metrics.map((m, i) => (
                <div key={m.key} className="admin-etl-metrics__item" data-accent={i % 4}>
                  <span className="admin-etl-metrics__value">{m.value.toLocaleString('ru')}</span>
                  <span className="admin-etl-metrics__label">{m.label}</span>
                </div>
              ))}
            </div>
          )}

          <p className="admin-etl-hint">
            Кнопка <strong>Запуск ETL</strong> выполняет полный пайплайн:
            <code>parse_sources.py --grls --rxnorm</code> → <code>run_etl.py</code> → PostgreSQL → Neo4j.
            Нужны Python (pandas, requests) и доступ к minzdrav.gov.ru и rxnav.nlm.nih.gov.
          </p>

          <div className="admin-etl-form">
            <input
              className="admin-input"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Имя источника"
              disabled={etlRunning}
            />
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={etlRunning}
              onClick={handleRun}
            >
              {etlRunning ? 'Выполняется…' : 'Запуск ETL'}
            </button>
          </div>
          {message && <div className="admin-msg admin-msg--ok">{message}</div>}
          {etlError && <div className="admin-msg admin-msg--err">{etlError}</div>}
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--imports">
              <thead>
                <tr>
                  {['ID', 'Источник', 'Статус', 'Обработано', 'Ошибок', 'Время'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {imports.map(row => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.source}</td>
                    <td>
                      <span className={statusBadgeClass(row.status)}>{row.status}</span>
                    </td>
                    <td>{row.recordsProcessed}</td>
                    <td>{row.recordsFailed}</td>
                    <td>{formatImportTime(row.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-panel admin-side-stack">
          <h2 className="admin-side-title">Последние запросы</h2>
          {recentQueries.map(x => (
            <div key={x.name} className="admin-query-card">
              <div className="admin-query-card__name">{x.name}</div>
              <div className="admin-query-card__sub">{x.subtitle}</div>
            </div>
          ))}
          {statsError && (
            <div className="admin-msg admin-msg--err">Не удалось загрузить данные с backend API.</div>
          )}
          {!statsError && !loading && recentQueries.length === 0 && (
            <div className="admin-empty">Запросов пока нет.</div>
          )}
        </div>
      </section>

      {etlReportOpen && etlReport && (
        <EtlReportModal
          report={etlReport}
          htmlPreview={etlHtmlPreview}
          onClose={() => {
            setEtlReportOpen(false);
            setEtlHtmlPreview(null);
          }}
        />
      )}

      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2>Журнал аудита</h2>
          <div className="admin-head-actions">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => loadAudit()}>
              Обновить
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--danger admin-btn--on-dark"
              disabled={auditClearing || loading}
              onClick={handleClearAudit}
            >
              {auditClearing ? 'Очистка…' : 'Очистить'}
            </button>
            <span className="admin-panel__hint">Только для администратора</span>
          </div>
        </div>
        {auditError && (
          <div className="admin-msg admin-msg--err">
            Не удалось загрузить журнал аудита. Проверьте, что backend запущен и вы вошли как ADMIN.
          </div>
        )}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {['Время', 'Пользователь', 'Действие', 'Сущность', 'IP'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audit.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.time}</td>
                  <td>{row.user}</td>
                  <td>{row.action}</td>
                  <td>{row.entity}</td>
                  <td>{row.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !auditError && audit.length === 0 && (
            <div className="admin-empty">Записей аудита пока нет. Выполните вход, поиск или запуск ETL.</div>
          )}
        </div>
      </section>
    </div>
  );
}
