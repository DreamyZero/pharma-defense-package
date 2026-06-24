import type { EtlReport } from '../../entities/imports/api';
import { saveEtlReportHtml } from '../../entities/imports/api';

type Props = {
  report: EtlReport;
  htmlPreview: string | null;
  onClose: () => void;
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU');
  } catch {
    return iso;
  }
}

export function EtlReportModal({ report, htmlPreview, onClose }: Props) {
  const status = report.status.status;

  return (
    <div className="admin-etl-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-etl-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="etl-report-title"
      >
        <header className="admin-etl-modal__head">
          <div>
            <h2 id="etl-report-title">Отчёт ETL</h2>
            <p className="admin-etl-modal__sub">
              {report.status.source_file ?? 'Источник не указан'} · {formatDate(report.finishedAt)}
            </p>
          </div>
          <button type="button" className="admin-etl-modal__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="admin-etl-modal__body">
          <div className={`admin-etl-status admin-etl-status--${status}`}>
            Статус: {status === 'ok' ? 'Успешно' : status === 'failed' ? 'Ошибка' : 'Не запускался'}
          </div>

          {report.status.error && (
            <div className="admin-msg admin-msg--err">{report.status.error}</div>
          )}

          {report.metrics.length > 0 && (
            <div className="admin-etl-metrics">
              {report.metrics.map((m, i) => (
                <div key={m.key} className="admin-etl-metrics__item" data-accent={i % 4}>
                  <span className="admin-etl-metrics__value">{m.value.toLocaleString('ru')}</span>
                  <span className="admin-etl-metrics__label">{m.label}</span>
                </div>
              ))}
            </div>
          )}

          {htmlPreview ? (
            <div className="admin-etl-preview-wrap">
              <div className="admin-etl-preview-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => saveEtlReportHtml().catch(() => {})}
                >
                  Скачать HTML
                </button>
              </div>
              <iframe
                className="admin-etl-preview"
                title="HTML-отчёт ETL"
                sandbox="allow-same-origin"
                srcDoc={htmlPreview}
              />
            </div>
          ) : (
            <p className="admin-etl-preview-empty">
              HTML-превью недоступно. Нажмите «HTML» или «Показать отчёт» для загрузки.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
