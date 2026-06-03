
set -e
cd "$(dirname "$0")"

echo "[1/2] Парсинг источников (XML + HTML) → data/raw/drugs_raw.csv"
python src/parse_sources.py

echo "[2/2] Transform & Load → data/processed/ + Neo4j"
python src/run_etl.py

echo "✅ Полный пайплайн завершён"
