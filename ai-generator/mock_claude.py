from __future__ import annotations

from typing import Any, Dict, List


def _concrete_path(method: str, path: str) -> str:
	method = (method or "GET").upper()
	path = path or "/"
	if path == "/api/products/{id}":
		return "/api/products/1"
	if path == "/api/users/{id}":
		return "/api/users/1"
	if path == "/api/orders/{id}":
		return "/api/orders/1"
	return path


def _safe_name(method: str, path: str, suffix: str) -> str:
	path_slug = path.strip("/").replace("{", "").replace("}", "").replace("/", "_").replace("-", "_").replace(".", "_") or "root"
	return f"{method.lower()}{path_slug.title().replace('_', '')}{suffix}"


def get_mock_response(endpoint: Dict[str, Any]) -> Dict[str, Any]:
	method = (endpoint.get("method") or "GET").upper()
	path = endpoint.get("path") or "/"
	concrete_path = _concrete_path(method, path)

	if path == "/health":
		return {
			"tests": [
				{
					"test_name": "getHealthReturnsOk",
					"description": "Health check returns a live ok response.",
					"method": "GET",
					"path": "/health",
					"expected_status": 200,
					"headers": {"Accept": "application/json"},
					"body": {},
					"assertions": ["status is ok", "version is returned"],
				}
			]
		}

	if path == "/api/products":
		if method == "GET":
			return {
				"tests": [
					{
						"test_name": "getApiProductsReturnsArray",
						"description": "Products list returns an array of products.",
						"method": "GET",
						"path": "/api/products",
						"expected_status": 200,
						"headers": {"Accept": "application/json"},
						"body": {},
						"assertions": ["response is an array"],
					}
				]
			}
		if method == "POST":
			return {
				"tests": [
					{
						"test_name": "postApiProductsCreatesProduct",
						"description": "Creating a product returns a 201 response.",
						"method": "POST",
						"path": "/api/products",
						"expected_status": 201,
						"headers": {"Accept": "application/json"},
						"body": {"name": "Orbit Desk", "description": "A compact desk lamp", "price": 49.99, "category": "home", "inStock": True},
						"assertions": ["created product has an id"],
					}
				]
			}

	if path == "/api/products/{id}":
		if method == "GET":
			return {
				"tests": [
					{
						"test_name": "getApiProductsIdHappyPath",
						"description": "Existing product lookup returns a product.",
						"method": "GET",
						"path": "/api/products/1",
						"expected_status": 200,
						"headers": {"Accept": "application/json"},
						"body": {},
						"assertions": ["id field present"],
					},
					{
						"test_name": "getApiProductsIdNotFound",
						"description": "Missing product returns 404.",
						"method": "GET",
						"path": "/api/products/99999",
						"expected_status": 404,
						"headers": {"Accept": "application/json"},
						"body": {},
						"assertions": ["not found response"],
					},
				]
			}
		if method == "PUT":
			return {
				"tests": [
					{
						"test_name": "putApiProductsIdUpdatesProduct",
						"description": "Updating a product returns a 200 response.",
						"method": "PUT",
						"path": "/api/products/1",
						"expected_status": 200,
						"headers": {"Accept": "application/json"},
						"body": {"name": "Orbit Desk Pro", "description": "An upgraded compact desk lamp", "price": 59.99, "category": "home", "inStock": False},
						"assertions": ["updated product has an id"],
					}
				]
			}
		if method == "DELETE":
			return {
				"tests": [
					{
						"test_name": "deleteApiProductsIdDeletesProduct",
						"description": "Deleting a product returns a 200 response.",
						"method": "DELETE",
						"path": "/api/products/1",
						"expected_status": 200,
						"headers": {"Accept": "application/json"},
						"body": {},
						"assertions": ["delete response is returned"],
					}
				]
			}

	if path == "/api/users":
		if method == "GET":
			return {
				"tests": [
					{
						"test_name": "getApiUsersReturnsArray",
						"description": "Users list returns an array of users.",
						"method": "GET",
						"path": "/api/users",
						"expected_status": 200,
						"headers": {"Accept": "application/json"},
						"body": {},
						"assertions": ["response is an array"],
					}
				]
			}
		if method == "POST":
			return {
				"tests": [
					{
						"test_name": "postApiUsersCreatesUser",
						"description": "Creating a user returns a 201 response.",
						"method": "POST",
						"path": "/api/users",
						"expected_status": 201,
						"headers": {"Accept": "application/json"},
						"body": {"name": "Jordan Lee", "email": "jordan.lee@example.com", "role": "customer"},
						"assertions": ["created user has an id"],
					}
				]
			}

	if path == "/api/users/{id}" and method == "GET":
		return {
			"tests": [
				{
					"test_name": "getApiUsersIdReturnsUser",
					"description": "Existing user lookup returns a user.",
					"method": "GET",
					"path": "/api/users/1",
					"expected_status": 200,
					"headers": {"Accept": "application/json"},
					"body": {},
					"assertions": ["id field present"],
				}
			]
		}

	if path == "/api/orders":
		if method == "GET":
			return {
				"tests": [
					{
						"test_name": "getApiOrdersReturnsArray",
						"description": "Orders list returns an array of orders.",
						"method": "GET",
						"path": "/api/orders",
						"expected_status": 200,
						"headers": {"Accept": "application/json"},
						"body": {},
						"assertions": ["response is an array"],
					}
				]
			}
		if method == "POST":
			return {
				"tests": [
					{
						"test_name": "postApiOrdersCreatesOrder",
						"description": "Creating an order returns a 201 response.",
						"method": "POST",
						"path": "/api/orders",
						"expected_status": 201,
						"headers": {"Accept": "application/json"},
						"body": {"userId": 1, "productIds": [1, 2], "status": "pending", "total": 199.98},
						"assertions": ["created order has an id"],
					}
				]
			}

	if path == "/api/orders/{id}" and method == "GET":
		return {
			"tests": [
				{
					"test_name": "getApiOrdersIdSuccess",
					"description": "Returns details for a specific order.",
					"method": "GET",
					"path": "/api/orders/1",
					"expected_status": 200,
					"headers": {"Accept": "application/json"},
					"body": {},
					"assertions": ["orderId matches", "total is correct"],
				}
			]
		}

	return {
		"tests": [
			{
				"test_name": _safe_name(method, path, "HappyPath"),
				"description": f"Valid {method} request returns a successful response.",
				"method": method,
				"path": concrete_path,
				"expected_status": 200,
				"headers": {"Accept": "application/json"},
				"body": {},
				"assertions": ["status code matches"],
			}
		]
	}


def get_mock_test_cases(endpoint: Dict[str, Any]) -> List[Dict[str, Any]]:
	return list(get_mock_response(endpoint)["tests"])