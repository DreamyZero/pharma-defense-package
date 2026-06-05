import { useEffect, useState } from 'react';
import { fetchImports, runImport, type ImportJob } from '../../entities/imports/api';
import { fetchAudit, type AuditRow } from '../../entities/audit/api';
import { fetchAdminUsers, setUserRole, updateAdminUser, type AdminUser } from '../../entities/admin/api';
import { api } from '../../shared/api';

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 10px 30px rgba(15,23,42,.06)',
};
const badge = (status: string): React.CSSProperties => ({
  display: 'inline-flex',
  padding: '6px 10px',
  borderRadius: 999,
  color: status === 'completed' ? '#166534' : status === 'running' ? '#92400e' : '#991b1b',
  background: status === 'completed' ? '#dcfce7' : status === 'running' ? '#fef3c7' : '#fee2e2',
  fontWeight: 700,
  fontSize: 12,
});

type Metric = { label: string; value: string | number; note: string };
type RecentQuery = { name: string; subtitle: string; time: string };

const DEFAULT_METRICS: Metric[] = [
  { label: 'Препаратов в базе', value: '—', note: '' },
  { label: 'Действующих веществ', value: '—', note: '' },
  { label: 'Взаимодействий в графе', value: '—', note: '' },
  { label: 'Покрытие ГРЛС', value: '—', note: '' },
];

const ROLES: AdminUser['role'][] = ['DOCTOR', 'PHARMACIST', 'ADMIN'];

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
    ]).then(async ([importsResult, auditResult, usersResult, dashboardResult]) => {
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
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        {metrics.map(({ label, value, note }) => (
          <div key={label} style={card}>
            <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 10 }}>{label}</div>
            <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 8 }}>
              {typeof value === 'number' ? value.toLocaleString('ru') : value}
            </div>
            <div style={{ color: '#059669', fontSize: 14 }}>{note}</div>
          </div>
        ))}
      </section>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Пользователи</h2>
          <span style={{ color: '#6b7280' }}>Роли, email и пароль</span>
        </div>
        {userMessage && <div style={{ marginBottom: 12, color: '#0f766e', fontWeight: 600 }}>{userMessage}</div>}
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'ФИО', 'Email', 'Роль', 'Организация', 'Новый email', 'Новый пароль', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: 13 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{u.id}</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{u.fullName}</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{u.email}</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value as AdminUser['role'])}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{u.organization ?? '—'}</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <input
                      type="email"
                      value={userEdits[u.id]?.email ?? u.email}
                      onChange={e => setUserEdit(u.id, 'email', e.target.value)}
                      style={{ width: '100%', minWidth: 160, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}
                    />
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <input
                      type="password"
                      placeholder="мин. 8 символов"
                      value={userEdits[u.id]?.password ?? ''}
                      onChange={e => setUserEdit(u.id, 'password', e.target.value)}
                      style={{ width: '100%', minWidth: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}
                    />
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <button
                      type="button"
                      onClick={() => handleSaveCredentials(u.id)}
                      style={{
                        background: '#0f766e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Сохранить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && users.length === 0 && (
            <div style={{ color: '#6b7280', padding: 16 }}>Пользователи не загружены</div>
          )}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 20 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>ETL-импорт</h2>
            <span style={{ color: '#6b7280' }}>Состояние источников</span>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
            Кнопка создаёт запись импорта в БД. Полный пайплайн:{' '}
            <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 6 }}>python etl/test_etl_demo.py</code>
            {' '}→ затем <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 6 }}>npx prisma db seed</code>.
            Отчёт: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 6 }}>etl/output/demo_report.html</code>
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Имя источника"
              style={{ flex: 1, padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: 12 }}
            />
            <button
              onClick={handleRun}
              style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 16px', fontWeight: 700 }}
            >
              Запуск ETL
            </button>
          </div>
          {message && <div style={{ marginBottom: 12, color: '#0f766e', fontWeight: 600 }}>{message}</div>}
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['ID', 'Источник', 'Статус', 'Обработано', 'Ошибок', 'Время'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: 13 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {imports.map(row => (
                  <tr key={row.id}>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{row.id}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{row.source}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={badge(row.status)}>{row.status}</span>
                    </td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{row.recordsProcessed}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{row.recordsFailed}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{row.startedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ ...card, display: 'grid', gap: 16, alignContent: 'start' }}>
          <div><h2 style={{ margin: '0 0 8px' }}>Последние запросы</h2></div>
          {recentQueries.map(x => (
            <div key={x.name} style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 16 }}>
              <div style={{ fontWeight: 700 }}>{x.name}</div>
              <div style={{ color: '#6b7280' }}>{x.subtitle}</div>
            </div>
          ))}
          {statsError && (
            <div style={{ padding: 16, borderRadius: 16, background: '#fef2f2', color: '#991b1b' }}>
              Не удалось загрузить данные с backend API.
            </div>
          )}
          {!statsError && !loading && recentQueries.length === 0 && (
            <div style={{ color: '#6b7280', fontSize: 14 }}>Запросов пока нет.</div>
          )}
        </div>
      </section>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Журнал аудита</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => loadAudit()}
              style={{
                background: '#f3f4f6',
                color: '#111827',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                padding: '8px 12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Обновить
            </button>
            <span style={{ color: '#6b7280' }}>Только для администратора</span>
          </div>
        </div>
        {auditError && (
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: '#fef2f2', color: '#991b1b' }}>
            Не удалось загрузить журнал аудита. Проверьте, что backend запущен и вы вошли как ADMIN.
          </div>
        )}
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Время', 'Пользователь', 'Действие', 'Сущность', 'IP'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: 13 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audit.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{row.time}</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{row.user}</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{row.action}</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{row.entity}</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }}>{row.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !auditError && audit.length === 0 && (
            <div style={{ color: '#6b7280', padding: 16 }}>Записей аудита пока нет. Выполните вход, поиск или запуск ETL.</div>
          )}
        </div>
      </section>
    </div>
  );
}
