from __future__ import annotations

import json
import os
import time
from datetime import datetime
from typing import Any, Dict, List

import requests

from logging_config import get_logger

logger = get_logger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = os.getenv("GROQ_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_MODEL = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")
USE_MOCK = os.getenv("USE_MOCK", "false").lower() == "true"


def _build_mongo_uri() -> str | None:
    if os.getenv("MONGO_URI"):
        return os.getenv("MONGO_URI")

    host = os.getenv("MONGO_HOST", "127.0.0.1")
    port = os.getenv("MONGO_PORT", "27017")
    database = os.getenv("MONGO_DB_NAME", "qa_platform")
    username = os.getenv("MONGO_USERNAME")
    password = os.getenv("MONGO_PASSWORD")
    auth_source = os.getenv("MONGO_AUTH_SOURCE", database)
    if username and password:
        return f"mongodb://{username}:{password}@{host}:{port}/{database}?authSource={auth_source}"
    return f"mongodb://{host}:{port}/{database}"


def _record_grok_call() -> None:
    mongo_uri = _build_mongo_uri()
    if not mongo_uri:
        return

    try:
        from pymongo import MongoClient
    except Exception:
        return

    db_name = os.getenv("MONGO_DB_NAME", "qa_platform")
    try:
        client = MongoClient(mongo_uri)
        collection = client[db_name]["metrics"]
        collection.update_one(
            {"name": "qa_grok_calls_total"},
            {"$inc": {"value": 1}, "$set": {"updatedAt": datetime.utcnow()}},
            upsert=True,
        )
    except Exception:
        return
    finally:
        try:
            client.close()
        except Exception:
            pass
def _extract_content(payload: Dict[str, Any]) -> str:
    choices = payload.get("choices") or []
    if choices:
        choice = choices[0] or {}
        message = choice.get("message") or {}
        if isinstance(message, dict) and message.get("content"):
            return str(message.get("content"))
        if choice.get("text"):
            return str(choice.get("text"))
    return json.dumps(payload)


def _parse_tests(response_text: str) -> List[Dict[str, Any]]:
    parsed = json.loads(response_text)
    if isinstance(parsed, dict) and isinstance(parsed.get("tests"), list):
        return parsed["tests"]
    if isinstance(parsed, list):
        return parsed
    raise ValueError("Groq response did not contain test cases")


def _mock_response(endpoint: Dict[str, Any]) -> List[Dict[str, Any]]:
    from mock_claude import get_mock_test_cases
    logger.warning("Falling back to mock test generation for %s %s", endpoint.get("method"), endpoint.get("path"))
    return get_mock_test_cases(endpoint)


def call_groq(prompt_text: str, timeout: int = 30) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not set")
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You generate only valid JSON."},
            {"role": "user", "content": prompt_text},
        ],
        "temperature": 0.2,
    }
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            response = requests.post(GROQ_URL, json=payload, headers=headers, timeout=timeout)
            response.raise_for_status()
            _record_grok_call()
            return _extract_content(response.json())
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"Groq request failed after 3 attempts: {exc}") from exc
    raise RuntimeError(f"Groq request failed: {last_error}")


def generate_test_cases(endpoint: Dict[str, Any]) -> List[Dict[str, Any]]:
    if USE_MOCK:
        return _mock_response(endpoint)
    from prompt_builder import build_prompt
    from mock_claude import get_mock_test_cases
    try:
        raw = call_groq(build_prompt(endpoint))
        return _parse_tests(raw)
    except Exception as exc:
        logger.warning("Groq unavailable, falling back to mock: %s", exc)
        return get_mock_test_cases(endpoint)