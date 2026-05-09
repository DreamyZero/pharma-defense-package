import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthGate } from '../auth/AuthGate';
import { PageKey, Drug } from '../types';
import {
  getDashboard,
  searchDrugs,
  getInteractions,
  getAnalogs,
  getContra,
  getUsers,
  getEtlRuns,
  getProfile,
} from '../shared/api';
import { getSession, setSession } from '../auth/auth';

const titles: Record<PageKey, string> = {
  dashboard: 'Обзор системы',
  search: 'Поиск препаратов',
  interactions: 'Проверка взаимодействий',
  analogs: 'Подбор аналогов',
  contra: 'Противопоказания',
  graph: 'Граф знаний',
  profile: 'Личный кабинет',
  admin: 'Администрирование',
  api: 'API и интеграция',
};

const pages: PageKey[] = [
  'dashboard', 'search', 'interactions', 'analogs',
  'contra', 'graph', 'profile', 'admin', 'api',
];

// SVG icons
const IconPill = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
    <circle cx="18" cy="18" r="3"/>
    <path d="m21.7 14.3-7.4 7.4"/>
  </svg>
);
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IconWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

function riskClass(risk: string) {
  if (risk === 'high' || risk === 'contraindicated') return 'risk-high';
  if (risk === 'moderate' || risk === 'medium') return 'risk-med';
  return 'risk-low';
}
function riskLabel(risk: string) {
  if (risk === 'high' || risk === 'contraindicated') return 'Высокий риск';
  if (risk === 'moderate' || risk === 'medium') return 'Умеренный риск';
  return 'Низкий риск';
}

export function App() {
  const [authorized, setAuthorized] = useState(Boolean(getSession()));
  const [profile, setProfile] = useState<any>(null);
  const [page, setPage] = useState<PageKey>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [dashboard, setDashboard] = useState<any>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Drug[]>([]);
  const [selected, setSelected] = useState<Drug | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [interactionInput, setInteractionInput] = useState('');
  const [interactionResult, setInteractionResult] = useState<any[]>([]);
  const [interactionError, setInteractionError] = useState('');
  const [interactionLoading, setInteractionLoading] = useState(false);

  const [analogInput, setAnalogInput] = useState('');
  const [analogs, setAnalogs] = useState<any>(null);
  const [analogError, setAnalogError] = useState('');

  const [contra, setContraState] = useState({ drug: '', age: '', context: '' });
  const [contraResult, setContraResult] = useState<any>(null);
  const [contraError, setContraError] = useState('');

  const [users, setUsers] = useState<any[]>([]);
  const [etl, setEtl] = useState<any[]>([]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query || query.trim().length < 2) { setResults([]); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(() => {
      searchDrugs(query)
        .then(data => setResults(Array.isArray(data) ? data : []))
        .catch(() => setResults([]))
        .finally(() => setSearchLoading(false));
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  useEffect(() => {
    if (!authorized) return;
    getDashboard().then(setDashboard).catch(() => setDashboard(null));
    getProfile().then(p => {
      setProfile(p);
      if (p?.role === 'ADMIN') {
        getUsers().then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => setUsers([]));
        getEtlRuns().then(d => setEtl(Array.isArray(d) ? d : [])).catch(() => setEtl([]));
      }
    }).catch(() => setProfile(null));
  }, [authorized]);

  const handleInteractions = useCallback(() => {
    setInteractionError('');
    setInteractionLoading(true);
    getInteractions(interactionInput)
      .then(data => setInteractionResult(Array.isArray(data) ? data : []))
      .catch(e => { setInteractionResult([]); setInteractionError(e.message || 'Ошибка'); })
      .finally(() => setInteractionLoading(false));
  }, [interactionInput]);

  const handleAnalogs = useCallback(() => {
    setAnalogError('');
    getAnalogs(analogInput)
      .then(setAnalogs)
      .catch(e => { setAnalogs(null); setAnalogError(e.message || 'Ошибка'); });
  }, [analogInput]);

  const handleContra = useCallback(() => {
    setContraError('');
    getContra({ drug: contra.drug, age: Number(contra.age || 0), context: contra.context })
      .then(setContraResult)
      .catch(e => { setContraResult(null); setContraError(e.message || 'Ошибка'); });
  }, [contra]);

  const content = useMemo(() => {

    // ── DASHBOARD ──
    if (page === 'dashboard') {
      return (
        <div className="grid">
          <section className="panel">
            <div className="chip primary" style={{ marginBottom: 12 }}>Семантическая платформа</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3vw,44px)', marginBottom: 10, letterSpacing: '-.5px' }}>
              Унифицированный доступ к информации о лекарственных препаратах
            </h3>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              React + NestJS + PostgreSQL + Neo4j + Python ETL — семантическая модель данных ГРЛС.
            </p>
            <div className="metrics" style={{ marginTop: 24 }}>
              {dashboard?.metrics?.map((m: any) => (
                <div className="card" key={m.label}>
                  <span className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</span>
                  <b>{m.value}</b>
                  <span className={`chip ${m.tone || 'primary'}`}>{m.note}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <h3>Последние запросы</h3>
            <div className="list">
              {dashboard?.recentQueries?.map((q: any) => (
                <div className="item" key={q.name}>
                  <div className="row"><strong style={{ fontSize: 14 }}>{q.name}</strong><span className="faint" style={{ fontSize: 12 }}>{q.time}</span></div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{q.subtitle}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    // ── SEARCH ──
    if (page === 'search') {
      return (
        <div className="split">
          <section className="panel">
            <h3>Поиск лекарственных препаратов</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16, marginTop: -8 }}>Поддерживаются синонимы и поиск по действующему веществу</p>
            <div className="search-wrapper" style={{ marginBottom: 8 }}>
              <span className="search-icon-abs"><IconSearch /></span>
              <input
                className="search-input-lg"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="аспирин, ацетилсалициловая кислота…"
              />
            </div>
            <div className="search-results">
              {searchLoading && (
                <div className="muted" style={{ padding: '12px 0', fontSize: 14 }}>Поиск…</div>
              )}
              {!searchLoading && results.map((d: any) => (
                <button
                  key={d.id || d.slug || d.name}
                  className={`drug-card${selected?.id === d.id ? ' selected' : ''}`}
                  onClick={() => setSelected(d)}
                >
                  <div className="drug-icon"><IconPill /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="drug-name">{d.name}</div>
                    <div className="drug-substance">
                      {d.substances?.map((s: any) => s.substance?.name || s).join(', ') || d.substance || d.dosageForm || '—'}
                    </div>
                    <div className="drug-meta">
                      {(d.atcCode || d.atc) && <span className="chip primary">{d.atcCode || d.atc}</span>}
                      {d.dosageForm && <span className="chip" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>{d.dosageForm}</span>}
                      {d.rxRequired !== undefined && (
                        <span className={`chip ${d.rxRequired ? 'warn' : 'success'}`}>
                          {d.rxRequired ? '🔒 Рецептурный' : '✓ Без рецепта'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {!searchLoading && query.length >= 2 && results.length === 0 && (
                <div className="empty-state">
                  <IconSearch />
                  <strong>Ничего не найдено</strong>
                  <p>Попробуйте другое название или действующее вещество</p>
                </div>
              )}
              {!query && (
                <div className="empty-state">
                  <IconSearch />
                  <strong>Введите запрос для поиска</strong>
                  <p>Минимум 2 символа — поиск начнётся автоматически</p>
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <h3>Карточка препарата</h3>
            {selected ? (
              <div>
                <div className="drug-detail-header">
                  <div className="drug-detail-icon"><IconPill /></div>
                  <div style={{ flex: 1 }}>
                    <div className="drug-detail-title">{(selected as any).name}</div>
                    <div className="drug-detail-sub">
                      {(selected as any).substances?.map((s: any) => s.substance?.name || s).join(', ') || (selected as any).substance || '—'}
                      {' · '}{(selected as any).atcCode || (selected as any).atc || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      {(selected as any).dosageForm && <span className="chip primary">{(selected as any).dosageForm}</span>}
                      {(selected as any).rxRequired !== undefined && (
                        <span className={`chip ${(selected as any).rxRequired ? 'warn' : 'success'}`}>
                          {(selected as any).rxRequired ? '🔒 Рецептурный' : '✓ Без рецепта'}
                        </span>
                      )}
                      {(selected as any).manufacturer && <span className="chip success">{(selected as any).manufacturer}</span>}
                    </div>
                  </div>
                </div>
                {(selected as any).description && (
                  <div className="detail-section">
                    <strong>Описание</strong>
                    <p>{(selected as any).description}</p>
                  </div>
                )}
                {(selected as any).contraindications?.length > 0 && (
                  <div className="detail-section">
                    <strong>Противопоказания</strong>
                    <p>{(selected as any).contraindications.map((c: any) => c.condition || c).join('; ')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <IconPill />
                <strong>Препарат не выбран</strong>
                <p>Найдите и выберите препарат из списка слева</p>
              </div>
            )}
          </section>
        </div>
      );
    }

    // ── INTERACTIONS ──
    if (page === 'interactions') {
      return (
        <div className="split">
          <section className="panel">
            <h3>Проверка взаимодействий</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16, marginTop: -8 }}>Введите препараты через запятую — минимум 2</p>
            <div className="field">
              <label>Список препаратов</label>
              <input
                value={interactionInput}
                onChange={e => setInteractionInput(e.target.value)}
                placeholder="аспирин, варфарин, ибупрофен"
              />
            </div>
            <button className="btn" onClick={handleInteractions} disabled={interactionLoading} style={{ width: '100%' }}>
              {interactionLoading ? 'Анализируем…' : 'Проверить взаимодействия'}
            </button>
            {interactionError && (
              <div className="notice" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', marginTop: 12 }}>
                {interactionError}
              </div>
            )}
          </section>
          <section className="panel">
            <h3>Результаты анализа</h3>
            {interactionResult.length > 0 ? (
              <div>
                {interactionResult.map((i: any, idx: number) => (
                  <div key={idx} className="interaction-row">
                    <span className={`risk-badge ${riskClass(i.risk)}`}>
                      <IconWarning />
                      {riskLabel(i.risk)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div className="interaction-drugs">{i.a} + {i.b}</div>
                      {i.mechanism && <div className="interaction-desc">{i.mechanism}</div>}
                      {i.clinicalEffect && <div className="interaction-desc">{i.clinicalEffect}</div>}
                      {i.recommendation && (
                        <div className="interaction-desc" style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                          → {i.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <IconWarning />
                <strong>Взаимодействия не проверялись</strong>
                <p>Введите список препаратов и нажмите «Проверить»</p>
              </div>
            )}
          </section>
        </div>
      );
    }

    // ── ANALOGS ──
    if (page === 'analogs') {
      return (
        <div className="split">
          <section className="panel">
            <h3>Подбор аналогов</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16, marginTop: -8 }}>Поиск по действующему веществу и АТХ-коду</p>
            <div className="field">
              <label>Название препарата</label>
              <input value={analogInput} onChange={e => setAnalogInput(e.target.value)} placeholder="например: аспирин" />
            </div>
            <button className="btn" onClick={handleAnalogs} style={{ width: '100%' }}>Найти аналоги</button>
            {analogError && (
              <div className="notice" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', marginTop: 12 }}>
                {analogError}
              </div>
            )}
          </section>
          <section className="panel">
            <h3>Список аналогов</h3>
            {analogs?.analogs?.length > 0 ? (
              <div className="search-results">
                {analogs.analogs.map((a: any) => {
                  const name = typeof a === 'string' ? a : a.name;
                  const substances = a.substances?.join(', ') || '';
                  const confidence = a.confidence ? `${a.confidence}%` : '';
                  return (
                    <div className="drug-card" key={name} style={{ cursor: 'default' }}>
                      <div className="drug-icon"><IconPill /></div>
                      <div style={{ flex: 1 }}>
                        <div className="drug-name">{name}</div>
                        {substances && <div className="drug-substance">{substances}</div>}
                        <div className="drug-meta">
                          {confidence && <span className="chip success">{confidence} совпадение</span>}
                          {a.reason && <span className="chip" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>{a.reason}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : analogs ? (
              <div className="empty-state">
                <IconPill />
                <strong>Аналоги не найдены</strong>
                <p>Для «{analogs.drug || analogInput}» аналогов в базе нет</p>
              </div>
            ) : (
              <div className="empty-state">
                <IconPill />
                <strong>Введите название препарата</strong>
                <p>Система найдёт аналоги по действующему веществу</p>
              </div>
            )}
          </section>
        </div>
      );
    }

    // ── CONTRA ──
    if (page === 'contra') {
      return (
        <div className="split">
          <section className="panel">
            <h3>Проверка противопоказаний</h3>
            <div className="field">
              <label>Препарат</label>
              <input value={contra.drug} onChange={e => setContraState({ ...contra, drug: e.target.value })} placeholder="аспирин" />
            </div>
            <div className="field">
              <label>Возраст пациента</label>
              <input type="number" value={contra.age} onChange={e => setContraState({ ...contra, age: e.target.value })} placeholder="30" />
            </div>
            <div className="field">
              <label>Клинический контекст</label>
              <select value={contra.context} onChange={e => setContraState({ ...contra, context: e.target.value })}>
                <option value="">Выберите контекст</option>
                <option value="pregnancy">Беременность</option>
                <option value="renal">Почечная недостаточность</option>
                <option value="ulcer">Язвенная болезнь</option>
                <option value="child">Детский возраст</option>
              </select>
            </div>
            <button className="btn" onClick={handleContra} style={{ width: '100%' }}>Проверить</button>
            {contraError && (
              <div className="notice" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', marginTop: 12 }}>
                {contraError}
              </div>
            )}
          </section>
          <section className="panel">
            <h3>Результат проверки</h3>
            {contraResult?.drug ? (
              <div>
                <div className="drug-detail-header">
                  <div className="drug-detail-icon"><IconPill /></div>
                  <div>
                    <div className="drug-detail-title">{contraResult.drug}</div>
                    <div className="drug-detail-sub">Результат контекстной проверки</div>
                  </div>
                </div>
                {contraResult.warnings?.length > 0 ? contraResult.warnings.map((w: string) => (
                  <div key={w} className="interaction-row">
                    <span className="risk-badge risk-high"><IconWarning />Противопоказание</span>
                    <div className="interaction-desc">{w}</div>
                  </div>
                )) : (
                  <div className="interaction-row">
                    <span className="risk-badge risk-low">✓ Норма</span>
                    <div>
                      <div className="interaction-drugs">Ограничений не выявлено</div>
                      <div className="interaction-desc">В выбранном контексте выраженных противопоказаний не найдено.</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <IconWarning />
                <strong>Введите параметры</strong>
                <p>Укажите препарат, возраст и контекст — нажмите «Проверить»</p>
              </div>
            )}
          </section>
        </div>
      );
    }

    // ── GRAPH ──
    if (page === 'graph') {
      return (
        <div className="split">
          <section className="panel">
            <h3>Граф знаний</h3>
            <div className="graph">
              <button className="a">Аспирин</button>
              <button className="b">Ацетилсалициловая кислота</button>
              <button className="c">НПВС</button>
              <button className="d">Варфарин</button>
            </div>
          </section>
          <section className="panel">
            <h3>Информация об узле</h3>
            <p className="muted" style={{ fontSize: 14 }}>Граф отображает связи «препарат–вещество–группа–взаимодействие» и соответствует требованию визуализации семантической модели.</p>
          </section>
        </div>
      );
    }

    // ── PROFILE ──
    if (page === 'profile') {
      return (
        <div className="split">
          <section className="panel">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
              <div className="logo" style={{ width: 56, height: 56, fontSize: 20, borderRadius: 16 }}>
                {profile?.fullName?.[0] || 'П'}
              </div>
              <div>
                <strong style={{ fontSize: 18, fontFamily: 'var(--font-display)' }}>{profile?.fullName || 'Пользователь'}</strong>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{profile?.role || 'Роль'} · {profile?.organization || 'Организация'}</div>
                <div style={{ marginTop: 8 }}><span className="chip success">✓ Верифицирован</span></div>
              </div>
            </div>
            <div className="field"><label>Полное имя</label><input defaultValue={profile?.fullName || ''} /></div>
            <div className="field"><label>Email</label><input defaultValue={profile?.email || ''} /></div>
            <div className="field"><label>Новый пароль</label><input type="password" placeholder="••••••••" /></div>
            <button className="btn" style={{ width: '100%', marginTop: 4 }}>Сохранить изменения</button>
          </section>
          <section className="panel">
            <h3>Статистика использования</h3>
            <div className="list">
              {[['Запросов сегодня', '23'], ['Проверок взаимодействий', '7'], ['Избранных препаратов', '14']].map(([l, v]) => (
                <div className="item" key={l}>
                  <div className="row">
                    <span className="muted" style={{ fontSize: 13 }}>{l}</span>
                    <strong style={{ fontSize: 20, fontFamily: 'var(--font-display)' }}>{v}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    // ── ADMIN ──
    if (page === 'admin') {
      return (
        <div className="split">
          <section className="panel">
            <h3>Пользователи</h3>
            <table className="table">
              <thead><tr><th>Пользователь</th><th>Роль</th><th>Организация</th><th>Статус</th></tr></thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                    <td><span className="chip primary">{u.role}</span></td>
                    <td>{u.organization || '—'}</td>
                    <td><span className={`chip ${u.verified ? 'success' : 'warn'}`}>{u.verified ? 'Верифицирован' : 'Не верифицирован'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h3>ETL-импорт</h3>
            <table className="table">
              <thead><tr><th>ID</th><th>Источник</th><th>Статус</th><th>Обработано</th></tr></thead>
              <tbody>
                {etl.map((e: any) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.source}</td>
                    <td><span className={`chip ${e.status === 'completed' ? 'success' : e.status === 'running' ? 'primary' : 'warn'}`}>{e.status}</span></td>
                    <td>{e.recordsProcessed ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      );
    }

    return (
      <section className="panel">
        <h3>REST API</h3>
        <div className="list">
          {[
            ['GET /dashboard', 'Метрики и последние запросы.'],
            ['GET /drugs/search?q=аспирин', 'Поиск по названию, веществу и синонимам.'],
            ['POST /interactions/check', 'Проверка списка препаратов.'],
            ['GET /analogs/:name', 'Подбор аналогов.'],
            ['POST /contra/check', 'Контекстная проверка противопоказаний.'],
          ].map(([e, d]) => (
            <div className="item" key={e}>
              <strong style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--color-primary)' }}>{e}</strong>
              <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }, [page, dashboard, query, results, selected, searchLoading, interactionInput, interactionResult, interactionError, interactionLoading, analogs, analogInput, analogError, contraResult, contra, contraError, users, etl, profile, handleInteractions, handleAnalogs, handleContra]);

  if (!authorized) return <AuthGate onReady={() => setAuthorized(true)} />;

  return (
    <div className="app" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">PS</div>
          <div>
            <strong style={{ fontSize: 14, fontFamily: 'var(--font-display)' }}>Pharma Platform</strong>
            <div className="muted" style={{ fontSize: 12 }}>{profile?.role || 'React + API Gateway'}</div>
          </div>
        </div>
        <nav className="nav">
          {pages.map(p => (
            <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>
              {titles[p]}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>Авторизованный контур</div>
            <h2>{titles[page]}</h2>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? '🌙 Тёмная' : '☀️ Светлая'}
            </button>
            <button className="ghost" onClick={() => { setSession(null); setAuthorized(false); }}>Выйти</button>
          </div>
        </header>
        <div className="content-area">
          {content}
        </div>
      </main>
    </div>
  );
}
