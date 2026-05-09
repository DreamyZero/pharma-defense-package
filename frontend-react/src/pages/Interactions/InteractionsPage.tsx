import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { drugsStore } from '../../stores/drugs.store';

const SEVERITY_CLASS: Record<string, string> = {
  high: 'badge--danger', medium: 'badge--warning', moderate: 'badge--warning', low: 'badge--success',
};

export const InteractionsPage = observer(() => {
  const [input, setInput] = useState('');
  const [list, setList] = useState<string[]>([]);

  const addDrug = () => {
    const name = input.trim();
    if (name && !list.includes(name)) { setList(l => [...l, name]); setInput(''); }
  };

  const remove = (name: string) => setList(l => l.filter(x => x !== name));

  const check = () => drugsStore.checkInteractions(list);

  return (
    <div>
      <h1 className="page-title">Проверка взаимодействий</h1>
      <p className="text-muted" style={{ marginBottom: 'var(--sp-5)' }}>Добавьте 2 и более препарата для проверки совместимости</p>
      <div className="interactions-input-row">
        <input
          className="search-input"
          placeholder="Название препарата..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addDrug()}
        />
        <button className="btn-primary" onClick={addDrug}>Добавить</button>
      </div>
      <div className="tag-list">
        {list.map(name => (
          <span key={name} className="tag">
            {name}
            <button onClick={() => remove(name)} className="tag__remove">✕</button>
          </span>
        ))}
      </div>
      {list.length >= 2 && (
        <button className="btn-primary" onClick={check} disabled={drugsStore.isLoading} style={{ marginBottom: 'var(--sp-6)' }}>
          {drugsStore.isLoading ? 'Проверка...' : 'Проверить взаимодействия'}
        </button>
      )}
      {drugsStore.interactions.length > 0 && (
        <div className="interactions-results">
          {drugsStore.interactions.map((item, i) => (
            <div key={i} className={`interaction-card interaction-card--${item.risk}`}>
              <div className="interaction-card__header">
                <strong>{item.a}</strong> + <strong>{item.b}</strong>
                <span className={`badge ${SEVERITY_CLASS[item.risk] || ''}`}>{item.risk.toUpperCase()}</span>
              </div>
              {item.mechanism && <p className="text-muted">{item.mechanism}</p>}
              {item.clinicalEffect && <p>{item.clinicalEffect}</p>}
              <p className="interaction-card__rec">{item.recommendation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
