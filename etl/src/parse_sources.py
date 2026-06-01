import requests, time, pandas as pd
from pathlib import Path

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