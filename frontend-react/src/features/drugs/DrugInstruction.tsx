import type { ReactNode } from 'react';
import type { InstructionMeta } from '../../stores/drugs.store';

type Props = {
  description?: string;
  instructionMeta?: InstructionMeta | null;
  registrationNumber?: string | null;
  manufacturer?: string | null;
  compact?: boolean;
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <section className="instruction-block">
      <h4 className="instruction-block__title">{title}</h4>
      <div className="instruction-block__body">{children}</div>
    </section>
  );
}

export function DrugInstruction({
  description,
  instructionMeta,
  registrationNumber,
  manufacturer,
  compact = false,
}: Props) {
  const meta = instructionMeta || {};
  const hasStructured =
    meta.indicationsList?.length ||
    meta.contraindicationsList?.length ||
    meta.sideEffects?.length ||
    meta.dosageAdult ||
    meta.dosageChildren ||
    meta.storageConditions ||
    meta.shelfLife;

  if (!hasStructured && !description && !registrationNumber && !manufacturer) {
    return <p className="drug-modal__empty">Инструкция не заполнена в справочнике.</p>;
  }

  const dispensingLabel =
    meta.dispensingRule === 'prescription'
      ? 'По рецепту'
      : meta.dispensingRule === 'otc'
        ? 'Без рецепта'
        : meta.dispensingRule;

  return (
    <div className={`instruction-view${compact ? ' instruction-view--compact' : ''}`}>
      {(registrationNumber || manufacturer) && (
        <dl className="instruction-meta-grid">
          {registrationNumber && (
            <>
              <dt>Рег. №</dt>
              <dd>{registrationNumber}</dd>
            </>
          )}
          {manufacturer && (
            <>
              <dt>Производитель</dt>
              <dd>{manufacturer}</dd>
            </>
          )}
          {dispensingLabel && (
            <>
              <dt>Отпуск</dt>
              <dd>{dispensingLabel}</dd>
            </>
          )}
        </dl>
      )}

      <Block title="Показания к применению">
        {meta.indicationsList?.length ? (
          <ul className="instruction-list">
            {meta.indicationsList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : null}
      </Block>

      <Block title="Противопоказания">
        {meta.contraindicationsList?.length ? (
          <ul className="instruction-list instruction-list--warn">
            {meta.contraindicationsList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : null}
      </Block>

      <Block title="Побочные действия">
        {meta.sideEffects?.length ? (
          <ul className="instruction-list">
            {meta.sideEffects.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : null}
      </Block>

      <Block title="Дозировка">
        {(meta.dosageAdult || meta.dosageChildren) && (
          <div className="instruction-dosage">
            {meta.dosageAdult && <p><strong>Взрослые:</strong> {meta.dosageAdult}</p>}
            {meta.dosageChildren && <p><strong>Дети:</strong> {meta.dosageChildren}</p>}
          </div>
        )}
      </Block>

      <Block title="Хранение">
        {(meta.storageConditions || meta.shelfLife) && (
          <div className="instruction-storage">
            {meta.storageConditions && <p>{meta.storageConditions}</p>}
            {meta.shelfLife && <p className="text-muted text-xs">Срок годности: {meta.shelfLife}</p>}
          </div>
        )}
      </Block>

      {!hasStructured && description && (
        <p className="drug-modal__description">{description}</p>
      )}
    </div>
  );
}
