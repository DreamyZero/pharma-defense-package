import csv
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'output'
RAW = ROOT / 'data/raw'
OUTPUT.mkdir(parents=True, exist_ok=True)


def map_rxnorm_severity(severity: str) -> str:
    s = str(severity or '').strip().lower()
    if s in ('high', 'major', 'severe'):
        return 'high'
    if s in ('moderate', 'medium'):
        return 'medium'
    return 'low'


def merge_rxnorm_interactions(raw: pd.DataFrame, interactions: list[dict]) -> int:
    rxnorm_path = RAW / 'interactions_rxnorm.csv'
    if not rxnorm_path.exists():
        return 0

    rx = pd.read_csv(rxnorm_path)
    if rx.empty:
        return 0

    name_to_id: dict[str, int] = {}
    for _, drug_row in raw.iterrows():
        trade = str(drug_row.get('trade_name', '')).strip()
        if trade:
            name_to_id[trade.lower()] = int(drug_row['drug_id'])

    seen: set[tuple[int, str]] = {
        (int(i['drug_id']), str(i['with_name']).strip().lower())
        for i in interactions
        if i.get('with_name')
    }
    added = 0

    for _, row in rx.iterrows():
        drug = str(row.get('drug', '')).strip()
        with_name = str(row.get('interacts_with', '')).strip()
        if not drug or not with_name:
            continue
        drug_id = name_to_id.get(drug.lower())
        if not drug_id:
            continue
        key = (drug_id, with_name.lower())
        if key in seen:
            continue
        interactions.append({
            'drug_id': drug_id,
            'with_name': with_name,
            'risk_level': map_rxnorm_severity(row.get('severity', '')),
            'note': str(row.get('description', '')).strip(),
            'source': 'rxnorm',
        })
        seen.add(key)
        added += 1

    return added

started_at = datetime.now(timezone.utc).isoformat()

try:
    raw = pd.read_csv(ROOT / 'data/raw/drugs_raw.csv')
except FileNotFoundError as e:
    status = {
        'status': 'failed',
        'error': str(e),
        'started_at': started_at,
        'finished_at': datetime.now(timezone.utc).isoformat(),
        'metrics': {},
    }
    (OUTPUT / 'etl_status.json').write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'ETL FAILED: {e}')
    raise

if 'trade_name' not in raw.columns:
    raw['trade_name'] = ''
raw['trade_name'] = raw['trade_name'].fillna('').astype(str).str.strip()
before_count = len(raw)
raw = raw[raw['trade_name'] != ''].copy()
if before_count > len(raw):
    print(f'  Пропущено {before_count - len(raw)} строк без trade_name')

raw['drug_id'] = range(1, len(raw) + 1)
raw['slug'] = raw['trade_name'].str.lower().str.replace(' ', '-', regex=False)

drugs = raw[
    [
        'drug_id', 'trade_name', 'substance', 'atc', 'group', 'slug',
        'manufacturer', 'form', 'registration_number', 'dosage_adult', 'dosage_children',
        'storage_conditions', 'shelf_life', 'dispensing_rule',
        'indications', 'contraindications', 'side_effects',
    ]
].copy()
indications = []
contra = []
side = []
analogs = []
interactions = []
synonyms = []

for _, row in raw.iterrows():
    for x in str(row['indications']).split(';'):
        indications.append({'drug_id': row['drug_id'], 'indication': x.strip()})
    for x in str(row['contraindications']).split(';'):
        contra.append({'drug_id': row['drug_id'], 'contraindication': x.strip()})
    for x in str(row['side_effects']).split(';'):
        side.append({'drug_id': row['drug_id'], 'side_effect': x.strip()})
    for x in str(row['analogs']).split(';'):
        analogs.append({'drug_id': row['drug_id'], 'analog_name': x.strip()})
    for x in str(row['synonyms']).split(';'):
        synonyms.append({'drug_id': row['drug_id'], 'synonym': x.strip().lower()})
    interactions.append({
        'drug_id': row['drug_id'],
        'with_name': row['interacts_with'],
        'risk_level': row['risk_level'],
        'note': row['interaction_note'],
        'source': 'catalog',
    })

rxnorm_added = merge_rxnorm_interactions(raw, interactions)

processed = ROOT / 'data/processed'
processed.mkdir(parents=True, exist_ok=True)

_csv_kw = dict(index=False, quoting=csv.QUOTE_NONNUMERIC)
drugs.to_csv(processed / 'drugs.csv', **_csv_kw)
pd.DataFrame(indications).to_csv(processed / 'indications.csv', **_csv_kw)
pd.DataFrame(contra).to_csv(processed / 'contraindications.csv', **_csv_kw)
pd.DataFrame(side).to_csv(processed / 'side_effects.csv', **_csv_kw)
pd.DataFrame(analogs).to_csv(processed / 'analogs.csv', **_csv_kw)
pd.DataFrame(interactions).to_csv(processed / 'interactions.csv', **_csv_kw)
pd.DataFrame(synonyms).to_csv(processed / 'synonyms.csv', **_csv_kw)

metrics = {
    'drugs': int(len(drugs)),
    'indications': int(len(indications)),
    'contraindications': int(len(contra)),
    'side_effects': int(len(side)),
    'analogs': int(len(analogs)),
    'interactions': int(len(interactions)),
    'synonyms': int(len(synonyms)),
}

report_rows = [{'metric': k, 'value': v} for k, v in metrics.items()]
pd.DataFrame(report_rows).to_csv(OUTPUT / 'etl_report.csv', index=False)

finished_at = datetime.now(timezone.utc).isoformat()
sources = ['data/raw/drugs_raw.csv']
if (RAW / 'drugs_grls.csv').exists():
    sources.append('data/raw/drugs_grls.csv')
if rxnorm_added > 0:
    sources.append('data/raw/interactions_rxnorm.csv')
status = {
    'status': 'ok',
    'started_at': started_at,
    'finished_at': finished_at,
    'source_file': ' + '.join(sources),
    'metrics': metrics,
    'rxnorm_interactions_added': rxnorm_added,
}
(OUTPUT / 'etl_status.json').write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding='utf-8')

samples_path = ROOT / 'data' / 'samples' / 'drugs_catalog.json'
samples = json.loads(samples_path.read_text(encoding='utf-8'))[:8] if samples_path.exists() else []
metric_labels = {
    'drugs': 'Препараты',
    'indications': 'Показания',
    'contraindications': 'Противопоказания',
    'side_effects': 'Побочные эффекты',
    'analogs': 'Аналоги',
    'interactions': 'Взаимодействия',
    'synonyms': 'Синонимы',
}
cards = ''.join(
    f'<article class="drug"><h3>{d.get("trade_name","")}</h3>'
    f'<p><b>МНН:</b> {d.get("substance","")}</p>'
    f'<p><b>АТХ:</b> {d.get("atc","")} · <b>Группа:</b> {d.get("group","")}</p>'
    f'<p><b>Дозировка:</b> {d.get("dosage_adult","")}</p>'
    f'<p><b>Показания:</b> {d.get("indications","")}</p></article>'
    for d in samples
)
metric_html = ''.join(
    f'<div class="metric"><b>{v}</b>{metric_labels.get(k, k)}</div>' for k, v in metrics.items()
)
html_report = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>PharmaBase — отчёт ETL</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }}
    h1 {{ color: #38bdf8; }}
    .status {{ padding: 1rem 1.25rem; border-radius: 12px; background: #14532d; }}
    .metrics {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin: 1.5rem 0; }}
    .metric {{ background: #1e293b; padding: 1rem; border-radius: 10px; text-align: center; }}
    .metric b {{ font-size: 1.5rem; display: block; color: #38bdf8; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }}
    .drug {{ background: #1e293b; padding: 1rem; border-radius: 10px; border-left: 4px solid #38bdf8; }}
  </style>
</head>
<body>
  <h1>Отчёт ETL PharmaBase</h1>
  <p>Завершён: {finished_at}</p>
  <p>Источник: {status['source_file']}</p>
  <div class="status">Статус пайплайна: <strong>ok</strong></div>
  <div class="metrics">{metric_html}</div>
  <h2>Примеры из каталога</h2>
  <div class="grid">{cards}</div>
</body>
</html>"""
(OUTPUT / 'demo_report.html').write_text(html_report, encoding='utf-8')

print('ETL done')
print(json.dumps(metrics, ensure_ascii=False))
