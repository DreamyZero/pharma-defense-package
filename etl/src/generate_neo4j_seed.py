from pathlib import Path
import pandas as pd
ROOT = Path(__file__).resolve().parents[1]
processed = ROOT / 'data/processed'
d = pd.read_csv(processed / 'drugs.csv')
i = pd.read_csv(processed / 'indications.csv')
c = pd.read_csv(processed / 'contraindications.csv')
s = pd.read_csv(processed / 'synonyms.csv')
inter = pd.read_csv(processed / 'interactions.csv')
lines = ["MATCH (n) DETACH DELETE n;"]
for _, r in d.iterrows():
    lines.append(f"MERGE (drug:Drug {{drugId:{int(r['drug_id'])}, name:'{r['trade_name']}', atc:'{r['atc']}', slug:'{r['slug']}'}})")
    lines.append(f"MERGE (sub:Substance {{name:'{r['substance']}'}})")
    lines.append(f"MERGE (grp:Group {{name:'{r['group']}'}})")
    lines.append(f"MERGE (drug)-[:CONTAINS]->(sub)")
    lines.append(f"MERGE (drug)-[:BELONGS_TO]->(grp)")
for _, r in i.iterrows():
    lines.append(f"MATCH (drug:Drug {{drugId:{int(r['drug_id'])}}}) MERGE (ind:Indication {{name:'{r['indication']}'}}) MERGE (drug)-[:INDICATED_FOR]->(ind)")
for _, r in c.iterrows():
    lines.append(f"MATCH (drug:Drug {{drugId:{int(r['drug_id'])}}}) MERGE (con:Contraindication {{name:'{r['contraindication']}'}}) MERGE (drug)-[:HAS_CONTRAINDICATION]->(con)")
for _, r in s.iterrows():
    lines.append(f"MATCH (drug:Drug {{drugId:{int(r['drug_id'])}}}) MERGE (syn:Synonym {{name:'{r['synonym']}'}}) MERGE (syn)-[:REFERS_TO]->(drug)")
for _, r in inter.iterrows():
    lines.append(f"MATCH (drug:Drug {{drugId:{int(r['drug_id'])}}}), (other:Drug {{name:'{r['with_name']}'}}) MERGE (drug)-[:INTERACTS_WITH {{risk:'{r['risk_level']}', note:'{r['note']}'}}]->(other)")
out = ROOT / 'output/neo4j_seed.cypher'
out.write_text('\n'.join(lines), encoding='utf-8')
print('Cypher ready')
