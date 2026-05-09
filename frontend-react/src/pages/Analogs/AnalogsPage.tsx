import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { drugsStore } from '../../stores/drugs.store';

export const AnalogsPage = observer(() => {
  const [name, setName] = useState('');

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    drugsStore.fetchAnalogs(name);
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
        />
        <button className="btn-primary" type="submit" disabled={drugsStore.isLoading}>
          {drugsStore.isLoading ? 'Поиск...' : 'Найти аналоги'}
        </button>
      </form>
      {drugsStore.analogs && (
        <div>
          <h2 className="section-title">Аналоги для: {drugsStore.analogs.drug}</h2>
          {!drugsStore.analogs.analogs || drugsStore.analogs.analogs.length === 0
            ? <div className="empty-state">Аналоги не найдены</div>
            : <div className="results-grid">
                {drugsStore.analogs.analogs.map((a: any, i: number) => (
                  <div key={a.id || i} className="drug-card">
                    <div className="drug-card__name">{a.name}</div>
                    {a.substances && a.substances.length > 0 && (
                      <div className="drug-card__substances">{a.substances.join(', ')}</div>
                    )}
                    {a.confidence != null && <div className="text-muted" style={{ marginTop: 'var(--sp-2)' }}>Совпадение: {a.confidence}%</div>}
                    {a.reason && <div className="text-muted">{a.reason}</div>}
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
});
