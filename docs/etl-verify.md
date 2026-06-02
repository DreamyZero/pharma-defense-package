# Проверка работы ETL

## 0. Тестовый ETL с HTML-отчётом (для демонстрации)

```powershell
cd C:\Users\BoGuU\Desktop\pharma-defense-package
python etl/test_etl_demo.py
```

Скрипт по шагам запускает `parse_sources.py` и `run_etl.py`, печатает метрики в консоль и создаёт **`etl/output/demo_report.html`** — откройте файл в браузере, чтобы наглядно увидеть результат.

## 1. Локальный прогон пайплайна

```powershell
cd C:\Users\BoGuU\Desktop\pharma-defense-package\etl\src

# Парсинг (40 препаратов из drugs_catalog.json + HTML-инструкции)
python parse_sources.py

# Нормализация в data/processed/*.csv и etl_status.json
python run_etl.py
```

Ожидаемый вывод `run_etl.py`:

```json
{"drugs": 40, "indications": ..., "interactions": 40, ...}
```

Проверьте файлы:

- `etl/data/raw/drugs_raw.csv` — 40 строк
- `etl/data/processed/drugs.csv` — 40 строк
- `etl/output/etl_status.json` — `"status": "ok"`

## 2. Загрузка в PostgreSQL

```powershell
cd C:\Users\BoGuU\Desktop\pharma-defense-package\backend-nest
npx prisma db push
npx prisma db seed
```

В логе seed: `Загружено препаратов: 40`.

Проверка в БД (Adminer http://localhost:8080 или psql):

```sql
SELECT COUNT(*) FROM drugs;
SELECT COUNT(*) FROM drug_interactions;
```

## 3. API после ETL

Запустите backend, войдите как admin и проверьте:

| Запрос | Ожидание |
|--------|----------|
| `GET /drugs/catalog` | ровно 40 препаратов каталога (с рег. номером) |
| `GET /drugs/search?q=` | то же, что каталог при пустом `q` |
| `GET /drugs/аспирин` | карточка с описанием |
| `GET /analogs/Аспирин` | список аналогов |
| `POST /interactions/check` body `{"items":["Аспирин","Варфарин"]}` | риск HIGH |
| `GET /imports/status` | `etl_status.json` со status ok |
| `GET /imports` (ADMIN) | журнал импортов |
| `POST /imports/run` (ADMIN) | создание job |

Swagger: http://localhost:3000/api (если включён в main.ts).

## 4. Neo4j (опционально)

После seed выполняется sync в Neo4j. Граф: http://localhost:7474  
Логин: `neo4j` / `password12345`

Или вручную: `POST /graph/sync` (ADMIN).

## 5. Опционально: реальный ГРЛС

```powershell
python parse_sources.py --grls
```

Скачивает CSV с minzdrav.gov.ru в `etl/data/raw/drugs_grls.csv` (не заменяет демо-каталог в drugs_raw).
