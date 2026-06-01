from pathlib import Path
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
