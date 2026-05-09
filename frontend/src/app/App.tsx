import { useEffect, useMemo, useState } from 'react';
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
  'dashboard',
  'search',
  'interactions',
  'analogs',
  'contra',
  'graph',
  'profile',
  'admin',
  'api',
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

  const [interactionInput, setInteractionInput] = useState('');
  const [interactionResult, setInteractionResult] = useState<any[]>([]);
  const [interactionError, setInteractionError] = useState('');

  const [analogInput, setAnalogInput] = useState('');
  const [analogs, setAnalogs] = useState<any>(null);

  const [contra, setContraState] = useState({ drug: '', age: '', context: '' });
  const [contraResult, setContraResult] = useState<any>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [etl, setEtl] = useState<any[]>([]);

  useEffect(() => {
    if (!authorized) return;

    getDashboard()
      .then(setDashboard)
      .catch(() => setDashboard(null));

    getUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));

    getEtlRuns()
      .then((data) => setEtl(Array.isArray(data) ? data : []))
      .catch(() => setEtl([]));

    getProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [authorized]);

useEffect(() => {
  if (!authorized) return;

  getDashboard().then(setDashboard).catch(() => setDashboard(null));
  getUsers().then((data) => setUsers(Array.isArray(data) ? data : [])).catch(() => setUsers([]));
  getEtlRuns().then((data) => setEtl(Array.isArray(data) ? data : [])).catch(() => setEtl([]));
  getProfile().then(setProfile).catch(() => setProfile(null));
}, [authorized]);

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
                  <div className="row">
                    <strong>{q.name}</strong>
                    <span className="faint">{q.time}</span>
                  </div>
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
              {results.length ? results.map(d => (
                <button key={d.id} className="item" onClick={() => setSelected(d)}>
                  <div className="row">
                    <strong>{d.name}</strong>
                    <span className="chip primary">{d.atc}</span>
                  </div>
                  <div className="muted">{d.substance}</div>
                </button>
              )) : <div className="muted">Введите запрос для поиска.</div>}
            </div>
          </section>
          <section className="panel">
            <h3>Карточка препарата</h3>
            {selected ? (
              <div className="list">
                <div>
                  <strong>{selected.name}</strong>
                  <div className="muted">{selected.substance} · {selected.atc}</div>
                </div>
                <div className="row">
                  <span className="chip primary">{selected.group}</span>
                  <span className="chip success">{selected.forms.join(', ')}</span>
                </div>
                <div>
                  <strong>Показания:</strong>
                  <div className="muted">{selected.indications.join(', ')}</div>
                </div>
                <div>
                  <strong>Противопоказания:</strong>
                  <div className="muted">{selected.contraindications.join(', ')}</div>
                </div>
                <div>
                  <strong>Побочные эффекты:</strong>
                  <div className="muted">{selected.sideEffects.join(', ')}</div>
                </div>
              </div>
            ) : (
              <div className="muted">Выберите препарат.</div>
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
              <label>Список препаратов</label>
              <input
                value={interactionInput}
                onChange={e => setInteractionInput(e.target.value)}
                placeholder="аспирин, варфарин, ибупрофен"
              />
            </div>
            <button
              className="btn"
              onClick={() => {
                setInteractionError('');
                getInteractions(interactionInput)
                  .then((data) => setInteractionResult(Array.isArray(data) ? data : []))
                  .catch((e) => {
                    setInteractionResult([]);
                    setInteractionError(e.message || 'Ошибка проверки взаимодействий');
                  });
              }}
            >
              Проверить
            </button>
            <div className="notice">Добавьте от 2 до 50 препаратов для анализа.</div>
            {interactionError && <div className="notice">{interactionError}</div>}
          </section>
          <section className="panel">
            <h3>Результаты</h3>
            <div className="list">
              {interactionResult.length ? interactionResult.map((i: any, idx: number) => (
                <div key={idx} className="item">
                  <div className="row">
                    <strong>{i.a} + {i.b}</strong>
                    <span className={`chip ${i.risk === 'high' ? 'error' : i.risk === 'medium' ? 'warn' : 'success'}`}>
                      {i.riskLabel}
                    </span>
                  </div>
                  <div className="muted">{i.note}</div>
                </div>
              )) : <div className="muted">Введите список препаратов.</div>}
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
            <button className="btn" onClick={() => getAnalogs(analogInput).then(setAnalogs).catch(() => setAnalogs(null))}>
              Найти аналоги
            </button>
          </section>
          <section className="panel">
            <h3>Список аналогов</h3>
            <div className="list">
              {analogs?.analogs?.length ? analogs.analogs.map((a: string) => (
                <div className="item" key={a}>
                  <div className="row">
                    <strong>{a}</strong>
                    <span className="chip success">Полный аналог</span>
                  </div>
                  <div className="muted">Совпадение по действующему веществу</div>
                </div>
              )) : <div className="muted">Система найдёт полные аналоги по веществу.</div>}
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
              <input value={contra.drug} onChange={e => setContraState({ ...contra, drug: e.target.value })} />
            </div>
            <div className="field">
              <label>Возраст</label>
              <input type="number" value={contra.age} onChange={e => setContraState({ ...contra, age: e.target.value })} />
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
            <button
              className="btn"
              onClick={() =>
                getContra({
                  drug: contra.drug,
                  age: Number(contra.age || 0),
                  context: contra.context,
                }).then(setContraResult).catch(() => setContraResult(null))
              }
            >
              Проверить
            </button>
          </section>
          <section className="panel">
            <h3>Результат</h3>
            <div className="list">
              {contraResult?.drug ? (
                <>
                  <strong>{contraResult.drug}</strong>
                  {contraResult.warnings.length ? contraResult.warnings.map((w: string) => (
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
                <div className="muted">Введите параметры пациента.</div>
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
              <div className="logo">ИВ</div>
              <div>
                <strong>{profile?.fullName || 'Пользователь'}</strong>
                <div className="muted">{profile?.role || 'Роль'} · {profile?.organization || 'Организация'}</div>
              </div>
            </div>
          </section>
          <section className="panel">
            <h3>Настройки профиля</h3>
            <div className="field">
              <label>Имя</label>
              <input defaultValue={profile?.fullName || ''} />
            </div>
            <div className="field">
              <label>Email</label>
              <input defaultValue={profile?.email || ''} />
            </div>
            <div className="field">
              <label>Новый пароль</label>
              <input type="password" />
            </div>
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
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Роль</th>
                  <th>Организация</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                  {Array.isArray(users) && users.map((u: any) => (
                  <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td>{u.role}</td>
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
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Источник</th>
                  <th>Статус</th>
                  <th>Обработано</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(etl) && etl.map((e: any) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.source}</td>
                    <td>{e.status}</td>
                    <td>{e.recordsProcessed ?? e.processed ?? '—'}</td>
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
          <div className="item">
            <strong>GET /dashboard</strong>
            <div className="muted">Метрики и последние запросы.</div>
          </div>
          <div className="item">
            <strong>GET /drugs/search?q=аспирин</strong>
            <div className="muted">Поиск по названию, веществу и синонимам.</div>
          </div>
          <div className="item">
            <strong>POST /interactions/check</strong>
            <div className="muted">Проверка списка препаратов.</div>
          </div>
          <div className="item">
            <strong>GET /analogs/:name</strong>
            <div className="muted">Подбор аналогов.</div>
          </div>
          <div className="item">
            <strong>POST /contra/check</strong>
            <div className="muted">Контекстная проверка противопоказаний.</div>
          </div>
        </div>
      </section>
    );
  }, [page, dashboard, query, results, selected, interactionInput, interactionResult, interactionError, analogs, contraResult, users, etl, contra, profile]);

  if (!authorized) {
    return <AuthGate onReady={() => setAuthorized(true)} />;
  }

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
            <button
              className="ghost"
              onClick={() => {
                setSession(null);
                setAuthorized(false);
              }}
            >
              Выйти
            </button>
          </div>
        </header>
        {content}
      </main>
    </div>
  );
}