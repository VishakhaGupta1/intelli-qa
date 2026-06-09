from __future__ import annotations

import re
from typing import Callable

from logging_config import get_logger

logger = get_logger(__name__)

EMAIL_RE = re.compile(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}\b')
PHONE_RE = re.compile(r'(?<!\d)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?!\d)')
SSN_RE = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
CARD_RE = re.compile(r'\b(?:\d[ -]*?){13,19}\b')
IPV4_RE = re.compile(r'\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b')

ALLOWED_FIELDS = {
    'status_code',
    'method',
    'path',
    'content_type',
}

DENIED_FIELDS = {
    'password',
    'token',
    'secret',
    'authorization',
    'api_key',
    'ssn',
    'credit_card',
    'dob',
    'email',
    'phone',
}


def _luhn_valid(candidate: str) -> bool:
    digits = [int(char) for char in candidate if char.isdigit()]
    if not 13 <= len(digits) <= 19:
        return False
    checksum = 0
    parity = len(digits) % 2
    for index, digit in enumerate(digits):
        if index % 2 == parity:
            digit *= 2
            if digit > 9:
                digit -= 9
        checksum += digit
    return checksum % 10 == 0


def _redact_with_pattern(text: str, pattern: re.Pattern[str], replacement: str, validator: Callable[[str], bool] | None = None) -> tuple[str, int]:
    count = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal count
        value = match.group(0)
        if validator is not None and not validator(value):
            return value
        count += 1
        return replacement

    return pattern.sub(repl, text), count


def redact(text: str, field_name: str | None = None) -> str:
    original = "" if text is None else str(text)
    normalized_field = (field_name or '').lower()

    if normalized_field in ALLOWED_FIELDS:
        return original

    if normalized_field in DENIED_FIELDS:
        logger.warning("Redacted sensitive data in %s", normalized_field or 'value')
        return '[REDACTED]'

    redacted = original
    total_replacements = 0

    for pattern, replacement, validator in (
        (EMAIL_RE, "[EMAIL]", None),
        (PHONE_RE, "[PHONE]", None),
        (SSN_RE, "[SSN]", None),
        (CARD_RE, "[CREDIT_CARD]", _luhn_valid),
        (IPV4_RE, "[IP]", None),
    ):
        redacted, replacements = _redact_with_pattern(redacted, pattern, replacement, validator)
        total_replacements += replacements

    if total_replacements > 0:
        logger.warning("Redacted sensitive data in %s", normalized_field or 'value')

    return redacted


def redact_structure(value, field_name: str | None = None):
    if isinstance(value, dict):
        return {
            key: redact_structure(inner_value, key)
            for key, inner_value in value.items()
        }
    if isinstance(value, list):
        return [redact_structure(item, field_name) for item in value]
    if isinstance(value, str):
        return redact(value, field_name)
    return value


def redact_value(value, field_name: str | None = None):
	return redact_structure(value, field_name)
