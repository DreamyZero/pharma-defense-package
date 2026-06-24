import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { drugsStore } from '../../stores/drugs.store';

const SEVERITY_CLASS: Record<string, string> = {
  high: 'badge--danger', medium: 'badge--warning', moderate: 'badge--warning', low: 'badge--success',
};

const RISK_LABEL: Record<string, string> = {
  high: 'Высокий',
  medium: 'Средний',
  moderate: 'Средний',
  low: 'Низкий',
};

function uniqueInteractionLines(item: {
  mechanism?: string | null;
  clinicalEffect?: string | null;
  recommendation?: string | null;
}): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const part of [item.mechanism, item.clinicalEffect, item.recommendation]) {
    const text = part?.trim();
    if (!text) continue;
    if (/^значимое взаимодействие не найдено/i.test(text)) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(text);
  }

  return lines;
}

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
          {drugsStore.interactions.map((item, i) => {
            const details = uniqueInteractionLines(item);
            return (
              <div key={i} className={`interaction-card interaction-card--${item.risk}`}>
                <div className="interaction-card__header">
                  <span className="interaction-card__pair">
                    <strong>{item.a}</strong>
                    <span className="interaction-card__plus">+</span>
                    <strong>{item.b}</strong>
                  </span>
                  <span className={`badge ${SEVERITY_CLASS[item.risk] || ''}`}>
                    {RISK_LABEL[item.risk] ?? item.risk}
                  </span>
                </div>
                {details.length > 0 ? (
                  <div className="interaction-card__content">
                    {details.map((line, idx) => (
                      <p
                        key={idx}
                        className={idx === 0 ? 'interaction-card__body' : 'interaction-card__rec'}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="interaction-card__body interaction-card__body--muted">
                    Значимое взаимодействие не найдено
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
