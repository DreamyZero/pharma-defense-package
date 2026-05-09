#!/usr/bin/env bash
set -e
python3 etl/src/parse_sources.py
python3 etl/src/run_etl.py
python3 etl/src/generate_neo4j_seed.py
