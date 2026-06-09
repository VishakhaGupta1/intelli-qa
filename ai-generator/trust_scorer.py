from __future__ import annotations
from typing import Any, Dict, List

def score_test_cases(test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates the quality of AI-generated test cases.
    Returns individual scores and an overall batch average.
    """
    if not test_cases:
        return {"overall_score": 0, "endpoint_scores": []}

    scored_cases = []
    
    # Track endpoint paths to check for Check 1 (Happy path only)
    endpoint_statuses = {} # Map of "METHOD PATH" -> set of expected status codes
    for tc in test_cases:
        method = str(tc.get("method") or tc.get("httpMethod") or "GET").upper()
        path = str(tc.get("path") or "/")
        endpoint_key = f"{method} {path}"
        status = int(tc.get("expected_status") or tc.get("expectedStatusCode") or 200)
        
        if endpoint_key not in endpoint_statuses:
            endpoint_statuses[endpoint_key] = set()
        endpoint_statuses[endpoint_key].add(status)

    # Track duplicates for Check 4
    seen_tests = {} # Map of "METHOD PATH STATUS" -> count

    for tc in test_cases:
        score = 100
        deductions = []
        
        test_name = str(tc.get("test_name") or tc.get("testName") or "")
        description = str(tc.get("description") or "")
        method = str(tc.get("method") or tc.get("httpMethod") or "GET").upper()
        path = str(tc.get("path") or "/")
        status = int(tc.get("expected_status") or tc.get("expectedStatusCode") or 200)
        endpoint_key = f"{method} {path}"
        
        # Check 1: Happy path only? (-20)
        # Check if this endpoint has ANY 4xx status test case in the whole batch
        has_failure_scenario = any(400 <= s < 500 for s in endpoint_statuses.get(endpoint_key, set()))
        if not has_failure_scenario:
            score -= 20
            deductions.append("Missing 4xx failure scenario for this endpoint (-20)")

        # Check 2: Weak assertion? (-15)
        # Check for user-specified keys or assertions/expectedResponseContains
        has_field_validation = any([
            tc.get("expectedField"),
            tc.get("expectedBody"),
            tc.get("assertions"),
            tc.get("expectedResponseContains")
        ])
        if not has_field_validation:
            score -= 15
            deductions.append("No body/field validation found (-15)")

        # Check 3: Missing edge case? (-15)
        # Check if input (body or parameters) contains edge case values
        body = tc.get("body") or tc.get("requestBody") or {}
        params = tc.get("parameters") or []
        
        input_values = []
        if isinstance(body, dict):
            input_values.extend(body.values())
        elif isinstance(body, list):
            input_values.extend(body)
            
        for p in params:
            if isinstance(p, dict):
                input_values.append(p.get("value"))
        
        edge_case_values = [None, "", [], {}]
        has_edge_case = any(val in edge_case_values for val in input_values)
        
        # Also check description/name for "null", "empty", "missing"
        if not has_edge_case:
            text_to_check = (test_name + description).lower()
            if any(word in text_to_check for word in ["null", "empty", "missing", "invalid"]):
                has_edge_case = True
                
        if not has_edge_case:
            score -= 15
            deductions.append("Missing edge case (null, empty, or missing field) (-15)")

        # Check 4: Duplicate test? (-25)
        test_sig = f"{method} {path} {status}"
        if test_sig in seen_tests:
            score -= 25
            deductions.append(f"Duplicate test detected: {test_sig} (-25)")
        seen_tests[test_sig] = seen_tests.get(test_sig, 0) + 1

        # Check 5: Missing test name/description? (-10)
        generic_names = ["test1", "testendpoint", "generatedtest", "test"]
        is_generic = test_name.lower().strip() in generic_names or not test_name
        if is_generic or not description:
            score -= 10
            deductions.append("Missing or generic test name/description (-10)")

        # Ensure score doesn't go below 0
        final_score = max(0, score)
        
        scored_cases.append({
            "testName": test_name,
            "endpoint": endpoint_key,
            "score": final_score,
            "deductions": deductions
        })

    overall_score = sum(sc["score"] for sc in scored_cases) // len(scored_cases) if scored_cases else 0
    
    return {
        "overall_score": int(overall_score),
        "endpoint_scores": scored_cases
    }
