import requests, time, pandas as pd
from pathlib import Path
<<<<<<< HEAD

OUT = Path(__file__).resolve().parents[1] / "data/raw"
OUT.mkdir(parents=True, exist_ok=True)

GRLS_URL = (
    "https://minzdrav.gov.ru/opendata/7707778246-grls/"
    "data-20170301T0000-structure-20151217T0000.csv"
)
print("Загружаю ГРЛС...")
grls = pd.read_csv(GRLS_URL, encoding="utf-8-sig")
grls.columns = [c.strip() for c in grls.columns]
grls.to_csv(OUT / "drugs_grls.csv", index=False)
print(f"  ГРЛС: {len(grls)} записей")

def rxnorm_interactions(trade_name: str) -> list:
    """Возвращает список взаимодействий для препарата по названию."""
    try:
        # Шаг 1: получить RxCUI
        r = requests.get(
            "https://rxnav.nlm.nih.gov/REST/rxcui.json",
            params={"name": trade_name, "search": 1}, timeout=8
        )
        cui = r.json().get("idGroup", {}).get("rxnormId", [None])[0]
        if not cui:
            return []

        r2 = requests.get(
            f"https://rxnav.nlm.nih.gov/REST/interaction/interaction.json",
            params={"rxcui": cui}, timeout=8
        )
        groups = r2.json().get("interactionTypeGroup", [])
        result = []
        for g in groups:
            for t in g.get("interactionType", []):
                for pair in t.get("interactionPair", []):
                    result.append({
                        "drug": trade_name,
                        "interacts_with": pair["interactionConcept"][1]["minConceptItem"]["name"],
                        "severity": pair.get("severity", "unknown"),
                        "description": pair.get("description", ""),
                    })
        return result
    except Exception:
        return []

sample = grls["trade_name"].dropna().head(50).tolist()  
interactions = []
for name in sample:
    ix = rxnorm_interactions(name)
    interactions.extend(ix)
    time.sleep(0.3)  

pd.DataFrame(interactions).to_csv(OUT / "interactions_rxnorm.csv", index=False)
print(f"  Взаимодействия: {len(interactions)} пар")
print("parse_sources.py завершён")
=======
from bs4 import BeautifulSoup
import pandas as pd
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
samples = ROOT / 'data/samples'
out = ROOT / 'data/raw'
out.mkdir(parents=True, exist_ok=True)

# --- Extract: XML (ГРЛС) ---
xml_root = ET.parse(samples / 'grls_sample.xml').getroot()
rows = []
for drug in xml_root.findall('drug'):
    rows.append({
        'trade_name':       drug.findtext('name', '').strip(),
        'substance':        drug.findtext('substance', '').strip(),
        'atc':              drug.findtext('atc', '').strip(),
        'group':            drug.findtext('group', '').strip(),
        'registration_number': drug.findtext('registrationNumber', '').strip(),
        'manufacturer':     drug.findtext('manufacturer', '').strip(),
        'form':             drug.findtext('form', '').strip(),
        'dosage_adult':     drug.findtext('dosageAdult', '').strip(),
        'dosage_children':  drug.findtext('dosageChildren', '').strip(),
        'storage_conditions': drug.findtext('storageConditions', '').strip(),
        'shelf_life':       drug.findtext('shelfLife', '').strip(),
        'dispensing_rule':  drug.findtext('dispensingRule', '').strip(),
        'indications':      ';'.join(
            [i.text.strip() for i in drug.findall('./indications/item') if i.text]
        ),
        'contraindications': '',
        'side_effects':     '',
        'analogs':          '',
        'interacts_with':   '',
        'risk_level':       '',
        'interaction_note': '',
        'synonyms':         '',
    })

# --- Extract: HTML-инструкции (парсинг по trade_name) ---
html_text = (samples / 'instruction_sample.html').read_text(encoding='utf-8')
html = BeautifulSoup(html_text, 'html.parser')

for article in html.select('article.instruction'):
    name_tag = article.select_one('h1')
    if not name_tag:
        continue
    name = name_tag.get_text(strip=True)

    def _block(key):
        el = article.select_one(f'[data-block="{key}"]')
        return el.get_text(' ', strip=True) if el else ''

    interaction_raw = _block('interactions').split('|')

    for row in rows:
        if row['trade_name'] == name:
            row['contraindications'] = _block('contraindications')
            row['side_effects']      = _block('side-effects')
            row['analogs']           = _block('analogs')
            row['synonyms']          = _block('synonyms')
            if len(interaction_raw) == 3:
                row['interacts_with']   = interaction_raw[0].strip()
                row['risk_level']       = interaction_raw[1].strip()
                row['interaction_note'] = interaction_raw[2].strip()

# --- Load: сохраняем единым CSV для run_etl.py ---
output_path = out / 'drugs_raw.csv'
pd.DataFrame(rows).to_csv(output_path, index=False, encoding='utf-8')
print(f'parse_sources done → {output_path} ({len(rows)} drugs)')
>>>>>>> 0b7f3acf52e803ba104ca373313bf8eb1430fd6a
