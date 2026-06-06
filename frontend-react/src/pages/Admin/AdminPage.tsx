import { useEffect, useState } from 'react';
import { fetchImports, runImport, type ImportJob } from '../../entities/imports/api';
import { fetchAudit, type AuditRow } from '../../entities/audit/api';
import { fetchAdminUsers, setUserRole, updateAdminUser, type AdminUser } from '../../entities/admin/api';
import { api } from '../../shared/api';

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

export function AdminPage() {
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

  useEffect(() => {
    Promise.allSettled([
      fetchImports(),
      fetchAudit(),
      fetchAdminUsers(),
      api.get('/dashboard').then(r => r.data),
    ]).then(([importsResult, auditResult, usersResult, dashboardResult]) => {
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

      setLoading(false);
    });
  }, []);

  const handleRun = async () => {
    const res = await runImport(source);
    setMessage(res.message);
    setImports(prev => [res.job, ...prev]);
    await loadAudit();
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
        <div className="admin-panel">
          <div className="admin-panel__head">
            <h2>ETL-импорт</h2>
            <span className="admin-panel__hint">Состояние источников</span>
          </div>
          <p className="admin-etl-hint">
            Кнопка создаёт запись импорта в БД. Полный пайплайн:{' '}
            <code>python etl/test_etl_demo.py</code>
            {' '}→ затем <code>npx prisma db seed</code>.
            Отчёт: <code>etl/output/demo_report.html</code>
          </p>
          <div className="admin-etl-form">
            <input
              className="admin-input"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Имя источника"
            />
            <button type="button" className="admin-btn admin-btn--primary" onClick={handleRun}>
              Запуск ETL
            </button>
          </div>
          {message && <div className="admin-msg admin-msg--ok">{message}</div>}
          <div className="admin-table-wrap">
            <table className="admin-table">
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
                    <td>{row.startedAt}</td>
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

      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2>Журнал аудита</h2>
          <div className="admin-head-actions">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => loadAudit()}>
              Обновить
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
