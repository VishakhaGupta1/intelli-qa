from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

try:
    from prance import ResolvingParser
except Exception:
    ResolvingParser = None

try:
    import yaml
except Exception as exc:  # pragma: no cover
    raise RuntimeError("PyYAML is required to parse OpenAPI specs") from exc


@dataclass
class Endpoint:
	method: str
	path: str
	summary: str
	parameters: List[Dict[str, Any]]
	requestBody: Optional[Dict[str, Any]]
	responses: Dict[str, Dict[str, Any]]
	tags: List[str]


def _extract_schema_from_content(content: Dict[str, Any]) -> Optional[Dict[str, Any]]:
	if not isinstance(content, dict):
		return None
	json_media = content.get("application/json")
	if isinstance(json_media, dict) and json_media.get("schema") is not None:
		return json_media.get("schema")
	for media in content.values():
		if isinstance(media, dict) and media.get("schema") is not None:
			return media.get("schema")
	return None


def _load_spec(spec_path: str) -> Dict[str, Any]:
	if ResolvingParser is not None:
		return ResolvingParser(spec_path, lazy=True).specification
	with open(spec_path, "r", encoding="utf-8") as handle:
		return yaml.safe_load(handle)


def parse_spec(spec_path: str) -> List[Dict[str, Any]]:
	spec = _load_spec(spec_path)
	paths = spec.get("paths", {}) if isinstance(spec, dict) else {}
	endpoints: List[Dict[str, Any]] = []
	for path, path_item in paths.items():
		if not isinstance(path_item, dict):
			continue
		path_level_parameters = path_item.get("parameters", []) or []
		for method, operation in path_item.items():
			if method.lower() not in {"get", "post", "put", "delete", "patch", "options", "head"}:
				continue
			if not isinstance(operation, dict):
				continue
			parameters: List[Dict[str, Any]] = []
			for parameter in list(path_level_parameters) + list(operation.get("parameters", []) or []):
				if not isinstance(parameter, dict):
					continue
				parameters.append(
					{
						"name": parameter.get("name"),
						"in": parameter.get("in"),
						"required": parameter.get("required", False),
						"example": parameter.get("example"),
						"schema": parameter.get("schema") or {k: parameter.get(k) for k in ("type", "format", "enum") if parameter.get(k) is not None},
					}
				)
			request_body = None
			if isinstance(operation.get("requestBody"), dict):
				request_body = _extract_schema_from_content(operation["requestBody"].get("content", {}))
			responses: Dict[str, Dict[str, Any]] = {}
			for status_code, response in (operation.get("responses", {}) or {}).items():
				if not isinstance(response, dict):
					responses[str(status_code)] = {"description": str(response), "schema": None}
					continue
				responses[str(status_code)] = {
					"description": response.get("description", ""),
					"schema": _extract_schema_from_content(response.get("content", {})) if response.get("content") else response.get("schema"),
				}
			endpoints.append(
				asdict(
					Endpoint(
						method=method.upper(),
						path=path,
						summary=operation.get("summary", ""),
						parameters=parameters,
						requestBody=request_body,
						responses=responses,
						tags=operation.get("tags", []) or [],
					)
				)
			)
	return endpoints


if __name__ == "__main__":
	import argparse
	import json

	parser = argparse.ArgumentParser(description="Parse an OpenAPI spec into endpoint list")
	parser.add_argument("--spec", required=True, help="Path to OpenAPI YAML/JSON")
	arguments = parser.parse_args()
	print(json.dumps(parse_spec(arguments.spec), indent=2))
