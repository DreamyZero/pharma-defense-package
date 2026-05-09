import { useEffect, useMemo, useState, useCallback } from 'react';
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

// ─── Drug icon (pill SVG) ───────────────────────────────────────────────────
const PillIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
    <path d="m8.5 8.5 7 7"/>
  </svg>
);

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/>
    <path d="M12 17h.01"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

// ─── Types ──────────────────────────────────────────────────────────────────
type DrugTab = 'info' | 'contra' | 'interactions' | 'analogs';

const tabLabels: Record<DrugTab, string> = {
  info: 'Общая информация',
  contra: 'Противопоказания',
  interactions: 'Взаимодействия',
  analogs: 'Аналоги',
};

// Static mock data for drug detail (used when API doesn't return full fields)
const MOCK_DRUGS: Record<string, any> = {
  default: {
    atcCode: 'C01EB02',
    group: 'Антиагреганты',
    prescription: false,
    tradeNames: ['Аспирин', 'Ацетилсалициловая кислота'],
    forms: 'Таб. 100 мг, 500 мг',
    manufacturer: 'Bayer AG',
    storageConditions: 'При Т < 25°C, сухое место',
    dispensing: 'Без рецепта',
    indications: 'Профилактика тромбоза, болевой синдром, лихорадка',
    sideEffects: 'ЖКТ-кровотечение, бронхоспазм, синдром Рея (у детей)',
    contraindications: [
      'Язвенная болезнь желудка',
      'Аллергия на НПВС',
      'Беременность III триместр',
      'Возраст до 15 лет при вирусных инфекциях',
    ],
    interactions: [
      { name: 'Варфарин', risk: 'high' },
      { name: 'Гепарин', risk: 'high' },
      { name: 'Ибупрофен', risk: 'medium' },
      { name: 'Метотрексат', risk: 'high' },
    ],
    analogs: [
      { name: 'Аспикор', substance: 'Ацетилсалициловая кислота', atc: 'C01EB02', match: 100 },
      { name: 'Тромбо АСС', substance: 'Ацетилсалициловая кислота', atc: 'C01EB02', match: 100 },
      { name: 'Кардиомагнил', substance: 'АСК + Магния гидроксид', atc: 'C01EB02', match: 85 },
    ],
  },
};

const riskLabel: Record<string, string> = {
  high: 'Высокий риск',
  medium: 'Средний риск',
  low: 'Низкий риск',
};

const riskClass: Record<string, string> = {
  high: 'risk-high',
  medium: 'risk-med',
  low: 'risk-low',
};

// ─── Page keys ──────────────────────────────────────────────────────────────
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

// ─── Drug Card component ─────────────────────────────────────────────────────
function DrugCard({ drug, onClick }: { drug: Drug; onClick: () => void }) {
  const mock = MOCK_DRUGS.default;
  return (
    <button
      className="drug-card"
      onClick={onClick}
    >
      <div className="drug-card-icon">
        <PillIcon />
      </div>
      <div className="drug-card-body">
        <div className="drug-card-name">{drug.name}</div>
        <div className="drug-card-substance">{drug.substance}</div>
        <div className="drug-card-chips">
          <span className="chip-atc">{drug.atc}</span>
          <span className="chip-group">{drug.group || mock.group}</span>
          {!mock.prescription && (
            <span className="chip-otc"><CheckIcon /> Безрецептурный (OTC)</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Drug Detail component ────────────────────────────────────────────────────
function DrugDetail({ drug, onBack }: { drug: Drug; onBack: () => void }) {
  const [tab, setTab] = useState<DrugTab>('info');
  const [favorited, setFavorited] = useState(false);
  const mock = MOCK_DRUGS.default;

  const contraList = drug.contraindications?.length ? drug.contraindications : mock.contraindications;
  const interList = mock.interactions;
  const analogList = mock.analogs;

  return (
    <div className="drug-detail">
      {/* back link */}
      <button className="back-link" onClick={onBack}>
        <ChevronLeft /> Назад к результатам
      </button>

      {/* header card */}
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="detail-icon">
            <PillIcon />
          </div>
          <div>
            <h2 className="detail-name">{drug.name}</h2>
            <div className="detail-substance">{drug.substance}</div>
            <div className="detail-chips">
              <span className="chip-atc">{drug.atc || mock.atcCode}</span>
              <span className="chip-group">{drug.group || mock.group}</span>
              {!mock.prescription && (
                <span className="chip-otc"><CheckIcon /> Безрецептурный (OTC)</span>
              )}
            </div>
          </div>
        </div>
        <div className="detail-header-actions">
          <button
            className={`btn-ghost ${favorited ? 'favorited' : ''}`}
            onClick={() => setFavorited(!favorited)}
          >
            <StarIcon /> {favorited ? 'В избранном' : 'В избранное'}
          </button>
          <button className="btn-primary">
            <ZapIcon /> Проверить взаимодействия
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="detail-tabs">
        {(Object.keys(tabLabels) as DrugTab[]).map(t => (
          <button
            key={t}
            className={`detail-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* tab content */}
      <div className="detail-body">
        {tab === 'info' && (
          <div className="detail-section-card">
            <div className="section-label">ОСНОВНЫЕ СВЕДЕНИЯ</div>
            <table className="info-table">
              <tbody>
                <tr><td className="info-key">Торговое наименование</td><td><strong>{drug.name}</strong></td></tr>
                <tr><td className="info-key">Действующее вещество</td><td>{drug.substance}</td></tr>
                <tr><td className="info-key">АТХ-код</td><td>{drug.atc || mock.atcCode}</td></tr>
                <tr><td className="info-key">Фармакологическая группа</td><td>{drug.group || mock.group}</td></tr>
                <tr><td className="info-key">Форма выпуска</td><td>{drug.forms?.join(', ') || mock.forms}</td></tr>
                <tr><td className="info-key">Производитель</td><td>{mock.manufacturer}</td></tr>
                <tr><td className="info-key">Условия отпуска</td><td className="text-primary">{mock.dispensing}</td></tr>
                <tr><td className="info-key">Условия хранения</td><td>{mock.storageConditions}</td></tr>
              </tbody>
            </table>

            <div className="section-label" style={{ marginTop: 24 }}>ПОКАЗАНИЯ К ПРИМЕНЕНИЮ</div>
            <p className="detail-text">{drug.indications?.join(', ') || mock.indications}</p>

            <div className="section-label" style={{ marginTop: 24 }}>ПОБОЧНЫЕ ЭФФЕКТЫ</div>
            <p className="detail-text">{drug.sideEffects?.join(', ') || mock.sideEffects}</p>
          </div>
        )}

        {tab === 'contra' && (
          <div className="detail-section-card">
            <div className="section-label">ПРОТИВОПОКАЗАНИЯ</div>
            <div className="notice-warning">
              <AlertIcon />
              Всегда проверяйте актуальную инструкцию препарата перед назначением.
            </div>
            <ul className="contra-list">
              {contraList.map((c: string, i: number) => (
                <li key={i}><span className="contra-dot" />{c}</li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'interactions' && (
          <div className="detail-section-card">
            <div className="section-label">КЛИНИЧЕСКИ ЗНАЧИМЫЕ ВЗАИМОДЕЙСТВИЯ</div>
            <div className="notice-info">
              <InfoIcon />
              Список неполный. Используйте инструмент «Проверка взаимодействий» для полного анализа.
            </div>
            <div className="interaction-list">
              {interList.map((inter: any, i: number) => (
                <div key={i} className="interaction-row">
                  <span className="contra-dot" />
                  <span className="interaction-name">{inter.name}</span>
                  <span className={`risk-badge ${riskClass[inter.risk]}`}>{riskLabel[inter.risk]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'analogs' && (
          <div className="detail-section-card">
            <div className="section-label">АНАЛОГИ ПО ДЕЙСТВУЮЩЕМУ ВЕЩЕСТВУ</div>
            <div className="analogs-list">
              {analogList.map((a: any, i: number) => (
                <div key={i} className="drug-card analog-card">
                  <div className="drug-card-icon">
                    <PillIcon />
                  </div>
                  <div className="drug-card-body">
                    <div className="drug-card-name">{a.name}</div>
                    <div className="drug-card-substance">{a.substance}</div>
                    <div className="drug-card-chips">
                      <span className="chip-atc">{a.atc}</span>
                      <span className="chip-match">{a.match}% совпадение</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
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
  const [interactionList, setInteractionList] = useState<string[]>([]);
  const [interactionResult, setInteractionResult] = useState<any[]>([]);
  const [interactionError, setInteractionError] = useState('');

  const [analogInput, setAnalogInput] = useState('');
  const [analogs, setAnalogs] = useState<any>(null);

  const [contra, setContraState] = useState({ drug: '', age: '', context: '' });
  const [contraResult, setContraResult] = useState<any>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [etl, setEtl] = useState<any[]>([]);

  const isAdmin = profile?.role === 'ADMIN';

  const pages: PageKey[] = useMemo(() => {
    const base: PageKey[] = ['dashboard', 'search', 'interactions', 'analogs', 'contra', 'profile'];
    if (isAdmin) base.push('graph', 'admin', 'api');
    return base;
  }, [isAdmin]);

  useEffect(() => {
    if (!authorized) return;
    getDashboard().then(setDashboard).catch(() => setDashboard(null));
    getUsers().then((data) => setUsers(Array.isArray(data) ? data : [])).catch(() => setUsers([]));
    getEtlRuns().then((data) => setEtl(Array.isArray(data) ? data : [])).catch(() => setEtl([]));
    getProfile().then(setProfile).catch(() => setProfile(null));
  }, [authorized]);

  // Search with debounce effect
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      searchDrugs(query)
        .then((data) => setResults(Array.isArray(data) ? data : []))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleAddToInteractions = useCallback((name: string) => {
    setInteractionList(prev => prev.includes(name) ? prev : [...prev, name]);
  }, []);

  const handleCheckInteractions = useCallback(() => {
    setInteractionError('');
    const drugStr = interactionList.join(', ');
    getInteractions(drugStr)
      .then((data) => setInteractionResult(Array.isArray(data) ? data : []))
      .catch((e) => {
        setInteractionResult([]);
        setInteractionError(e.message || 'Ошибка проверки взаимодействий');
      });
  }, [interactionList]);

  const content = useMemo(() => {
    // ── SEARCH with drug detail ──
    if (page === 'search') {
      if (selected) {
        return <DrugDetail drug={selected} onBack={() => setSelected(null)} />;
      }
      return (
        <div className="search-layout">
          <div className="search-header">
            <h3>Поиск лекарственных препаратов</h3>
            <p className="muted">База данных содержит 14 283 препаратов с семантическими связями</p>
          </div>
          <div className="search-bar">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Быстрый поиск: Аспирин, парацетамол, C09AA..."
              className="search-input"
            />
          </div>
          {results.length > 0 ? (
            <div className="drug-list">
              {results.map(d => (
                <DrugCard key={d.id} drug={d} onClick={() => setSelected(d)} />
              ))}
            </div>
          ) : (
            <div className="search-empty">
              <div className="search-empty-icon"><PillIcon /></div>
              <p>Введите название препарата, действующего вещества или АТХ-код</p>
            </div>
          )}
        </div>
      );
    }

    // ── DASHBOARD ──
    if (page === 'dashboard') {
      const firstName = profile?.fullName?.split(' ').slice(0, 2).join(' ') || 'пользователь';
      return (
        <div className="dashboard-layout">
          <div className="dashboard-greeting">
            <h2>Добрый день, {firstName} 👋</h2>
            <p className="muted">Сводная информация о системе на сегодня</p>
          </div>

          <div className="kpi-grid">
            {dashboard?.metrics?.map((m: any) => (
              <div className="kpi-card" key={m.label}>
                <div className="kpi-label">{m.label}</div>
                <div className="kpi-value">{m.value}</div>
                <div className={`kpi-note ${m.tone || 'primary'}`}>{m.note}</div>
              </div>
            )) ?? [
              { label: 'ПРЕПАРАТОВ В БАЗЕ', value: '14 283', note: '↑ +247 за месяц', tone: 'primary' },
              { label: 'ДЕЙСТВУЮЩИХ ВЕЩЕСТВ', value: '3 841', note: '↑ Синонимов: 9 124', tone: 'primary' },
              { label: 'ВЗАИМОДЕЙСТВИЙ В ГРАФЕ', value: '28 654', note: '⚠ HIGH: 4 201', tone: 'warn' },
              { label: 'ПОКРЫТИЕ ГРЛС', value: '98%', note: '↑ Обновлено: 01.05.2025', tone: 'success' },
            ].map(m => (
              <div className="kpi-card" key={m.label}>
                <div className="kpi-label">{m.label}</div>
                <div className="kpi-value">{m.value}</div>
                <div className={`kpi-note ${m.tone}`}>{m.note}</div>
              </div>
            ))}
          </div>

          <div className="dashboard-row">
            <div className="panel">
              <div className="panel-header">
                <h3>Последние запросы</h3>
                <button className="btn-sm" onClick={() => setPage('search')}>Найти</button>
              </div>
              <div className="recent-list">
                {(dashboard?.recentQueries ?? [
                  { name: 'Аспирин', subtitle: 'Ацетилсалициловая кислота · C01EB02', time: '12:34' },
                  { name: 'Метформин', subtitle: 'Метформина гидрохлорид · A10BA02', time: '11:20' },
                  { name: 'Лизиноприл', subtitle: 'Лизиноприл · C09AA03', time: '10:05' },
                ]).map((q: any) => (
                  <button
                    key={q.name}
                    className="recent-item"
                    onClick={() => {
                      setQuery(q.name);
                      setPage('search');
                      searchDrugs(q.name).then(data => setResults(Array.isArray(data) ? data : [])).catch(() => {});
                    }}
                  >
                    <div className="recent-icon"><PillIcon /></div>
                    <div className="recent-body">
                      <div className="recent-name">{q.name}</div>
                      <div className="recent-sub">{q.subtitle}</div>
                    </div>
                    <div className="recent-time">{q.time}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel">
              <h3>Состояние ETL-импорта</h3>
              <div className="etl-list">
                {[
                  { label: 'ГРЛС — XML-выгрузка', status: 'done' },
                  { label: 'Инструкции к препаратам', status: 'done' },
                  { label: 'НЛП-унификация синонимов', status: 'running' },
                ].map(e => (
                  <div key={e.label} className="etl-row">
                    <span className="etl-name">{e.label}</span>
                    <div className="etl-right">
                      <div className="etl-bar"><div className={`etl-fill ${e.status}`} style={{ width: e.status === 'done' ? '100%' : '63%' }} /></div>
                      <span className={`etl-badge ${e.status}`}>
                        {e.status === 'done' ? '✓ Выполнен' : '⟳ В процессе'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="notice-info" style={{ marginTop: 16 }}>
                <InfoIcon /> Следующий импорт: завтра в 02:00
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h3>Популярные группы препаратов</h3>
            <div className="groups-grid">
              {[
                { code: 'C09', name: 'Ингибиторы АПФ', count: 234, tone: 'blue' },
                { code: 'N02', name: 'Анальгетики', count: 189, tone: 'green' },
                { code: 'A10', name: 'Антидиабетические', count: 156, tone: 'orange' },
                { code: 'B01', name: 'Антикоагулянты', count: 143, tone: 'red' },
                { code: 'C10', name: 'Статины', count: 128, tone: 'purple' },
                { code: 'J01', name: 'Антибиотики', count: 412, tone: 'green' },
              ].map(g => (
                <button
                  key={g.code}
                  className="group-card"
                  onClick={() => { setQuery(g.name); setPage('search'); searchDrugs(g.name).then(d => setResults(Array.isArray(d) ? d : [])).catch(() => {}); }}
                >
                  <div className={`group-code ${g.tone}`}>{g.code}</div>
                  <div className="group-name">{g.name}</div>
                  <div className={`group-count ${g.tone}`}>{g.count}</div>
                  <div className="group-label">препаратов</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── INTERACTIONS ──
    if (page === 'interactions') {
      return (
        <div className="interactions-layout">
          <div className="panel">
            <h3>Проверка лекарственных взаимодействий</h3>
            <p className="muted">Добавьте от 2 до 50 препаратов для анализа потенциальных взаимодействий</p>
            <div className="inter-add-row">
              <input
                value={interactionInput}
                onChange={e => setInteractionInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && interactionInput.trim()) {
                    handleAddToInteractions(interactionInput.trim());
                    setInteractionInput('');
                  }
                }}
                placeholder="Введите название и нажмите Enter"
                className="search-input"
              />
              <button
                className="btn-primary"
                onClick={() => {
                  if (interactionInput.trim()) {
                    handleAddToInteractions(interactionInput.trim());
                    setInteractionInput('');
                  }
                }}
              >Добавить</button>
            </div>

            {interactionList.length > 0 ? (
              <div className="inter-chips">
                {interactionList.map(name => (
                  <span key={name} className="inter-chip">
                    {name}
                    <button onClick={() => setInteractionList(prev => prev.filter(n => n !== name))}>✕</button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="search-empty">
                <div className="search-empty-icon" style={{ fontSize: 32 }}>⚗️</div>
                <p>Добавьте препараты для проверки<br/><span className="muted">Введите наименования препаратов и нажмите «Проверить»</span></p>
              </div>
            )}

            {interactionList.length >= 2 && (
              <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleCheckInteractions}>
                Проверить взаимодействия
              </button>
            )}
            {interactionError && <div className="notice-warning" style={{ marginTop: 12 }}><AlertIcon />{interactionError}</div>}
          </div>

          {interactionResult.length > 0 && (
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="section-label">КЛИНИЧЕСКИ ЗНАЧИМЫЕ ВЗАИМОДЕЙСТВИЯ</div>
              <div className="interaction-list">
                {interactionResult.map((i: any, idx: number) => (
                  <div key={idx} className="interaction-row">
                    <span className="inter-pair">{i.a} + {i.b}</span>
                    <span className="inter-desc muted">{i.note}</span>
                    <span className={`risk-badge ${riskClass[i.risk] || 'risk-low'}`}>
                      {riskLabel[i.risk] || i.riskLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── ANALOGS ──
    if (page === 'analogs') {
      return (
        <div className="search-layout">
          <div className="search-header">
            <h3>Подбор аналогов</h3>
            <p className="muted">Поиск препаратов с совпадающим действующим веществом и АТХ-кодом</p>
          </div>
          <div className="inter-add-row">
            <input
              value={analogInput}
              onChange={e => setAnalogInput(e.target.value)}
              placeholder="Введите название препарата"
              className="search-input"
            />
            <button className="btn-primary" onClick={() => getAnalogs(analogInput).then(setAnalogs).catch(() => setAnalogs(null))}>
              Найти аналоги
            </button>
          </div>
          {analogs?.analogs?.length ? (
            <div className="drug-list">
              {analogs.analogs.map((a: string, i: number) => (
                <div key={i} className="drug-card">
                  <div className="drug-card-icon"><PillIcon /></div>
                  <div className="drug-card-body">
                    <div className="drug-card-name">{a}</div>
                    <div className="drug-card-substance">Совпадение по действующему веществу</div>
                    <div className="drug-card-chips">
                      <span className="chip-match">Полный аналог</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="search-empty">
              <div className="search-empty-icon"><PillIcon /></div>
              <p>Система найдёт все аналоги по действующему веществу</p>
            </div>
          )}
        </div>
      );
    }

    // ── CONTRA ──
    if (page === 'contra') {
      return (
        <div className="search-layout">
          <div className="panel">
            <h3>Проверка противопоказаний</h3>
            <div className="field">
              <label>Препарат</label>
              <input value={contra.drug} onChange={e => setContraState({ ...contra, drug: e.target.value })} placeholder="аспирин" />
            </div>
            <div className="field">
              <label>Возраст</label>
              <input type="number" value={contra.age} onChange={e => setContraState({ ...contra, age: e.target.value })} placeholder="35" />
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
              className="btn-primary"
              onClick={() => getContra({ drug: contra.drug, age: Number(contra.age || 0), context: contra.context }).then(setContraResult).catch(() => setContraResult(null))}
            >Проверить</button>
          </div>
          {contraResult?.drug && (
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="detail-section-card">
                <div className="section-label">ПРОТИВОПОКАЗАНИЯ</div>
                <div className="notice-warning"><AlertIcon /> Всегда проверяйте актуальную инструкцию препарата перед назначением.</div>
                <ul className="contra-list">
                  {contraResult.warnings?.length
                    ? contraResult.warnings.map((w: string, i: number) => <li key={i}><span className="contra-dot" />{w}</li>)
                    : <li><span className="contra-dot" />Противопоказаний в выбранном контексте не выявлено</li>}
                </ul>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── GRAPH (admin only) ──
    if (page === 'graph') {
      if (!isAdmin) return <div className="search-empty"><p>Доступ запрещён</p></div>;
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
            <p>Граф отображает связи «препарат-вещество-группа-взаимодействие».</p>
          </section>
        </div>
      );
    }

    // ── PROFILE ──
    if (page === 'profile') {
      return (
        <div className="split">
          <section className="panel">
            <div className="row">
              <h3>Личный кабинет</h3>
              <span className="chip-otc"><CheckIcon /> {profile?.verified ? 'Верифицирован' : 'Не верифицирован'}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '16px 0' }}>
              <div className="logo">ИВ</div>
              <div>
                <strong>{profile?.fullName || 'Пользователь'}</strong>
                <div className="muted">{profile?.role || 'Роль'} · {profile?.organization || 'Организация'}</div>
              </div>
            </div>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 16 }}>
              <div className="kpi-card"><div className="kpi-label">ЗАПРОСОВ СЕГОДНЯ</div><div className="kpi-value">23</div></div>
              <div className="kpi-card"><div className="kpi-label">ПРОВЕРОК</div><div className="kpi-value">7</div></div>
            </div>
          </section>
          <section className="panel">
            <h3>Настройки профиля</h3>
            <div className="field"><label>Имя</label><input defaultValue={profile?.fullName || ''} /></div>
            <div className="field"><label>Email</label><input defaultValue={profile?.email || ''} /></div>
            <div className="field"><label>Новый пароль</label><input type="password" /></div>
            <button className="btn-primary" style={{ marginTop: 8 }}>Сохранить</button>
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
                {Array.isArray(users) && users.map((u: any) => (
                  <tr key={u.id}>
                    <td>{u.fullName}</td><td>{u.role}</td>
                    <td>{u.organization || '—'}</td>
                    <td>{u.verified ? <span className="chip-otc"><CheckIcon />Верифицирован</span> : '—'}</td>
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
                {Array.isArray(etl) && etl.map((e: any) => (
                  <tr key={e.id}>
                    <td>{e.id}</td><td>{e.source}</td><td>{e.status}</td>
                    <td>{e.recordsProcessed ?? e.processed ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      );
    }

    // ── API ──
    return (
      <section className="panel">
        <h3>REST API</h3>
        <div className="list">
          {[
            { endpoint: 'GET /dashboard', desc: 'Метрики и последние запросы.' },
            { endpoint: 'GET /drugs/search?q=аспирин', desc: 'Поиск по названию, веществу и синонимам.' },
            { endpoint: 'POST /interactions/check', desc: 'Проверка списка препаратов.' },
            { endpoint: 'GET /analogs/:name', desc: 'Подбор аналогов.' },
            { endpoint: 'POST /contra/check', desc: 'Контекстная проверка противопоказаний.' },
          ].map(a => (
            <div className="item" key={a.endpoint}>
              <strong>{a.endpoint}</strong>
              <div className="muted">{a.desc}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }, [page, dashboard, query, results, selected, interactionInput, interactionList, interactionResult, interactionError, analogs, contraResult, users, etl, contra, profile, isAdmin, handleAddToInteractions, handleCheckInteractions]);

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
            <div className="muted">{profile?.role || 'Фармацевтическая система'}</div>
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
          <input
            className="topbar-search"
            placeholder="Быстрый поиск: Аспирин, парацетамол, C09AA..."
            onFocus={() => setPage('search')}
            value={page === 'search' ? query : ''}
            onChange={e => { setPage('search'); setQuery(e.target.value); }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="toggle theme">
              {theme === 'light' ? '☀️' : '🌙'}
            </button>
            <button className="ghost" onClick={() => { /* notifications */ }}>🔔</button>
            <button
              className="ghost"
              onClick={() => { setSession(null); setAuthorized(false); }}
            >Выйти</button>
          </div>
        </header>
        <div className="page-content">
          {content}
        </div>
      </main>
    </div>
  );
}