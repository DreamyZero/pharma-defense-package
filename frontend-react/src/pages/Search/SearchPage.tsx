import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { drugsStore } from '../../stores/drugs.store';

type Tab = 'info' | 'contra' | 'interactions' | 'analogs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'info',         label: 'Общая информация' },
  { id: 'contra',       label: 'Противопоказания' },
  { id: 'interactions', label: 'Взаимодействия' },
  { id: 'analogs',      label: 'Аналоги' },
];

export const SearchPage = observer(() => {
  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    drugsStore.searchDrugs(q);
  };

  const openDetail = (slug: string) => {
    setActiveTab('info');
    drugsStore.fetchDrugDetail(slug);
  };

  const drug = drugsStore.selectedDrug;

  return (
    <div>
      <h1 className="page-title">Поиск препаратов</h1>
      <form onSubmit={handleSearch} className="search-bar">
        <input
          className="search-input"
          placeholder="Название, МНН, АТХ-код..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Найти</button>
      </form>

      {drugsStore.isLoading && <div className="loading-state">Поиск...</div>}

      <div className="results-grid">
        {drugsStore.results.map(d => (
          <div
            key={d.id}
            className="drug-card"
            onClick={() => { if (d.slug) openDetail(d.slug); }}
          >
            <div className="drug-card__header">
              <div className="drug-card__icon">💊</div>
              <div className="drug-card__title-block">
                <div className="drug-card__name">{d.name}</div>
                {d.substances && d.substances.length > 0 && (
                  <div className="drug-card__inn">
                    {d.substances.map(s => s.substance.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
            <div className="drug-card__body">
              {d.manufacturer && (
                <div className="drug-card__row">
                  <span className="drug-card__row-label">Производитель</span>
                  <span className="drug-card__row-value">{d.manufacturer}</span>
                </div>
              )}
              {d.dosageForm && (
                <div className="drug-card__row">
                  <span className="drug-card__row-label">Форма выпуска</span>
                  <span className="drug-card__row-value">{d.dosageForm}</span>
                </div>
              )}
            </div>
            <div className="drug-card__footer">
              {d.atcCode && <span className="tag-atc">{d.atcCode}</span>}
              <span className="tag-group">{(d as any).pharmacologicalGroup ?? 'Препарат'}</span>
            </div>
          </div>
        ))}
      </div>

      {drug && (
        <div className="drug-detail-overlay" onClick={() => drugsStore.clearSelectedDrug()}>
          <div className="drug-detail-card" onClick={e => e.stopPropagation()}>

            {/* Hero */}
            <div className="drug-detail-hero">
              <button className="close-btn" onClick={() => drugsStore.clearSelectedDrug()}>✕</button>
              <div className="drug-detail-hero__top">
                <div className="drug-detail-hero__icon">💊</div>
                <div>
                  <div className="drug-detail-hero__name">{drug.name}</div>
                  <div className="drug-detail-hero__inn">{drug.dosageForm}</div>
                </div>
              </div>
              <div className="drug-detail-hero__tags">
                {drug.atcCode && (
                  <span className="drug-detail-hero__tag">{drug.atcCode}</span>
                )}
                <span className="drug-detail-hero__tag drug-detail-hero__tag--otc">✓ Без рецепта</span>
              </div>
            </div>

            {/* Safety ribbon */}
            <div className="safety-ribbon">
              <span className="safety-item safety-item--warn">🤰 Беременность: с осторожностью</span>
              <span className="safety-item safety-item--danger">👶 Дети до 15 лет: противопоказан</span>
              <span className="safety-item safety-item--danger">🍷 Алкоголь: не совместим</span>
              <span className="safety-item safety-item--ok">🚗 Вождение: разрешено</span>
            </div>

            <div className="drug-detail-body">
              <div className="drug-detail-main">

                {/* Tabs */}
                <div className="tabs-bar">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Вкладка: Общая информация */}
                {activeTab === 'info' && (
                  <div>
                    {drug.description && (
                      <p style={{ marginBottom: 'var(--sp-5)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                        {drug.description}
                      </p>
                    )}
                    {!drug.description && (
                      <div className="empty-state">
                        <p>Описание препарата не указано</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Вкладка: Противопоказания */}
                {activeTab === 'contra' && (
                  <div>
                    {drug.contraindications && drug.contraindications.length > 0 ? (
                      <div className="se-list">
                        {drug.contraindications.map((c, i) => (
                          <div key={i} className="se-item">
                            <span className="se-item__badge se-item__badge--common">⚠</span>
                            <span className="se-item__name">{c.condition}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p>Противопоказания не указаны</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Вкладка: Взаимодействия */}
                {activeTab === 'interactions' && (
                  <div>
                    {(drug.interactionA?.length || drug.interactionB?.length) ? (
                      <div className="inline-interactions">
                        {drug.interactionA?.map((ia, i) => (
                          <div key={`a${i}`} className="inline-interaction">
                            <span className={`severity-badge severity-badge--${
                              ia.severity?.toLowerCase() === 'high' ? 'high'
                              : ia.severity?.toLowerCase() === 'moderate' ? 'medium'
                              : 'low'
                            }`}>
                              {ia.severity}
                            </span>
                            <div>
                              <div className="inline-interaction__name">{ia.drugB.name}</div>
                              {ia.clinicalEffect && (
                                <div className="inline-interaction__effect">{ia.clinicalEffect}</div>
                              )}
                            </div>
                          </div>
                        ))}
                        {drug.interactionB?.map((ib, i) => (
                          <div key={`b${i}`} className="inline-interaction">
                            <span className={`severity-badge severity-badge--${
                              ib.severity?.toLowerCase() === 'high' ? 'high'
                              : ib.severity?.toLowerCase() === 'moderate' ? 'medium'
                              : 'low'
                            }`}>
                              {ib.severity}
                            </span>
                            <div>
                              <div className="inline-interaction__name">{ib.drugA.name}</div>
                              {ib.clinicalEffect && (
                                <div className="inline-interaction__effect">{ib.clinicalEffect}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p>Взаимодействия не найдены</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Вкладка: Аналоги */}
                {activeTab === 'analogs' && (
                  <div>
                    {drug.analogsFrom && drug.analogsFrom.length > 0 ? (
                      <div className="analogs-grid">
                        {drug.analogsFrom.map((a, i) => (
                          <div key={i} className="analog-card">
                            <div className="analog-card__name">{a.targetDrug.name}</div>
                            <div className="analog-card__footer">
                              {a.confidence && (
                                <span className="analog-card__confidence">≈ {a.confidence}%</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p>Аналоги не найдены</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="drug-detail-sidebar">
                <div>
                  <div className="sidebar-section__title">Профиль безопасности</div>
                  <div className="safety-grid">
                    <div className="safety-cell safety-cell--warn">
                      <span className="safety-cell__icon">🤰</span>
                      <span className="safety-cell__label">Беременность</span>
                      <span className="safety-cell__status">С осторожностью</span>
                    </div>
                    <div className="safety-cell safety-cell--danger">
                      <span className="safety-cell__icon">👶</span>
                      <span className="safety-cell__label">Дети</span>
                      <span className="safety-cell__status">Противопоказан</span>
                    </div>
                    <div className="safety-cell safety-cell--danger">
                      <span className="safety-cell__icon">🍷</span>
                      <span className="safety-cell__label">Алкоголь</span>
                      <span className="safety-cell__status">Не совместим</span>
                    </div>
                    <div className="safety-cell safety-cell--ok">
                      <span className="safety-cell__icon">🚗</span>
                      <span className="safety-cell__label">Вождение</span>
                      <span className="safety-cell__status">Разрешено</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
});
