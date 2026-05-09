# Real ingestion step

Этот шаг приближает проект к архитектуре, описанной в дипломе.

## Что добавлено

- `infra/docker-compose.yml` для PostgreSQL, Neo4j и Adminer.
- SQL-инициализация таблиц `users`, `audit_logs`, `drug_imports`.
- `etl/src/parse_sources.py` для демонстрационного разбора GRLS XML и HTML-инструкции.
- `etl/src/run_full_ingestion.sh` для полного прогона ingestion-контура.
- API `/imports` и `/imports/run` для статусов и запуска импорта.
- API `/audit` для журнала аудита администратора.

## Почему это соответствует ВКР

В дипломе отдельно заданы ETL-пайплайн, гибридная база PostgreSQL + Neo4j, таблица `DrugImports` со статусами импорта, журнал аудита, а также административный интерфейс управления ETL и пользователями. Этот этап закрывает именно этот слой.

## Что делать дальше

1. Подключить реальный GRLS XML-фид вместо sample-файла.
2. Добавить парсер PDF/HTML инструкций из реальных источников.
3. Записывать результаты ETL не только в CSV и Cypher, но и напрямую в PostgreSQL и Neo4j.
4. Связать frontend admin-экран с `/imports` и `/audit`.
