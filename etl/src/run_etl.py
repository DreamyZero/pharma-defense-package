import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'output'
OUTPUT.mkdir(parents=True, exist_ok=True)

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

raw['drug_id'] = range(1, len(raw) + 1)
raw['slug'] = raw['trade_name'].str.lower().str.replace(' ', '-', regex=False)

drugs = raw[['drug_id', 'trade_name', 'substance', 'atc', 'group', 'slug']].copy()
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
    })

processed = ROOT / 'data/processed'
processed.mkdir(parents=True, exist_ok=True)

drugs.to_csv(processed / 'drugs.csv', index=False)
pd.DataFrame(indications).to_csv(processed / 'indications.csv', index=False)
pd.DataFrame(contra).to_csv(processed / 'contraindications.csv', index=False)
pd.DataFrame(side).to_csv(processed / 'side_effects.csv', index=False)
pd.DataFrame(analogs).to_csv(processed / 'analogs.csv', index=False)
pd.DataFrame(interactions).to_csv(processed / 'interactions.csv', index=False)
pd.DataFrame(synonyms).to_csv(processed / 'synonyms.csv', index=False)

metrics = {
    'drugs': int(len(drugs)),
    'indications': int(len(indications)),
    'contraindications': int(len(contra)),
    'side_effects': int(len(side)),
    'analogs': int(len(analogs)),
    'interactions': int(len(interactions)),
    'synonyms': int(len(synonyms)),
}

# CSV отчёт (для обратной совместимости)
report_rows = [{'metric': k, 'value': v} for k, v in metrics.items()]
pd.DataFrame(report_rows).to_csv(OUTPUT / 'etl_report.csv', index=False)

# JSON-статус — машиночитаемый, читается /api/imports/status
finished_at = datetime.now(timezone.utc).isoformat()
status = {
    'status': 'ok',
    'started_at': started_at,
    'finished_at': finished_at,
    'source_file': 'data/raw/drugs_raw.csv',
    'metrics': metrics,
}
(OUTPUT / 'etl_status.json').write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding='utf-8')

print('ETL done')
print(json.dumps(metrics, ensure_ascii=False))
