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
    name = str(r['trade_name']).replace("'", "\\'")
    sub  = str(r['substance']).replace("'", "\\'")
    grp  = str(r['group']).replace("'", "\\'")
    atc  = str(r['atc'])
    slug = str(r['slug'])
    did  = int(r['drug_id'])
    lines.append(f"MERGE (d{did}:Drug {{drugId:{did}, name:'{name}', atc:'{atc}', slug:'{slug}'}});")
    lines.append(f"MERGE (sub{did}:Substance {{name:'{sub}'}});")
    lines.append(f"MERGE (grp{did}:Group {{name:'{grp}'}});")
    lines.append(f"MATCH (d{did}:Drug {{drugId:{did}}}), (sub{did}:Substance {{name:'{sub}'}}) MERGE (d{did})-[:CONTAINS]->(sub{did});")
    lines.append(f"MATCH (d{did}:Drug {{drugId:{did}}}), (grp{did}:Group {{name:'{grp}'}}) MERGE (d{did})-[:BELONGS_TO]->(grp{did});")

for _, r in i.iterrows():
    ind = str(r['indication']).replace("'", "\\'")
    did = int(r['drug_id'])
    lines.append(f"MATCH (d:Drug {{drugId:{did}}}) MERGE (ind:Indication {{name:'{ind}'}}) MERGE (d)-[:INDICATED_FOR]->(ind);")

for _, r in c.iterrows():
    con = str(r['contraindication']).replace("'", "\\'")
    did = int(r['drug_id'])
    lines.append(f"MATCH (d:Drug {{drugId:{did}}}) MERGE (con:Contraindication {{name:'{con}'}}) MERGE (d)-[:HAS_CONTRAINDICATION]->(con);")

for _, r in s.iterrows():
    syn = str(r['synonym']).replace("'", "\\'")
    did = int(r['drug_id'])
    lines.append(f"MATCH (d:Drug {{drugId:{did}}}) MERGE (syn:Synonym {{name:'{syn}'}}) MERGE (syn)-[:REFERS_TO]->(d);")

for _, r in inter.iterrows():
    did  = int(r['drug_id'])
    with_name = str(r['with_name']).replace("'", "\\'")
    risk = str(r['risk_level'])
    note = str(r['note']).replace("'", "\\'")
    lines.append(f"MATCH (d:Drug {{drugId:{did}}}), (other:Drug {{name:'{with_name}'}}) MERGE (d)-[:INTERACTS_WITH {{risk:'{risk}', note:'{note}'}}]->(other);")

out = ROOT / 'output/neo4j_seed.cypher'
out.write_text('\n'.join(lines), encoding='utf-8')
print('Cypher ready')