from typing import Any, Dict, Iterable
import json

from pii_redactor import redact, redact_structure, redact_value

# System prompt constant required by the spec
SYSTEM_PROMPT = (
    "You are a senior QA engineer with 10 years of experience in API testing. "
    "You write precise, thorough, and executable test cases. You always return "
    "structured data exactly as requested with no additional commentary."
)


def _redact_examples(value: Any, field_name: str | None = None) -> Any:
	if isinstance(value, dict):
		return {key: _redact_examples(inner_value, key) for key, inner_value in value.items()}
	if isinstance(value, list):
		return [_redact_examples(item, field_name) for item in value]
	if isinstance(value, str):
		return redact(value, field_name)
	return redact_value(value, field_name)


def _json_block(label: str, value: Any) -> str:
	return f"{label}: {json.dumps(_redact_examples(value, label), ensure_ascii=False, default=str, indent=2)}"


def build_prompt(endpoint: Dict[str, Any], recent_failures: list[str] = None) -> str:
	method = endpoint.get("method", "GET")
	path = endpoint.get("path", "/")
	summary = redact(endpoint.get("summary", ""), field_name="summary")
	parameters = endpoint.get("parameters", []) or []
	request_body = endpoint.get("requestBody")
	responses = endpoint.get("responses", {}) or {}

	lines = [
		"You are a senior QA automation engineer.",
		"Given this OpenAPI endpoint, generate Java RestAssured test case definitions.",
		f"Endpoint: {method} {path}",
		f"Summary: {summary}",
		_json_block("parameters", parameters),
		_json_block("requestBody", request_body),
		_json_block("responses", responses),
	]

	if recent_failures:
		lines.append("")
		lines.append("CRITICAL: RECENT FAILURES DETECTED")
		lines.append("The following errors were reported during the last test execution for this endpoint.")
		lines.append("Please analyze these errors and generate test cases that specifically address or verify the fix for these issues:")
		for fail in recent_failures:
			lines.append(f"- {fail}")

	lines.extend([
		"",
		"Return ONLY valid JSON in this exact format:",
		json.dumps(
			{
				"tests": [
					{
						"test_name": "string",
						"description": "string",
						"method": "GET|POST|PUT|DELETE",
						"path": "/path",
						"expected_status": 200,
						"headers": {},
						"body": {},
						"assertions": ["string"],
					}
				]
			},
			indent=2,
		),
		"Do not include markdown, commentary, or code fences.",
	])
	return "\n".join(lines)


if __name__ == "__main__":
    # quick smoke test
    sample = {
        "method": "GET",
        "path": "/pet/{petId}",
        "summary": "Find pet by ID",
        "parameters": [{"name": "petId", "in": "path", "required": True, "schema": {"type": "integer"}}],
        "requestBody": None,
        "responses": {"200": {"description": "OK", "schema": None}},
    }
    print(build_prompt(sample))
