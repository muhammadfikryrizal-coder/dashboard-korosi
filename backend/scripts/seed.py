#!/usr/bin/env python3
"""Seed database from src/lib/realData.json and ensure demo user exists."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.modules.ingest.service import ingest_from_artifacts  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed PipelineGuard DB")
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="Run scripts/build_data.py before loading JSON",
    )
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        counts = ingest_from_artifacts(db, rebuild=args.rebuild)
        print("Seed complete:", counts)
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
