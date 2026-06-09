from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


def _escape_java_string(text: Any) -> str:
	value = "" if text is None else str(text)
	return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")


def _java_string_literal(value: Any) -> str:
	if value is None:
		return "null"
	return '"' + _escape_java_string(json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value) + '"'


def _safe_method_name(name: Any, fallback: str) -> str:
	raw = str(name or fallback)
	cleaned = [char if (char.isalnum() or char == "_") else "_" for char in raw]
	result = "".join(cleaned).strip("_") or fallback
	if result[0].isdigit():
		result = f"test_{result}"
	return result


def _body_literal(body: Any) -> str:
	if body in (None, {}, []):
		return None
	return _java_string_literal(body)


def write_test_file(all_test_cases: List[Dict[str, Any]], output_path: str) -> None:
	output = Path(output_path)
	output.parent.mkdir(parents=True, exist_ok=True)
	class_name = output.stem
	lines: List[str] = [
		"package com.qaplatform.api;",
		"",
		"import org.junit.jupiter.api.DisplayName;",
		"import org.junit.jupiter.api.Tag;",
		"import org.junit.jupiter.api.Test;",
		"import static io.restassured.RestAssured.given;",
		"",
		f"public class {class_name} extends ContractTestBase {{",
	]
	for index, test_case in enumerate(all_test_cases):
		test_name = _safe_method_name(test_case.get("test_name") or test_case.get("testName"), f"generatedTest{index}")
		description = _escape_java_string(test_case.get("description", "Generated API test"))
		method = str(test_case.get("method") or test_case.get("httpMethod") or "GET").upper()
		path_value = str(test_case.get("path", "/"))
		path = _escape_java_string(path_value)
		status = int(test_case.get("expected_status") or test_case.get("expectedStatusCode") or 200)
		headers = test_case.get("headers") or {}
		body = _body_literal(test_case.get("body") or test_case.get("requestBody"))
		assertions = test_case.get("assertions") or test_case.get("expectedResponseContains") or []
		endpoint_name = _escape_java_string(f"{method} {path_value}")
		lines.extend([
			"",
			"    @Test",
			f"    @DisplayName(\"{description}\")",
			f"    @Tag(\"{_escape_java_string(str(test_case.get('testCategory', 'generated')).lower())}\")",
			f"    public void {test_name}() {{",
			f"        setCurrentEndpoint(\"{endpoint_name}\");",
			"        given().spec(requestSpec)",
		])
		if headers:
			headers_entries = []
			for key, value in headers.items():
				headers_entries.append(f'\"{_escape_java_string(key)}\", \"{_escape_java_string(value)}\"')
			lines.append(f"            .headers(java.util.Map.of({', '.join(headers_entries)}))")
		if body is not None:
			lines.append(f"            .body({body})")
		lines.append(f"        .when().request(\"{method}\", \"{path}\")")
		lines.append(f"        .then().statusCode({status});")
		for assertion in assertions:
			lines.append(f"        // assertion: {_escape_java_string(assertion)}")
		lines.append("    }")
	lines.append("}")
	output.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
	write_test_file([], "./GeneratedApiTests.java")

