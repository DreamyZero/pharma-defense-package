# Pharma Defense Package

Итоговый комплект для дипломной демонстрации системы семантической организации данных о лекарственных препаратах.

## Что внутри

- `infra/docker-compose.yml` — локальный запуск PostgreSQL, Neo4j и Adminer.
- `backend-nest/` — backend на NestJS с auth, drugs, imports, audit.
- `frontend-react/` — административный frontend на React/Vite.
- `etl/` — ingestion и ETL-контур для GRLS/XML и инструкций.
- `docs/` — материалы для защиты.
- `tests/` — smoke-проверки структуры проекта.
