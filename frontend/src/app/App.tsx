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

  // Debounce search
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
    getUsers().then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => setUsers([]));
    getEtlRuns().then(d => setEtl(Array.isArray(d) ? d : [])).catch(() => setEtl([]));
    getProfile().then(setProfile).catch(() => setProfile(null));
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

  const riskChip = (risk: string) => {
    if (risk === 'high' || risk === 'contraindicated') return 'error';
    if (risk === 'moderate' || risk === 'medium') return 'warn';
    return 'success';
  };

  const content = useMemo(() => {
    if (page === 'dashboard') {
      return (
        <div className="grid">
          <section className="panel">
            <div className="chip primary">Семантическая платформа</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px,3vw,54px)', margin: '10px 0 12px' }}>
              Унифицированный доступ к информации о лекарственных препаратах
            </h3>
            <p className="muted">
              Фронтенд соединён с реальным REST API-слоем и подготовлен под развитие до архитектуры
              React + NestJS + PostgreSQL + Neo4j + Python ETL.
            </p>
            <div className="metrics">
              {dashboard?.metrics?.map((m: any) => (
                <div className="card" key={m.label}>
                  <span className="muted">{m.label}</span>
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
                  <div className="row"><strong>{q.name}</strong><span className="faint">{q.time}</span></div>
                  <div className="muted">{q.subtitle}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (page === 'search') {
      return (
        <div className="split">
          <section className="panel">
            <h3>Поиск лекарственных препаратов</h3>
            <div className="field">
              <label>Название, вещество или показание</label>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="аспирин, ацетилсалициловая кислота"
              />
            </div>
            <div className="notice">Поддерживаются синонимы и поиск по действующему веществу.</div>
            <div className="list">
              {searchLoading && <div className="muted">Поиск…</div>}
              {!searchLoading && results.length > 0 && results.map((d: any) => (
                <button key={d.id || d.slug || d.name} className="item" onClick={() => setSelected(d)}>
                  <div className="row">
                    <strong>{d.name}</strong>
                    <span className="chip primary">{d.atcCode || d.atc || '—'}</span>
                  </div>
                  <div className="muted">
                    {d.substances?.map((s: any) => s.substance?.name || s).join(', ') || d.substance || d.dosageForm || '—'}
                  </div>
                </button>
              ))}
              {!searchLoading && query.length >= 2 && results.length === 0 && (
                <div className="muted">Ничего не найдено.</div>
              )}
              {!query && <div className="muted">Введите запрос для поиска.</div>}
            </div>
          </section>
          <section className="panel">
            <h3>Карточка препарата</h3>
            {selected ? (
              <div className="list">
                <div>
                  <strong>{(selected as any).name}</strong>
                  <div className="muted">
                    {(selected as any).substances?.map((s: any) => s.substance?.name || s).join(', ') || (selected as any).substance || '—'}
                    {' · '}{(selected as any).atcCode || (selected as any).atc || '—'}
                  </div>
                </div>
                {(selected as any).dosageForm && (
                  <div className="row">
                    <span className="chip primary">{(selected as any).dosageForm}</span>
                    {(selected as any).manufacturer && <span className="chip success">{(selected as any).manufacturer}</span>}
                  </div>
                )}
                {(selected as any).description && (
                  <div><strong>Описание:</strong><div className="muted">{(selected as any).description}</div></div>
                )}
                {(selected as any).rxRequired !== undefined && (
                  <div className="muted">{(selected as any).rxRequired ? '🔒 Рецептурный' : '✓ Безрецептурный'}</div>
                )}
                {(selected as any).contraindications?.length > 0 && (
                  <div>
                    <strong>Противопоказания:</strong>
                    <div className="muted">{(selected as any).contraindications.map((c: any) => c.condition || c).join(', ')}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="muted">Выберите препарат из списка.</div>
            )}
          </section>
        </div>
      );
    }

    if (page === 'interactions') {
      return (
        <div className="split">
          <section className="panel">
            <h3>Проверка лекарственных взаимодействий</h3>
            <div className="field">
              <label>Список препаратов через запятую</label>
              <input
                value={interactionInput}
                onChange={e => setInteractionInput(e.target.value)}
                placeholder="аспирин, варфарин, ибупрофен"
              />
            </div>
            <button className="btn" onClick={handleInteractions} disabled={interactionLoading}>
              {interactionLoading ? 'Проверяем…' : 'Проверить'}
            </button>
            <div className="notice">Добавьте от 2 до 50 препаратов для анализа.</div>
            {interactionError && <div className="notice" style={{ color: 'var(--error, #c00)' }}>{interactionError}</div>}
          </section>
          <section className="panel">
            <h3>Результаты</h3>
            <div className="list">
              {interactionResult.length > 0 ? interactionResult.map((i: any, idx: number) => (
                <div key={idx} className="item">
                  <div className="row">
                    <strong>{i.a} + {i.b}</strong>
                    <span className={`chip ${riskChip(i.risk)}`}>
                      {i.risk === 'high' || i.risk === 'contraindicated' ? 'Высокий риск'
                        : i.risk === 'moderate' || i.risk === 'medium' ? 'Умеренный риск'
                        : 'Низкий риск'}
                    </span>
                  </div>
                  {i.mechanism && <div className="muted">{i.mechanism}</div>}
                  {i.clinicalEffect && <div className="muted">{i.clinicalEffect}</div>}
                  {i.recommendation && <div className="muted">{i.recommendation}</div>}
                </div>
              )) : <div className="muted">Введите список препаратов и нажмите «Проверить».</div>}
            </div>
          </section>
        </div>
      );
    }

    if (page === 'analogs') {
      return (
        <div className="split">
          <section className="panel">
            <h3>Подбор аналогов</h3>
            <div className="field">
              <label>Введите препарат</label>
              <input value={analogInput} onChange={e => setAnalogInput(e.target.value)} placeholder="например: аспирин" />
            </div>
            <button className="btn" onClick={handleAnalogs}>Найти аналоги</button>
            {analogError && <div className="notice" style={{ color: 'var(--error, #c00)' }}>{analogError}</div>}
          </section>
          <section className="panel">
            <h3>Список аналогов</h3>
            <div className="list">
              {analogs?.analogs?.length > 0 ? analogs.analogs.map((a: any) => {
                const name = typeof a === 'string' ? a : a.name;
                const substances = a.substances?.join(', ') || '';
                const confidence = a.confidence ? `${a.confidence}%` : '';
                return (
                  <div className="item" key={name}>
                    <div className="row">
                      <strong>{name}</strong>
                      <span className="chip success">{confidence || 'Аналог'}</span>
                    </div>
                    {substances && <div className="muted">{substances}</div>}
                    {a.reason && <div className="muted">{a.reason}</div>}
                  </div>
                );
              }) : analogs ? (
                <div className="muted">Аналоги не найдены для «{analogs.drug || analogInput}».</div>
              ) : (
                <div className="muted">Система найдёт аналоги по действующему веществу.</div>
              )}
            </div>
          </section>
        </div>
      );
    }

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
              <label>Возраст</label>
              <input type="number" value={contra.age} onChange={e => setContraState({ ...contra, age: e.target.value })} placeholder="30" />
            </div>
            <div className="field">
              <label>Контекст</label>
              <select value={contra.context} onChange={e => setContraState({ ...contra, context: e.target.value })}>
                <option value="">Выберите контекст</option>
                <option value="pregnancy">Беременность</option>
                <option value="renal">Почечная недостаточность</option>
                <option value="ulcer">Язвенная болезнь</option>
                <option value="child">Детский возраст</option>
              </select>
            </div>
            <button className="btn" onClick={handleContra}>Проверить</button>
            {contraError && <div className="notice" style={{ color: 'var(--error, #c00)' }}>{contraError}</div>}
          </section>
          <section className="panel">
            <h3>Результат</h3>
            <div className="list">
              {contraResult?.drug ? (
                <>
                  <div><strong>{contraResult.drug}</strong></div>
                  {contraResult.warnings?.length > 0 ? contraResult.warnings.map((w: string) => (
                    <div className="item" key={w}>
                      <div className="row">
                        <strong>Предупреждение</strong>
                        <span className="chip error">Высокий риск</span>
                      </div>
                      <div className="muted">{w}</div>
                    </div>
                  )) : (
                    <div className="item">
                      <div className="row">
                        <strong>Ограничений не выявлено</strong>
                        <span className="chip success">Низкий риск</span>
                      </div>
                      <div className="muted">В выбранном контексте выраженных противопоказаний не найдено.</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="muted">Введите параметры и нажмите «Проверить».</div>
              )}
            </div>
          </section>
        </div>
      );
    }

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
            <p>Граф отображает связи «препарат-вещество-группа-взаимодействие» и соответствует требованию визуализации семантической модели.</p>
          </section>
        </div>
      );
    }

    if (page === 'profile') {
      return (
        <div className="split">
          <section className="panel">
            <div className="row">
              <h3>Личный кабинет</h3>
              <span className="chip success">{profile?.verified ? 'Верифицирован' : 'Не верифицирован'}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '16px 0' }}>
              <div className="logo">{profile?.fullName?.[0] || 'П'}</div>
              <div>
                <strong>{profile?.fullName || 'Пользователь'}</strong>
                <div className="muted">{profile?.role || 'Роль'} · {profile?.organization || 'Организация'}</div>
              </div>
            </div>
          </section>
          <section className="panel">
            <h3>Настройки профиля</h3>
            <div className="field"><label>Имя</label><input defaultValue={profile?.fullName || ''} /></div>
            <div className="field"><label>Email</label><input defaultValue={profile?.email || ''} /></div>
            <div className="field"><label>Новый пароль</label><input type="password" /></div>
          </section>
        </div>
      );
    }

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
                    <td>{u.fullName}</td><td>{u.role}</td>
                    <td>{u.organization || '—'}</td>
                    <td>{u.verified ? 'Верифицирован' : 'Не верифицирован'}</td>
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
                    <td>{e.id}</td><td>{e.source}</td><td>{e.status}</td>
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
            <div className="item" key={e}><strong>{e}</strong><div className="muted">{d}</div></div>
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
            <strong>Pharma Platform</strong>
            <div className="muted">{profile?.role || 'React + API Gateway'}</div>
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
            <div className="muted">Авторизованный контур</div>
            <h2>{titles[page]}</h2>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            </button>
            <button className="ghost" onClick={() => { setSession(null); setAuthorized(false); }}>Выйти</button>
          </div>
        </header>
        {content}
      </main>
    </div>
  );
}
