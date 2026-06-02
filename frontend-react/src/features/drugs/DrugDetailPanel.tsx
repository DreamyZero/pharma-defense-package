import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { drugsStore, type DrugDetail } from '../../stores/drugs.store';

type Tab = 'info' | 'contra' | 'interactions' | 'analogs';

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: 'info', label: 'Сведения', short: 'Сведения' },
  { id: 'contra', label: 'Противопоказания', short: 'Противоп.' },
  { id: 'interactions', label: 'Взаимодействия', short: 'Взаимод.' },
  { id: 'analogs', label: 'Аналоги', short: 'Аналоги' },
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

type AnalogRow = {
  id: number;
  name: string;
  substances?: string[];
  confidence?: number;
  reason?: string;
};

function DrugDetailContent({ drug }: { drug: DrugDetail }) {
  const [tab, setTab] = useState<Tab>('info');
  const [analogRows, setAnalogRows] = useState<AnalogRow[]>([]);
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
      const list = drugsStore.analogs?.analogs || [];
      setAnalogRows(list);
      setAnalogsLoading(false);
    });
  }, [tab, drug.slug, drug.name, drug.analogsFrom]);

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

  const inn = drug.substances?.map(s => s.substance.name).join(', ');

  return (
    <>
      <header className="drug-detail-hero">
        <button
          type="button"
          className="close-btn close-btn--mobile"
          onClick={() => drugsStore.clearSelectedDrug()}
          aria-label="Закрыть"
        >
          ✕
        </button>
        <div className="drug-detail-hero__top">
          <div className="drug-detail-hero__icon" aria-hidden>💊</div>
          <div>
            <h2 className="drug-detail-hero__name">{drug.name}</h2>
            {inn && <p className="drug-detail-hero__inn">{inn}</p>}
            {drug.dosageForm && (
              <p className="drug-detail-hero__meta">{drug.dosageForm}</p>
            )}
          </div>
        </div>
        <div className="drug-detail-hero__tags">
          {drug.atcCode && <span className="drug-detail-hero__tag">{drug.atcCode}</span>}
          {drug.pharmacologicalGroup && (
            <span className="drug-detail-hero__tag">{drug.pharmacologicalGroup}</span>
          )}
        </div>
      </header>

      <nav className="tabs-bar tabs-bar--sticky" aria-label="Разделы карточки">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-btn__full">{t.label}</span>
            <span className="tab-btn__short">{t.short}</span>
          </button>
        ))}
      </nav>

      <div className="drug-detail-content">
        {tab === 'info' && (
          <section className="detail-section">
            {drug.description ? (
              <p className="detail-text">{drug.description}</p>
            ) : (
              <p className="detail-empty">Описание не заполнено в справочнике.</p>
            )}
          </section>
        )}

        {tab === 'contra' && (
          <section className="detail-section">
            {drug.contraindications && drug.contraindications.length > 0 ? (
              <ul className="detail-list">
                {drug.contraindications.map((c, i) => (
                  <li key={i} className="detail-list__item detail-list__item--warn">
                    <span className="detail-list__marker" aria-hidden>!</span>
                    <span>{c.condition}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="detail-empty">Противопоказания не указаны.</p>
            )}
          </section>
        )}

        {tab === 'interactions' && (
          <section className="detail-section">
            {interactions.length > 0 ? (
              <div className="interaction-list">
                {interactions.map(ix => (
                  <div key={ix.key} className="interaction-list__item">
                    <div className="interaction-list__head">
                      <span className="interaction-list__partner">{ix.partner}</span>
                      <span className={`severity-badge severity-badge--${severityClass(ix.severity)}`}>
                        {severityLabel(ix.severity)}
                      </span>
                    </div>
                    {ix.text && <p className="interaction-list__note">{ix.text}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="detail-empty">Известных взаимодействий с другими препаратами нет.</p>
            )}
          </section>
        )}

        {tab === 'analogs' && (
          <section className="detail-section">
            {analogsLoading && <p className="detail-loading">Загрузка аналогов…</p>}
            {!analogsLoading && analogRows.length > 0 && (
              <div className="analog-list">
                {analogRows.map(a => (
                  <div key={a.id} className="analog-list__item">
                    <div className="analog-list__name">{a.name}</div>
                    {a.substances && a.substances.length > 0 && (
                      <div className="analog-list__sub">{a.substances.join(', ')}</div>
                    )}
                    <div className="analog-list__meta">
                      {a.confidence != null && (
                        <span className="analog-list__badge">Совпадение {a.confidence}%</span>
                      )}
                      {a.reason && <span className="analog-list__reason">{a.reason}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!analogsLoading && analogRows.length === 0 && (
              <p className="detail-empty">Аналоги по действующему веществу не найдены.</p>
            )}
          </section>
        )}
      </div>
    </>
  );
}

export const DrugDetailPanel = observer(() => {
  const drug = drugsStore.selectedDrug;
  const loading = drugsStore.detailLoading;

  if (!drug && !loading) {
    return (
      <div className="catalog-detail catalog-detail--empty">
        <div className="catalog-detail__placeholder">
          <span className="catalog-detail__placeholder-icon" aria-hidden>💊</span>
          <h3>Выберите препарат</h3>
          <p>Нажмите на карточку в списке слева, чтобы открыть сведения, взаимодействия и аналоги.</p>
        </div>
      </div>
    );
  }

  if (loading && !drug) {
    return (
      <div className="catalog-detail catalog-detail--empty">
        <div className="catalog-detail__placeholder">
          <div className="spinner" />
          <p>Загрузка карточки…</p>
        </div>
      </div>
    );
  }

  if (!drug) return null;

  return (
    <div className="catalog-detail">
      <DrugDetailContent drug={drug} />
    </div>
  );
});
