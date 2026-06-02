#!/usr/bin/env python3
"""
Демонстрационный прогон ETL с наглядным отчётом.

Запуск из корня репозитория:
  python etl/test_etl_demo.py

или из etl/src:
  python ../test_etl_demo.py

Создаёт:
  - etl/output/etl_status.json
  - etl/output/demo_report.html  (откройте в браузере)
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUTPUT = ROOT / "output"
PROCESSED = ROOT / "data" / "processed"
SAMPLES = ROOT / "data" / "samples"


def step(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  >> {title}")
    print(f"{'=' * 60}")


def run_py(script: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, script],
        cwd=SRC,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )


def load_metrics() -> dict:
    status_path = OUTPUT / "etl_status.json"
    if status_path.exists():
        return json.loads(status_path.read_text(encoding="utf-8"))
    return {"status": "unknown", "metrics": {}}


def sample_drugs(n: int = 5) -> list[dict]:
    catalog = json.loads((SAMPLES / "drugs_catalog.json").read_text(encoding="utf-8"))
    return catalog[:n]


def write_html_report(status: dict, stdout_parse: str, stdout_etl: str) -> Path:
    metrics = status.get("metrics", {})
    rows = sample_drugs(8)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    ok = status.get("status") == "ok"

    cards = ""
    for d in rows:
        cards += f"""
        <article class="drug">
          <h3>{d.get('trade_name','')}</h3>
          <p><b>МНН:</b> {d.get('substance','')}</p>
          <p><b>АТХ:</b> {d.get('atc','')} · <b>Группа:</b> {d.get('group','')}</p>
          <p><b>Дозировка:</b> {d.get('dosage_adult','')}</p>
          <p><b>Показания:</b> {d.get('indications','')}</p>
        </article>
        """

    html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>PharmaBase — отчёт тестового ETL</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }}
    h1 {{ color: #38bdf8; }}
    .status {{ padding: 1rem 1.25rem; border-radius: 12px; background: {'#14532d' if ok else '#7f1d1d'}; }}
    .metrics {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin: 1.5rem 0; }}
    .metric {{ background: #1e293b; padding: 1rem; border-radius: 10px; text-align: center; }}
    .metric b {{ font-size: 1.5rem; display: block; color: #38bdf8; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }}
    .drug {{ background: #1e293b; padding: 1rem; border-radius: 10px; border-left: 4px solid #38bdf8; }}
    pre {{ background: #1e293b; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 12px; }}
  </style>
</head>
<body>
  <h1>Тестовый ETL PharmaBase</h1>
  <p>Сформировано: {now}</p>
  <div class="status">Статус пайплайна: <strong>{status.get('status', '?')}</strong></div>
  <div class="metrics">
    {''.join(f'<div class="metric"><b>{v}</b>{k}</div>' for k, v in metrics.items())}
  </div>
  <h2>Примеры из каталога</h2>
  <div class="grid">{cards}</div>
  <h2>Лог parse_sources</h2>
  <pre>{stdout_parse.strip() or '(пусто)'}</pre>
  <h2>Лог run_etl</h2>
  <pre>{stdout_etl.strip() or '(пусто)'}</pre>
</body>
</html>
"""
    out = OUTPUT / "demo_report.html"
    out.write_text(html, encoding="utf-8")
    return out


def main() -> int:
    started = time.perf_counter()
    OUTPUT.mkdir(parents=True, exist_ok=True)

    step("1/2 — parse_sources.py (каталог + HTML-инструкции)")
    p1 = run_py("parse_sources.py")
    print(p1.stdout)
    if p1.stderr:
        print(p1.stderr, file=sys.stderr)
    if p1.returncode != 0:
        print("ОШИБКА parse_sources", file=sys.stderr)
        return 1

    step("2/2 — run_etl.py (processed CSV + etl_status.json)")
    p2 = run_py("run_etl.py")
    print(p2.stdout)
    if p2.stderr:
        print(p2.stderr, file=sys.stderr)
    if p2.returncode != 0:
        print("ОШИБКА run_etl", file=sys.stderr)
        return 1

    status = load_metrics()
    drugs_csv = PROCESSED / "drugs.csv"
    line_count = len(drugs_csv.read_text(encoding="utf-8").strip().splitlines()) - 1 if drugs_csv.exists() else 0

    report = write_html_report(status, p1.stdout, p2.stdout)
    elapsed = time.perf_counter() - started

    print(f"\nOK: Тестовый ETL завершён за {elapsed:.1f} с")
    print(f"   Препаратов в drugs.csv: {line_count}")
    print(f"   Метрики: {json.dumps(status.get('metrics', {}), ensure_ascii=False)}")
    print(f"   HTML-отчёт: {report}")
    print(f"\n   Откройте в браузере: file:///{report.as_posix()}")

    expected = 40
    if line_count < expected:
        print(f"\nWARN: Ожидалось {expected} препаратов, получено {line_count}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
