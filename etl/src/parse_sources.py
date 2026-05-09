from pathlib import Path
from bs4 import BeautifulSoup
import pandas as pd
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
samples = ROOT / 'data/samples'
out = ROOT / 'data/raw'
out.mkdir(parents=True, exist_ok=True)
xml_root = ET.parse(samples / 'grls_sample.xml').getroot()
rows = []
for drug in xml_root.findall('drug'):
    rows.append({
        'trade_name': drug.findtext('name','').strip(),
        'substance': drug.findtext('substance','').strip(),
        'atc': drug.findtext('atc','').strip(),
        'group': drug.findtext('group','').strip(),
        'indications': ';'.join([i.text.strip() for i in drug.findall('./indications/item') if i.text]),
        'contraindications': '',
        'side_effects': '',
        'analogs': '',
        'interacts_with': '',
        'risk_level': 'low',
        'interaction_note': '',
        'synonyms': ''
    })
html = BeautifulSoup((samples / 'instruction_sample.html').read_text(encoding='utf-8'), 'html.parser')
article = html.select_one('article.instruction')
name = article.select_one('h1').get_text(strip=True)
for row in rows:
    if row['trade_name'] == name:
        row['contraindications'] = article.select_one('[data-block="contraindications"]').get_text(' ', strip=True)
        row['side_effects'] = article.select_one('[data-block="side-effects"]').get_text(' ', strip=True)
        interaction = article.select_one('[data-block="interactions"]').get_text(' ', strip=True).split('|')
        row['interacts_with'] = interaction[0].strip()
        row['risk_level'] = interaction[1].strip()
        row['interaction_note'] = interaction[2].strip()
        row['analogs'] = article.select_one('[data-block="analogs"]').get_text(' ', strip=True)
        row['synonyms'] = article.select_one('[data-block="synonyms"]').get_text(' ', strip=True)
pd.DataFrame(rows).to_csv(out / 'grls_instructions_merged.csv', index=False)
print('sources parsed')
