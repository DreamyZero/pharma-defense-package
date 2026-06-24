
set -e
cd "$(dirname "$0")"

echo "[1/3] Парсинг (каталог + ГРЛС + RxNorm) → data/raw/drugs_raw.csv"
python src/parse_sources.py --grls --rxnorm

echo "[2/3] Transform → data/processed/ + output/"
python src/run_etl.py

echo "✅ Полный пайплайн завершён"
