from pathlib import Path
import pandas as pd
ROOT = Path(__file__).resolve().parents[1]
raw = pd.read_csv(ROOT / 'data/raw/drugs_raw.csv')
raw['drug_id'] = range(1, len(raw)+1)
raw['slug'] = raw['trade_name'].str.lower().str.replace(' ', '-', regex=False)

drugs = raw[['drug_id','trade_name','substance','atc','group','slug']].copy()
indications = []
contra = []
side = []
analogs = []
interactions = []
synonyms = []
for _, row in raw.iterrows():
    for x in str(row['indications']).split(';'):
        indications.append({'drug_id':row['drug_id'],'indication':x.strip()})
    for x in str(row['contraindications']).split(';'):
        contra.append({'drug_id':row['drug_id'],'contraindication':x.strip()})
    for x in str(row['side_effects']).split(';'):
        side.append({'drug_id':row['drug_id'],'side_effect':x.strip()})
    for x in str(row['analogs']).split(';'):
        analogs.append({'drug_id':row['drug_id'],'analog_name':x.strip()})
    for x in str(row['synonyms']).split(';'):
        synonyms.append({'drug_id':row['drug_id'],'synonym':x.strip().lower()})
    interactions.append({'drug_id':row['drug_id'],'with_name':row['interacts_with'],'risk_level':row['risk_level'],'note':row['interaction_note']})
processed = ROOT / 'data/processed'
processed.mkdir(parents=True, exist_ok=True)
drugs.to_csv(processed / 'drugs.csv', index=False)
pd.DataFrame(indications).to_csv(processed / 'indications.csv', index=False)
pd.DataFrame(contra).to_csv(processed / 'contraindications.csv', index=False)
pd.DataFrame(side).to_csv(processed / 'side_effects.csv', index=False)
pd.DataFrame(analogs).to_csv(processed / 'analogs.csv', index=False)
pd.DataFrame(interactions).to_csv(processed / 'interactions.csv', index=False)
pd.DataFrame(synonyms).to_csv(processed / 'synonyms.csv', index=False)
report = pd.DataFrame([
    {'metric':'drugs', 'value':len(drugs)},
    {'metric':'indications', 'value':len(indications)},
    {'metric':'contraindications', 'value':len(contra)},
    {'metric':'side_effects', 'value':len(side)},
    {'metric':'analogs', 'value':len(analogs)},
    {'metric':'interactions', 'value':len(interactions)},
    {'metric':'synonyms', 'value':len(synonyms)}
])
report.to_csv(ROOT / 'output/etl_report.csv', index=False)
print('ETL done')
