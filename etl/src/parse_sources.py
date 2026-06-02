"""
Парсинг источников для ETL.

По умолчанию: демо XML (ГРЛС sample) + HTML-инструкции → data/raw/drugs_raw.csv.

Опционально (env или аргументы):
  FETCH_GRLS=1 / --grls     — скачать открытый CSV ГРЛС в data/raw/drugs_grls.csv
  FETCH_RXNORM=1 / --rxnorm — обогатить interactions_rxnorm.csv (первые 50 торговых имён из ГРЛС)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "data/samples"
OUT = ROOT / "data/raw"
OUT.mkdir(parents=True, exist_ok=True)

GRLS_URL = (
    "https://minzdrav.gov.ru/opendata/7707778246-grls/"
    "data-20170301T0000-structure-20151217T0000.csv"
)


def _empty_row() -> dict:
    return {
        "trade_name": "",
        "substance": "",
        "atc": "",
        "group": "",
        "registration_number": "",
        "manufacturer": "",
        "form": "",
        "dosage_adult": "",
        "dosage_children": "",
        "storage_conditions": "",
        "shelf_life": "",
        "dispensing_rule": "",
        "indications": "",
        "contraindications": "",
        "side_effects": "",
        "analogs": "",
        "interacts_with": "",
        "risk_level": "",
        "interaction_note": "",
        "synonyms": "",
    }


def parse_catalog_json() -> list[dict]:
    """Основной демо-каталог: 40 препаратов с полными полями."""
    catalog_path = SAMPLES / "drugs_catalog.json"
    if not catalog_path.exists():
        return []
    raw = json.loads(catalog_path.read_text(encoding="utf-8"))
    rows: list[dict] = []
    for item in raw:
        row = _empty_row()
        row.update({k: str(item.get(k, "") or "").strip() for k in row.keys() if k in item})
        rows.append(row)
    return rows


def parse_demo_xml() -> list[dict]:
    xml_path = SAMPLES / "grls_sample.xml"
    xml_root = ET.parse(xml_path).getroot()
    rows: list[dict] = []
    for drug in xml_root.findall("drug"):
        row = _empty_row()
        row.update(
            {
                "trade_name": drug.findtext("name", "").strip(),
                "substance": drug.findtext("substance", "").strip(),
                "atc": drug.findtext("atc", "").strip(),
                "group": drug.findtext("group", "").strip(),
                "registration_number": drug.findtext("registrationNumber", "").strip(),
                "manufacturer": drug.findtext("manufacturer", "").strip(),
                "form": drug.findtext("form", "").strip(),
                "dosage_adult": drug.findtext("dosageAdult", "").strip(),
                "dosage_children": drug.findtext("dosageChildren", "").strip(),
                "storage_conditions": drug.findtext("storageConditions", "").strip(),
                "shelf_life": drug.findtext("shelfLife", "").strip(),
                "dispensing_rule": drug.findtext("dispensingRule", "").strip(),
                "indications": ";".join(
                    i.text.strip() for i in drug.findall("./indications/item") if i.text
                ),
            }
        )
        rows.append(row)
    return rows


def merge_html_instructions(rows: list[dict]) -> None:
    html_path = SAMPLES / "instruction_sample.html"
    html = BeautifulSoup(html_path.read_text(encoding="utf-8"), "html.parser")

    for article in html.select("article.instruction"):
        name_tag = article.select_one("h1")
        if not name_tag:
            continue
        name = name_tag.get_text(strip=True)

        def _block(key: str) -> str:
            el = article.select_one(f'[data-block="{key}"]')
            return el.get_text(" ", strip=True) if el else ""

        interaction_raw = _block("interactions").split("|")

        for row in rows:
            if row["trade_name"] != name:
                continue
            row["contraindications"] = _block("contraindications")
            row["side_effects"] = _block("side-effects")
            row["analogs"] = _block("analogs")
            row["synonyms"] = _block("synonyms")
            dosage_adult = _block("dosage-adult")
            dosage_children = _block("dosage-children")
            if dosage_adult:
                row["dosage_adult"] = dosage_adult
            if dosage_children:
                row["dosage_children"] = dosage_children
            if len(interaction_raw) == 3:
                row["interacts_with"] = interaction_raw[0].strip()
                row["risk_level"] = interaction_raw[1].strip()
                row["interaction_note"] = interaction_raw[2].strip()
            break


def fetch_grls_csv() -> pd.DataFrame:
    print("Загружаю ГРЛС (открытый CSV)...")
    grls = pd.read_csv(GRLS_URL, encoding="utf-8-sig")
    grls.columns = [c.strip() for c in grls.columns]
    grls.to_csv(OUT / "drugs_grls.csv", index=False)
    print(f"  ГРЛС: {len(grls)} записей → {OUT / 'drugs_grls.csv'}")
    return grls


def rxnorm_interactions(trade_name: str) -> list[dict]:
    try:
        r = requests.get(
            "https://rxnav.nlm.nih.gov/REST/rxcui.json",
            params={"name": trade_name, "search": 1},
            timeout=8,
        )
        cui = r.json().get("idGroup", {}).get("rxnormId", [None])[0]
        if not cui:
            return []

        r2 = requests.get(
            "https://rxnav.nlm.nih.gov/REST/interaction/interaction.json",
            params={"rxcui": cui},
            timeout=8,
        )
        groups = r2.json().get("interactionTypeGroup", [])
        result: list[dict] = []
        for g in groups:
            for t in g.get("interactionType", []):
                for pair in t.get("interactionPair", []):
                    concepts = pair.get("interactionConcept", [])
                    other = concepts[1]["minConceptItem"]["name"] if len(concepts) > 1 else ""
                    result.append(
                        {
                            "drug": trade_name,
                            "interacts_with": other,
                            "severity": pair.get("severity", "unknown"),
                            "description": pair.get("description", ""),
                        }
                    )
        return result
    except Exception:
        return []


def fetch_rxnorm_interactions(grls: pd.DataFrame, limit: int = 50) -> None:
    name_col = "trade_name" if "trade_name" in grls.columns else grls.columns[0]
    sample = grls[name_col].dropna().head(limit).tolist()
    interactions: list[dict] = []
    print(f"RxNorm: запрос взаимодействий для {len(sample)} препаратов...")
    for name in sample:
        interactions.extend(rxnorm_interactions(str(name)))
        time.sleep(0.3)
    out_path = OUT / "interactions_rxnorm.csv"
    pd.DataFrame(interactions).to_csv(out_path, index=False)
    print(f"  Взаимодействия RxNorm: {len(interactions)} пар → {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Парсинг ГРЛС/инструкций для ETL")
    parser.add_argument("--grls", action="store_true", help="Скачать CSV ГРЛС (minzdrav)")
    parser.add_argument("--rxnorm", action="store_true", help="Обогатить interactions_rxnorm.csv")
    args = parser.parse_args()

    fetch_grls = args.grls or os.environ.get("FETCH_GRLS", "").strip() in ("1", "true", "yes")
    fetch_rxnorm = args.rxnorm or os.environ.get("FETCH_RXNORM", "").strip() in ("1", "true", "yes")

    from enrich_dosages import enrich_catalog_file

    enrich_catalog_file()
    rows = parse_catalog_json()
    if not rows:
        rows = parse_demo_xml()
    merge_html_instructions(rows)

    output_path = OUT / "drugs_raw.csv"
    pd.DataFrame(rows).to_csv(output_path, index=False, encoding="utf-8")
    print(f"parse_sources done -> {output_path} ({len(rows)} drugs)")

    grls_df: pd.DataFrame | None = None
    if fetch_grls:
        try:
            grls_df = fetch_grls_csv()
        except Exception as exc:
            print(f"  WARN: не удалось загрузить ГРЛС: {exc}", file=sys.stderr)

    if fetch_rxnorm:
        if grls_df is None:
            grls_path = OUT / "drugs_grls.csv"
            if grls_path.exists():
                grls_df = pd.read_csv(grls_path, encoding="utf-8-sig")
            else:
                print("  WARN: для --rxnorm нужен drugs_grls.csv (запустите с --grls)", file=sys.stderr)
                grls_df = None
        if grls_df is not None:
            try:
                fetch_rxnorm_interactions(grls_df)
            except Exception as exc:
                print(f"  WARN: RxNorm не загружен: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
