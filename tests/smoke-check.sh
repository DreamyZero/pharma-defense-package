#!/usr/bin/env bash
set -e
[ -f README.md ]
[ -f infra/docker-compose.yml ]
[ -f backend-nest/sql/001_init.sql ]
[ -f etl/src/run_full_ingestion.sh ]
[ -f frontend-react/src/pages/Admin/AdminPage.tsx ]
[ -f docs/demo-script.md ]
[ -f docs/checklist-defense.md ]
[ -f docs/test-users.md ]
echo "Smoke check OK"
