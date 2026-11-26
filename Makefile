# Abaci. Quick start (from the repo root):
#
#   make setup     # one time: creates .venv with Python 3.12+ and installs the pinned packages
#   make all       # download the real data, load it, dbt build, validate metrics, run every test, write the report
#   make sample    # same pipeline on a small synthetic sample (no Kaggle account needed; this is what CI runs)
#
# Targets use .venv automatically when it exists. To run dbt or mf by hand: source .venv/bin/activate, then cd dbt.

VENV := .venv
DBT_DIR := dbt
export DBT_SEND_ANONYMOUS_USAGE_STATS := false

PYTHON ?= $(shell for p in python3.12 python3.13 python3; do command -v $$p >/dev/null 2>&1 && { echo $$p; break; }; done)

ifneq ($(wildcard $(VENV)/bin/python),)
  BIN := $(CURDIR)/$(VENV)/bin/
  PY := $(CURDIR)/$(VENV)/bin/python
else
  BIN :=
  PY ?= $(PYTHON)
endif

.PHONY: setup install download sample-data load build validate test lint report docs all sample clean check-python

check-python:
	@test -n "$(PYTHON)" || { echo "No python3 found. Install Python 3.12 (macOS: brew install python@3.12)."; exit 1; }
	@$(PYTHON) -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' || { \
	  echo "$(PYTHON) is $$($(PYTHON) --version 2>&1). Abaci needs Python 3.12 or newer."; \
	  echo "macOS: brew install python@3.12, then run: make setup PYTHON=python3.12"; exit 1; }

setup: check-python ## one time: create .venv and install pinned dependencies
	$(PYTHON) -m venv $(VENV)
	$(VENV)/bin/python -m pip install --upgrade pip
	$(VENV)/bin/python -m pip install -r requirements.txt
	@echo ""
	@echo "Ready. Next: make all (real data, needs ~/.kaggle/kaggle.json) or make sample"

install:            ## install pinned dependencies into the current Python (CI uses this)
	$(PY) -m pip install -r requirements.txt

download:           ## download Lending Club from Kaggle and the FRED series (about 1.6 GB)
	$(PY) ingest/download_lending_club.py
	$(PY) ingest/download_fred.py

sample-data:        ## write the synthetic sample into data/sample (the real data in data/raw is untouched)
	$(PY) ingest/make_sample.py --out data/sample

load:               ## load the raw files into the warehouse, schema raw
	$(PY) ingest/load_raw.py

build:              ## every model, contract, data test and unit test
	cd $(DBT_DIR) && $(BIN)dbt build --profiles-dir .

validate:           ## validate the semantic layer against the warehouse
	cd $(DBT_DIR) && $(BIN)mf validate-configs

test:               ## ingest and metric parity tests
	$(PY) -m pytest -s

lint:               ## Python lint and format check
	$(BIN)ruff check .
	$(BIN)ruff format --check .

report:             ## write DATA_QUALITY.md from the last dbt build
	$(PY) -m quality.report

docs:               ## build the dbt docs site into dbt/target/
	cd $(DBT_DIR) && $(BIN)dbt docs generate --profiles-dir .

all: download load build validate test report

# The sample builds its own warehouse (data/sample.duckdb) so it never overwrites the real one.
sample: export ABACI_RAW_DIR := $(CURDIR)/data/sample
sample: export ABACI_DB := $(CURDIR)/data/sample.duckdb
sample: sample-data load build validate test report

clean:              ## remove dbt build output (keeps downloaded data and the warehouse)
	cd $(DBT_DIR) && $(BIN)dbt clean --profiles-dir .
