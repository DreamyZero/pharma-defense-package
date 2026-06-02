import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon';
import { drugsStore, type DrugDetail } from '../../stores/drugs.store';
import { DrugInstruction } from './DrugInstruction';

type Tab = 'info' | 'contra' | 'interactions' | 'analogs';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'info', label: 'Описание', icon: 'layers' },
  { id: 'contra', label: 'Противопоказания', icon: 'ban' },
  { id: 'interactions', label: 'Взаимодействия', icon: 'zap' },
  { id: 'analogs', label: 'Аналоги', icon: 'repeat' },
];

function severityClass(severity?: string) {
  const s = (severity || 'low').toLowerCase();
  if (s === 'high' || s === 'contraindicated') return 'high';
  if (s === 'moderate' || s === 'medium') return 'medium';
  return 'low';
}

function severityLabel(severity?: string) {
  const s = severityClass(severity);
  if (s === 'high') return 'Высокий риск';
  if (s === 'medium') return 'Средний риск';
  return 'Низкий риск';
}

function ModalBody({ drug, onClose }: { drug: DrugDetail; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('info');
  const [analogRows, setAnalogRows] = useState<Array<{ id: number; name: string; substances?: string[]; confidence?: number; reason?: string }>>([]);
  const [analogsLoading, setAnalogsLoading] = useState(false);

  useEffect(() => {
    setTab('info');
    setAnalogRows([]);
  }, [drug.slug]);

  useEffect(() => {
    if (tab !== 'analogs') return;
    const fromDetail = (drug.analogsFrom || []).map(a => ({
      id: a.targetDrug.id,
      name: a.targetDrug.name,
      confidence: a.confidence,
      reason: a.reason,
    }));
    if (fromDetail.length > 0) {
      setAnalogRows(fromDetail);
      return;
    }
    setAnalogsLoading(true);
    drugsStore.fetchAnalogs(drug.name).then(() => {
      setAnalogRows(drugsStore.analogs?.analogs || []);
      setAnalogsLoading(false);
    });
  }, [tab, drug.slug, drug.name, drug.analogsFrom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const interactions = [
    ...(drug.interactionA || []).map(ix => ({
      key: `a-${ix.drugB.name}`,
      partner: ix.drugB.name,
      severity: ix.severity,
      text: ix.clinicalEffect || ix.recommendation,
    })),
    ...(drug.interactionB || []).map(ix => ({
      key: `b-${ix.drugA.name}`,
      partner: ix.drugA.name,
      severity: ix.severity,
      text: ix.clinicalEffect || ix.recommendation,
    })),
  ];

  const inn = drug.substances?.map(s => s.substance.name).filter(Boolean).join(', ');

  return (
    <div className="drug-modal" role="dialog" aria-modal="true" aria-labelledby="drug-modal-title">
      <header className="drug-modal__hero">
        <button type="button" className="drug-modal__close" onClick={onClose} aria-label="Закрыть">
          <Icon name="x" size={20} />
        </button>
        <div className="drug-modal__hero-inner">
          <div className="drug-modal__icon-wrap">
            <Icon name="pill" size={28} />
          </div>
          <div className="drug-modal__titles">
            <h2 id="drug-modal-title" className="drug-modal__name">{drug.name}</h2>
            {inn && <p className="drug-modal__inn">{inn}</p>}
            <div className="drug-modal__tags">
              {drug.atcCode && <span className="drug-modal__tag">{drug.atcCode}</span>}
              {drug.pharmacologicalGroup && (
                <span className="drug-modal__tag drug-modal__tag--muted">{drug.pharmacologicalGroup}</span>
              )}
              {drug.dosageForm && (
                <span className="drug-modal__tag drug-modal__tag--muted">{drug.dosageForm}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="drug-modal__tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`drug-modal__tab${tab === t.id ? ' drug-modal__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
            {t.id === 'interactions' && interactions.length > 0 && (
              <span className="drug-modal__tab-badge">{interactions.length}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="drug-modal__body">
        {tab === 'info' && (
          <div className="drug-modal__section">
            <DrugInstruction
              description={drug.description}
              instructionMeta={drug.instructionMeta}
              registrationNumber={drug.registrationNumber}
              manufacturer={drug.manufacturer}
            />
          </div>
        )}

        {tab === 'contra' && (
          <div className="drug-modal__section">
            {drug.contraindications?.length ? (
              <ul className="drug-modal__list">
                {drug.contraindications.map((c, i) => (
                  <li key={i} className="drug-modal__list-item drug-modal__list-item--warn">
                    <Icon name="alert" size={18} />
                    <span>{c.condition}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="drug-modal__empty">Противопоказания не указаны.</p>
            )}
          </div>
        )}

        {tab === 'interactions' && (
          <div className="drug-modal__section">
            {interactions.length > 0 ? (
              <div className="interaction-list interaction-list--modal">
                {interactions.map(ix => (
                  <article key={ix.key} className="interaction-list__item">
                    <div className="interaction-list__head">
                      <span className="interaction-list__partner">{ix.partner}</span>
                      <span className={`severity-badge severity-badge--${severityClass(ix.severity)}`}>
                        {severityLabel(ix.severity)}
                      </span>
                    </div>
                    {ix.text && (
                      <p className="interaction-list__note interaction-list__note--full">{ix.text}</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="drug-modal__empty">Взаимодействия с другими препаратами не найдены.</p>
            )}
          </div>
        )}

        {tab === 'analogs' && (
          <div className="drug-modal__section">
            {analogsLoading && <p className="drug-modal__empty">Загрузка аналогов…</p>}
            {!analogsLoading && analogRows.length > 0 && (
              <div className="analog-list">
                {analogRows.map(a => (
                  <article key={a.id} className="analog-list__item">
                    <div className="analog-list__name">{a.name}</div>
                    {a.substances?.length ? (
                      <div className="analog-list__sub">{a.substances.join(', ')}</div>
                    ) : null}
                    <div className="analog-list__meta">
                      {a.confidence != null && (
                        <span className="analog-list__badge">Совпадение {a.confidence}%</span>
                      )}
                      {a.reason && <span className="analog-list__reason">{a.reason}</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
            {!analogsLoading && analogRows.length === 0 && (
              <p className="drug-modal__empty">Аналоги по МНН не найдены.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const DrugDetailModal = observer(() => {
  const drug = drugsStore.selectedDrug;
  const loading = drugsStore.detailLoading;

  if (!drug && !loading) return null;

  const onClose = () => drugsStore.clearSelectedDrug();

  return createPortal(
    <div className="drug-modal-overlay" onClick={onClose}>
      <div className="drug-modal-wrap" onClick={e => e.stopPropagation()}>
        {loading && !drug ? (
          <div className="drug-modal drug-modal--loading">
            <div className="spinner" />
            <p>Загрузка…</p>
          </div>
        ) : drug ? (
          <ModalBody drug={drug} onClose={onClose} />
        ) : null}
      </div>
    </div>,
    document.body,
  );
});
