import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { drugsStore } from '../../stores/drugs.store';

export const AnalogsPage = observer(() => {
  const [name, setName] = useState('');

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) drugsStore.fetchAnalogs(name.trim());
  };

  return (
    <div>
      <h1 className="page-title">Аналоги препаратов</h1>
      <p className="text-muted" style={{ marginBottom: 'var(--sp-5)' }}>Поиск аналогов по торговому названию или МНН</p>
      <form onSubmit={search} className="search-bar">
        <input
          className="search-input"
          placeholder="Торговое название или МНН..."
          value={name}
          onChange={e => setName(e.target.value)}
          id="analogs-search"
          name="analogs-search"
        />
        <button className="btn-primary" type="submit" disabled={drugsStore.isLoading}>
          {drugsStore.isLoading ? 'Поиск...' : 'Найти аналоги'}
        </button>
      </form>

      {drugsStore.isLoading && <div className="loading-state">Поиск аналогов...</div>}

      {!drugsStore.isLoading && drugsStore.analogs && (
        <div>
          <h2 className="section-title">Аналоги для: {drugsStore.analogs.drug}</h2>
          {!drugsStore.analogs.analogs || drugsStore.analogs.analogs.length === 0 ? (
            <div className="empty-state">Аналоги не найдены</div>
          ) : (
            <div className="results-grid">
              {drugsStore.analogs.analogs.map((a: any, i: number) => (
                <div key={a.id ?? i} className="analog-card">
                  <div className="analog-card__name">{a.name}</div>
                  {a.substances && a.substances.length > 0 && (
                    <div className="analog-card__substances">{a.substances.join(', ')}</div>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                    {a.confidence != null && (
                      <span className="analog-card__confidence">Совпадение: {a.confidence}%</span>
                    )}
                    {a.reason && <span className="text-muted">{a.reason}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
