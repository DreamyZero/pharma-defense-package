import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { drugsStore } from '../../stores/drugs.store';

const CONTEXTS = [
  { value: '', label: 'Не выбрано' },
  { value: 'pregnancy', label: 'Беременность' },
  { value: 'lactation', label: 'Кормление грудью' },
  { value: 'renal', label: 'Почечная недостаточность' },
  { value: 'hepatic', label: 'Печёночная недостаточность' },
  { value: 'pediatric', label: 'Детский возраст' },
];

export const ContraPage = observer(() => {
  const [drug, setDrug] = useState('');
  const [age, setAge] = useState(30);
  const [context, setContext] = useState('');

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    drugsStore.checkContra(drug, age, context);
  };

  const result = drugsStore.contraResult;

  return (
    <div>
      <h1 className="page-title">Противопоказания</h1>
      <p className="text-muted" style={{ marginBottom: 'var(--sp-5)' }}>Проверка противопоказаний с учётом возраста и особых состояний пациента</p>
      <form onSubmit={check} className="contra-form">
        <label>Препарат
          <input className="search-input" value={drug} onChange={e => setDrug(e.target.value)} required placeholder="Название препарата" />
        </label>
        <label>Возраст пациента
          <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} min={0} max={120} />
        </label>
        <label>Особые состояния
          <select value={context} onChange={e => setContext(e.target.value)}>
            {CONTEXTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <button className="btn-primary" type="submit" disabled={drugsStore.isLoading}>
          {drugsStore.isLoading ? 'Проверка...' : 'Проверить'}
        </button>
      </form>
      {result && (
        <div className={`contra-result ${result.warnings.length > 0 ? 'contra-result--warn' : 'contra-result--ok'}`}>
          <h3 style={{ marginBottom: 'var(--sp-3)' }}>{result.drug}</h3>
          {result.warnings.length === 0
            ? <p className="text-success">✓ Противопоказаний не обнаружено</p>
            : <ul style={{ paddingLeft: 'var(--sp-5)' }}>{result.warnings.map((w, i) => <li key={i} className="contra-warning">{w}</li>)}</ul>
          }
          {result.source && <p className="text-muted text-xs" style={{ marginTop: 'var(--sp-4)' }}>Источник: {result.source}</p>}
        </div>
      )}
    </div>
  );
});
