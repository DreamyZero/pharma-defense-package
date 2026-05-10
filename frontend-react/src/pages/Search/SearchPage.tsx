import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { drugsStore } from '../../stores/drugs.store';

export const SearchPage = observer(() => {
  const [q, setQ] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    drugsStore.searchDrugs(q);
  };

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
        <button className="btn-primary" type="submit">Найти</button>
      </form>
      {drugsStore.isLoading && <div className="loading-state">Поиск...</div>}
      <div className="results-grid">
        {drugsStore.results.map(drug => (
          <div
            key={drug.id}
            className="drug-card"
            onClick={() => {
              // Guard: only call fetchDrugDetail if slug is defined
              if (drug.slug) {
                drugsStore.fetchDrugDetail(drug.slug);
              }
            }}
          >
            <div className="drug-card__name">{drug.name}</div>
            <div className="drug-card__meta">
              {drug.atcCode && <span className="badge">{drug.atcCode}</span>}
              {drug.manufacturer && <span className="text-muted">{drug.manufacturer}</span>}
            </div>
            {drug.substances && drug.substances.length > 0 && (
              <div className="drug-card__substances">
                {drug.substances.map(s => s.substance.name).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
      {drugsStore.selectedDrug && (
        <div className="drug-detail-overlay" onClick={() => drugsStore.clearSelectedDrug()}>
          <div className="drug-detail-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => drugsStore.clearSelectedDrug()}>✕</button>
            <h2>{drugsStore.selectedDrug.name}</h2>
            <p className="text-muted">{drugsStore.selectedDrug.dosageForm}</p>
            {drugsStore.selectedDrug.description && <p>{drugsStore.selectedDrug.description}</p>}
            {drugsStore.selectedDrug.contraindications && drugsStore.selectedDrug.contraindications.length > 0 && (
              <div>
                <h3>Противопоказания</h3>
                <ul>{drugsStore.selectedDrug.contraindications.map((c, i) => <li key={i}>{c.condition}</li>)}</ul>
              </div>
            )}
            {drugsStore.selectedDrug.analogsFrom && drugsStore.selectedDrug.analogsFrom.length > 0 && (
              <div>
                <h3>Аналоги</h3>
                <ul>{drugsStore.selectedDrug.analogsFrom.map((a, i) => <li key={i}>{a.targetDrug.name}{a.confidence ? ` (${a.confidence}%)` : ''}</li>)}</ul>
              </div>
            )}
            {(drugsStore.selectedDrug.interactionA || drugsStore.selectedDrug.interactionB) && (
              <div>
                <h3>Взаимодействия</h3>
                <ul>
                  {drugsStore.selectedDrug.interactionA?.map((ia, i) => (
                    <li key={`a${i}`}>
                      <span className={`badge badge--${ia.severity?.toLowerCase() === 'high' ? 'danger' : ia.severity?.toLowerCase() === 'moderate' ? 'warning' : 'success'}`}>
                        {ia.severity}
                      </span>
                      {' '}{ia.drugB.name}{ia.clinicalEffect ? ` — ${ia.clinicalEffect}` : ''}
                    </li>
                  ))}
                  {drugsStore.selectedDrug.interactionB?.map((ib, i) => (
                    <li key={`b${i}`}>
                      <span className={`badge badge--${ib.severity?.toLowerCase() === 'high' ? 'danger' : ib.severity?.toLowerCase() === 'moderate' ? 'warning' : 'success'}`}>
                        {ib.severity}
                      </span>
                      {' '}{ib.drugA.name}{ib.clinicalEffect ? ` — ${ib.clinicalEffect}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
