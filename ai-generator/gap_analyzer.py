"""Gap analyzer: summarizes coverage and stores an AI gap report in MongoDB.

Usage:
  python gap_analyzer.py

Set `USE_MOCK=true` to avoid calling the Anthropic API.
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List

from dotenv import load_dotenv

load_dotenv()

from logging_config import get_logger

logger = get_logger(__name__)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
MONGO_DB = os.getenv("MONGO_DB_NAME", "qa_platform")
USE_MOCK = os.getenv("USE_MOCK", "false").lower() == "true"


def canonical_path(path: str) -> str:
    """Normalize a URL path for endpoint matching."""
    return (path or "").split("?")[0].rstrip("/") or "/"


def parse_endpoint(endpoint: str) -> tuple[str, str]:
    """Split an endpoint string into normalized method and path parts."""
    parts = str(endpoint or "").split(" ", 1)
    method = parts[0].upper() if parts else ""
    path = canonical_path(parts[1] if len(parts) > 1 else "")
    return method, path


def spec_path_to_regex(path: str):
    """Convert a spec path with parameter placeholders into a regex."""
    import re

    escaped = re.escape(canonical_path(path))
    escaped = re.sub(r"\\\{[^}]+\\\}", r"[^/]+", escaped)
    return re.compile(f"^{escaped}$")


def endpoint_matches(spec_method: str, spec_path: str, tested_endpoint: str) -> bool:
    """Return True when a concrete test endpoint matches a spec endpoint."""
    tested_method, tested_path = parse_endpoint(tested_endpoint)
    if tested_method != (spec_method or "").upper():
        return False
    return bool(spec_path_to_regex(spec_path).search(tested_path))


def connect_db():
    from pymongo import MongoClient

    client = MongoClient(MONGO_URI)
    return client[MONGO_DB]


def build_coverage_summary(db) -> Dict[str, Any]:
    endpoints = list(db.spec_endpoints.find({}))
    total = len(endpoints)

    def canonical_path(path: str) -> str:
        return (path or "").split("?")[0].rstrip("/") or "/"

    def spec_path_to_regex(path: str):
        import re

        escaped = re.escape(canonical_path(path))
        escaped = re.sub(r"\\\{[^}]+\\\}", r"[^/]+", escaped)
        return re.compile(f"^{escaped}$")

    def parse_endpoint(endpoint: str):
        parts = str(endpoint or "").split(" ", 1)
        method = parts[0].upper() if parts else ""
        path = canonical_path(parts[1] if len(parts) > 1 else "")
        return method, path

    tested_results = [parse_endpoint(tr.get("endpoint")) for tr in db.test_results.find({}) if tr.get("endpoint")]
    tested_keys = set()

    coverage_percent = 0.0

    # byTag: group endpoints by tag if present
    by_tag: Dict[str, Dict[str, int]] = {}
    for e in endpoints:
        tag = e.get("tag") or e.get("tags") or "untagged"
        if isinstance(tag, list):
            tag = tag[0] if tag else "untagged"
        bucket = by_tag.setdefault(tag, {"total": 0, "tested": 0})
        bucket["total"] += 1
        ep_regex = spec_path_to_regex(e.get("path", ""))
        matched = any(method == e.get("method", "").upper() and ep_regex.search(path) for method, path in tested_results)
        ep_id = f"{e.get('method','').upper()} {e.get('path','')}"
        if matched:
            tested_keys.add(ep_id)
            bucket["tested"] += 1

    tested_count = len(tested_keys)
    coverage_percent = (tested_count / total * 100) if total > 0 else 0.0

    return {
        "totalEndpoints": total,
        "testedEndpoints": tested_count,
        "coveragePercent": round(coverage_percent, 2),
        "byTag": by_tag,
    }


def _test_file_matches(endpoint: Dict[str, Any], test_text: str) -> bool:
    method = str(endpoint.get("method", "")).upper()
    path = str(endpoint.get("path", ""))
    if not method or not path:
        return False
    return method in test_text and path.replace("{", "").replace("}", "") in test_text


def find_untested_endpoints(endpoints: List[Dict[str, Any]], test_root: str | None = None) -> List[Dict[str, Any]]:
    root = Path(test_root or Path(__file__).resolve().parent.parent / "test-engine" / "src" / "test" / "java" / "com" / "qaplatform" / "api")
    test_text = ""
    if root.exists():
        for file_path in root.glob("**/*.java"):
            try:
                test_text += file_path.read_text(encoding="utf-8") + "\n"
            except Exception:
                continue
    untested = [endpoint for endpoint in endpoints if not _test_file_matches(endpoint, test_text)]
    return untested


def main():
    # Try to connect to MongoDB; if unavailable, fall back to writing a local file.
    db = None
    try:
        db = connect_db()
    except Exception as exc:
        logger.warning("Could not connect to MongoDB: %s", exc)

    if db is not None:
        endpoints = list(db.spec_endpoints.find({}, {"path": 1, "method": 1}))
    else:
        spec_file = Path(__file__).resolve().parent / "output" / "spec_endpoints.json"
        endpoints = json.loads(spec_file.read_text(encoding="utf-8")) if spec_file.exists() else []

    summary = build_coverage_summary(db) if db is not None else {
        "totalEndpoints": len(endpoints),
        "testedEndpoints": 0,
        "coveragePercent": 0.0,
        "byTag": {},
    }
    tested_eps = []
    untested = [f"{e.get('method','').upper()} {e.get('path','')}" for e in find_untested_endpoints(endpoints)]
    happy_only = [f"{e.get('method','').upper()} {e.get('path','')}" for e in endpoints if f"{e.get('method','').upper()} {e.get('path','')}" not in untested]
    prompt = (
        "You are a QA architect reviewing test coverage for a REST API.\n\n"
        f"Coverage summary: {json.dumps(summary, indent=2)}\n"
        f"Tested endpoints: {json.dumps(tested_eps, indent=2)}\n"
        f"Untested endpoints: {json.dumps(untested, indent=2)}\n"
        f"Endpoints with only happy-path tests: {json.dumps(happy_only, indent=2)}\n"
    )
    report_text = "Mock gap report: coverage is limited; add edge-case and auth tests for critical endpoints." if USE_MOCK else prompt
    doc = {"report": report_text, "flaggedEndpoints": untested[:20], "coverageSummary": summary, "generatedAt": datetime.utcnow()}
    if db is not None:
                db.gap_reports.insert_one(doc)
                logger.info("Gap report written to MongoDB (collection: gap_reports)")
    else:
                out_dir = Path(__file__).resolve().parent / "output"
                out_dir.mkdir(parents=True, exist_ok=True)
                out_path = out_dir / "gap_report.json"
                out_path.write_text(json.dumps(doc, default=lambda o: o.isoformat() if isinstance(o, datetime) else str(o), indent=2), encoding="utf-8")
                logger.info("Gap report written to local file: %s", out_path)


if __name__ == "__main__":
    main()
