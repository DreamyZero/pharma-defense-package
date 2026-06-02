import { useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Icon } from '../../components/Icon';
import { drugsStore } from '../../stores/drugs.store';
import { DrugCard } from '../../features/drugs/DrugCard';
import { DrugDetailModal } from '../../features/drugs/DrugDetailModal';

export const SearchPage = observer(() => {
  useEffect(() => {
    drugsStore.loadCatalog();
  }, []);

  const onSearchChange = useCallback((value: string) => {
    drugsStore.setSearchQuery(value);
    if (value.trim().length >= 2) {
      drugsStore.refreshCatalogFromApi();
    }
  }, []);

  const showAll = useCallback(() => {
    drugsStore.showAllDrugs();
  }, []);

  const visible = drugsStore.visibleDrugs;
  const total = drugsStore.catalog.length;
  const q = drugsStore.searchQuery.trim();

  return (
    <div className="catalog-page">
      <header className="catalog-page__header catalog-page__header--rich">
        <div className="catalog-page__header-icon">
          <Icon name="pill" size={28} />
        </div>
        <div>
          <h1 className="page-title">Справочник препаратов</h1>
          <p className="catalog-page__subtitle">
            {q
              ? `Показано ${visible.length} из ${total} — нажмите карточку для полного описания`
              : `Каталог: ${total} препаратов с полной инструкцией — выберите карточку`}
          </p>
        </div>
      </header>

      {drugsStore.error && (
        <p className="catalog-page__api-warn text-muted text-sm" role="status">
          {drugsStore.error}
        </p>
      )}

      <div className="catalog-toolbar">
        <div className="catalog-search">
          <Icon name="search" size={20} className="catalog-search__icon-el" />
          <input
            className="catalog-search__input"
            type="search"
            placeholder="Название, МНН, АТХ, показание…"
            value={drugsStore.searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            aria-label="Поиск препарата"
          />
          {q && (
            <button
              type="button"
              className="catalog-search__clear"
              onClick={showAll}
              aria-label="Очистить поиск"
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
        {!q && total > 0 && (
          <div className="catalog-stats-pill">
            <Icon name="database" size={16} />
            <span>{total} в каталоге</span>
          </div>
        )}
      </div>

      <section className="catalog-list-full" aria-label="Список препаратов">
        {drugsStore.catalogLoading && visible.length === 0 && (
          <div className="catalog-list__loading">
            <div className="spinner" />
            <span>Загрузка каталога…</span>
          </div>
        )}

        {visible.length > 0 && drugsStore.catalogLoading && (
          <p className="catalog-page__refresh-hint text-muted text-xs">
            Обновление данных с сервера…
          </p>
        )}

        {q.length > 0 && visible.length === 0 && !drugsStore.catalogLoading && (
          <div className="catalog-list__empty">
            <Icon name="search" size={40} />
            <p>По запросу «{q}» ничего не найдено</p>
            <button type="button" className="btn-primary" onClick={showAll}>
              Показать все препараты
            </button>
          </div>
        )}

        {!q && drugsStore.catalogLoaded && total === 0 && !drugsStore.catalogLoading && (
          <div className="catalog-list__empty">
            <Icon name="database" size={40} />
            <p>Каталог пуст. Проверьте backend и выполните seed.</p>
            <button type="button" className="btn-primary" onClick={() => drugsStore.loadCatalog(true)}>
              Загрузить каталог
            </button>
          </div>
        )}

        <div className={`catalog-grid${visible.length === 1 ? ' catalog-grid--single' : ''}`}>
          {visible.map(d => (
            <DrugCard
              key={d.id}
              drug={d}
              selected={drugsStore.selectedSlug === d.slug}
              onSelect={slug => drugsStore.selectDrug(slug)}
            />
          ))}
        </div>
      </section>

      <DrugDetailModal />
    </div>
  );
});
