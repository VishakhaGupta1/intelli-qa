from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
	sys.path.insert(0, str(BASE_DIR))

load_dotenv()
# Also try loading from project root
load_dotenv(BASE_DIR.parent / ".env")

from logging_config import get_logger
import gap_analyzer
import groq_client
import mock_claude
import prompt_builder
import spec_parser
import test_writer
import trust_scorer

logger = get_logger(__name__)


def _write_spec_endpoints_to_disk(endpoints: List[Dict]) -> Path:
	output_dir = BASE_DIR / "output"
	output_dir.mkdir(parents=True, exist_ok=True)
	output_file = output_dir / "spec_endpoints.json"
	output_file.write_text(json.dumps(endpoints, indent=2, ensure_ascii=False), encoding="utf-8")
	return output_file


def _get_mongo_client() -> Any:
	"""
	Attempts to connect to MongoDB using multiple URI variations.
	Returns a connected MongoClient or None.
	"""
	from pymongo import MongoClient
	
	# Priority list of URIs to try
	# Port 27018 is used to avoid conflict with local MongoDB on host
	uris = [
		os.environ.get("MONGO_URI"),
		"mongodb://admin:change-me@127.0.0.1:27018/?authSource=admin",
		"mongodb://admin:change-me@localhost:27018/?authSource=admin",
		"mongodb://admin:change-me@127.0.0.1:27017/?authSource=admin",
		"mongodb://qa_platform_app:change-me@127.0.0.1:27017/qa_platform?authSource=qa_platform",
		"mongodb://127.0.0.1:27017/qa_platform"
	]
	
	from pymongo import MongoClient
	for uri in uris:
		if not uri: continue
		try:
			client = MongoClient(uri, serverSelectionTimeoutMS=2000)
			# Just try to list database names - this requires some auth but is a good test
			client.list_database_names()
			return client
		except Exception as e:
			# Fallback: if we can't list databases, maybe we can at least ping our specific DB
			try:
				db_name = os.getenv("MONGO_DB_NAME", "qa_platform")
				client[db_name].command('ping')
				return client
			except Exception:
				pass
			if client: client.close()
			continue
	logger.error("Failed to connect to MongoDB with any of the provided URIs.")
	return None


def _write_spec_endpoints_to_mongo(endpoints: List[Dict]) -> None:
	client = _get_mongo_client()
	if not client:
		return
	try:
		db_name = os.getenv("MONGO_DB_NAME", "qa_platform")
		collection = client[db_name]["spec_endpoints"]
		documents = []
		for endpoint in endpoints:
			documents.append({
				"path": endpoint.get("path"),
				"method": endpoint.get("method"),
				"tag": (endpoint.get("tags") or ["untagged"])[0] if endpoint.get("tags") else "untagged",
				"summary": endpoint.get("summary", ""),
				"parsedAt": datetime.utcnow().isoformat(),
			})
		if documents:
			collection.delete_many({})
			collection.insert_many(documents)
	except Exception as exc:
		logger.warning("Could not persist spec endpoints to MongoDB: %s", exc)
	finally:
		try:
			client.close()
		except Exception:
			pass


def _write_trust_scores_to_mongo(report: Dict[str, Any]) -> None:
	client = _get_mongo_client()
	if not client:
		return
	try:
		db_name = os.getenv("MONGO_DB_NAME", "qa_platform")
		collection = client[db_name]["trust_evaluations"]
		document = {
			"timestamp": datetime.utcnow().isoformat(),
			"overallScore": report.get("overall_score"),
			"endpointScores": report.get("endpoint_scores"),
			"recentFailures": [sc.get("deductions") for sc in report.get("endpoint_scores", []) if sc.get("deductions")],
			"evaluationId": f"gen-{int(datetime.utcnow().timestamp())}"
		}
		collection.insert_one(document)
	except Exception as exc:
		logger.warning("Could not persist trust evaluation to MongoDB: %s", exc)
	finally:
		try:
			client.close()
		except Exception:
			pass


def _get_recent_failures() -> Dict[str, List[str]]:
	"""
	Queries MongoDB for recent test failures to enable self-healing.
	Returns a map of "METHOD PATH" -> list of failure messages.
	"""
	client = _get_mongo_client()
	if not client:
		return {}
	
	failures = {}
	try:
		db_name = os.getenv("MONGO_DB_NAME", "qa_platform")
		# Get failures from the last 24 hours
		collection = client[db_name]["test_results"]
		cursor = collection.find({
			"status": {"$in": ["failed", "FAIL"]},
			"failureMessage": {"$ne": None}
		}).sort("timestamp", -1).limit(100)
		
		for doc in cursor:
			endpoint = doc.get("endpoint")
			msg = doc.get("failureMessage")
			if endpoint and msg:
				if endpoint not in failures:
					failures[endpoint] = []
				if msg not in failures[endpoint]:
					failures[endpoint].append(msg)
	except Exception as exc:
		logger.warning("Could not fetch recent failures for self-healing: %s", exc)
	finally:
		try:
			client.close()
		except Exception:
			pass
	return failures


def _generate_cases_for_endpoint(endpoint: Dict, recent_failures: List[str] = None) -> List[Dict]:
	if os.getenv("USE_MOCK", "false").lower() == "true":
		logger.info("USE_MOCK=true; generating mock test cases for %s %s", endpoint.get("method"), endpoint.get("path"))
		mock_response = mock_claude.get_mock_response(endpoint)
		return mock_response.get("tests", [])

	prompt = prompt_builder.build_prompt(endpoint, recent_failures)
	try:
		response_text = groq_client.call_groq(prompt)
		cases = groq_client._parse_tests(response_text)
		logger.info("Generated %s test case(s) for %s %s", len(cases), endpoint.get("method"), endpoint.get("path"))
		return cases
	except Exception as e:
		logger.error("Failed to generate test cases for %s: %s", endpoint.get("path"), e)
		if os.getenv("ALLOW_MOCK_FALLBACK", "false").lower() == "true":
			return mock_claude.get_mock_test_cases(endpoint)
		return []


def main() -> int:
	parser = argparse.ArgumentParser(description="Generate Java API tests from an OpenAPI spec")
	parser.add_argument("--spec", default=str(BASE_DIR / "specs" / "sample-api.yaml"), help="Path to OpenAPI YAML/JSON file")
	parser.add_argument(
		"--output",
		default=str((BASE_DIR.parent / "test-engine" / "src" / "test" / "java" / "com" / "qaplatform" / "api" / "SampleApiTests.java").resolve()),
		help="Output Java file path",
	)
	args = parser.parse_args()
	logger.info("Starting generator for spec: %s", args.spec)
	endpoints = spec_parser.parse_spec(args.spec)
	logger.info("Parsed %s endpoints", len(endpoints))
	for endpoint in endpoints:
		logger.info("Found endpoint: %s %s", endpoint.get("method"), endpoint.get("path"))
	json_path = _write_spec_endpoints_to_disk(endpoints)
	logger.info("Saved parsed endpoints to %s", json_path)
	_write_spec_endpoints_to_mongo(endpoints)
	untested = gap_analyzer.find_untested_endpoints(endpoints)
	logger.info("Untested endpoints: %s", len(untested))
	for endpoint in untested:
		logger.info("Gap: %s %s", endpoint.get("method"), endpoint.get("path"))
	all_test_cases: List[Dict] = []
	failures_map = _get_recent_failures()
	
	for endpoint in endpoints:
		endpoint_key = f"{endpoint.get('method', '').upper()} {endpoint.get('path', '')}"
		failures = failures_map.get(endpoint_key, [])
		if failures:
			logger.info(f"Self-healing active for {endpoint_key}: Found {len(failures)} recent failures")
		all_test_cases.extend(_generate_cases_for_endpoint(endpoint, failures))

	# Evaluate trust score
	report = trust_scorer.score_test_cases(all_test_cases)
	logger.info("Attempting to persist trust scores to MongoDB...")
	_write_trust_scores_to_mongo(report)

	# Print summary to console
	overall = report.get("overall_score", 0)
	print(f"\n   [TRUST SCORE] Score: {overall}/100")
	
	weak_assertions = sum(1 for sc in report.get("endpoint_scores", []) if any("No body/field validation" in d for d in sc.get("deductions", [])))
	duplicates = sum(1 for sc in report.get("endpoint_scores", []) if any("Duplicate test detected" in d for d in sc.get("deductions", [])))
	
	if weak_assertions > 0:
		print(f"   [!] {weak_assertions} test(s) have weak assertions")
	if duplicates > 0:
		print(f"   [X] {duplicates} duplicate test(s) detected\n")

	test_writer.write_test_file(all_test_cases, args.output)
	logger.info("Wrote generated Java tests to %s", args.output)
	logger.info("Generated %s test cases across %s endpoints", len(all_test_cases), len(endpoints))
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
