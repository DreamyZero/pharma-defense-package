import { Icon } from '../../components/Icon';
import type { DrugResult, InstructionMeta } from '../../stores/drugs.store';

type Props = {
  drug: DrugResult;
  selected?: boolean;
  onSelect: (slug: string) => void;
};

function dispensingLabel(rule?: string) {
  if (rule === 'prescription') return 'По рецепту';
  if (rule === 'otc') return 'Без рецепта';
  return rule || '—';
}

function SpecRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="drug-spec-row">
      <span className="drug-spec-row__label">{label}</span>
      <span className="drug-spec-row__value">{value}</span>
    </div>
  );
}

function ChipList({ items, tone }: { items: string[]; tone?: 'warn' | 'soft' }) {
  if (!items.length) return null;
  return (
    <ul className={`drug-spec-chips drug-spec-chips--${tone || 'soft'}`}>
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function DrugCard({ drug, selected, onSelect }: Props) {
  const inn = drug.substances?.map(s => s.substance.name).filter(Boolean).join(', ');
  const meta = (drug.instructionMeta || {}) as InstructionMeta;
  const indications =
    meta.indicationsList?.length
      ? meta.indicationsList
      : (drug.indications || []).map(i => i.name);
  const contra = meta.contraindicationsList || [];
  const sideFx = meta.sideEffects || [];

  return (
    <article
      className={`drug-card-rich${selected ? ' drug-card-rich--selected' : ''}`}
      onClick={() => drug.slug && onSelect(drug.slug)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' && drug.slug) onSelect(drug.slug);
      }}
    >
      <header className="drug-card-rich__header">
        <div className="drug-card-rich__icon">
          <Icon name="pill" size={22} />
        </div>
        <div className="drug-card-rich__titles">
          <h3 className="drug-card-rich__name">{drug.name}</h3>
          {inn && <p className="drug-card-rich__inn">{inn}</p>}
          <div className="drug-card-rich__badges">
            {drug.atcCode && <span className="drug-badge drug-badge--atc">{drug.atcCode}</span>}
            {drug.pharmacologicalGroup && (
              <span className="drug-badge">{drug.pharmacologicalGroup}</span>
            )}
            {drug.dosageForm && <span className="drug-badge drug-badge--muted">{drug.dosageForm}</span>}
          </div>
        </div>
      </header>

      <dl className="drug-card-rich__facts">
        <SpecRow label="Рег. №" value={drug.registrationNumber} />
        <SpecRow label="Производитель" value={drug.manufacturer} />
        <SpecRow label="Отпуск" value={dispensingLabel(meta.dispensingRule)} />
        <SpecRow label="Дозировка (взрослые)" value={meta.dosageAdult} />
        <SpecRow label="Дозировка (дети)" value={meta.dosageChildren} />
        <SpecRow label="Хранение" value={meta.storageConditions} />
        <SpecRow label="Срок годности" value={meta.shelfLife} />
      </dl>

      {indications.length > 0 && (
        <section className="drug-card-rich__section">
          <h4 className="drug-card-rich__section-title">Показания</h4>
          <ChipList items={indications} />
        </section>
      )}

      {contra.length > 0 && (
        <section className="drug-card-rich__section">
          <h4 className="drug-card-rich__section-title drug-card-rich__section-title--warn">Противопоказания</h4>
          <ChipList items={contra} tone="warn" />
        </section>
      )}

      {sideFx.length > 0 && (
        <section className="drug-card-rich__section">
          <h4 className="drug-card-rich__section-title">Побочные действия</h4>
          <ChipList items={sideFx} />
        </section>
      )}

      <footer className="drug-card-rich__footer">
        <span>Открыть полную инструкцию</span>
        <Icon name="layers" size={16} />
      </footer>
    </article>
  );
}
