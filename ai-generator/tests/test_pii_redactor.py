from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pii_redactor import redact


class TestPiiRedactor(unittest.TestCase):
    def test_redacts_email(self):
        self.assertEqual(redact('Contact john.doe@example.com'), 'Contact [EMAIL]')

    def test_redacts_phone(self):
        self.assertEqual(redact('Call +1 (555) 123-4567'), 'Call [PHONE]')

    def test_redacts_ssn(self):
        self.assertEqual(redact('SSN 123-45-6789'), 'SSN [SSN]')

    def test_redacts_credit_card(self):
        self.assertEqual(redact('Card 4111 1111 1111 1111'), 'Card [CREDIT_CARD]')

    def test_redacts_ip_address(self):
        self.assertEqual(redact('Server 192.168.1.10'), 'Server [IP]')

    def test_denied_field_redacts_entire_value(self):
        self.assertEqual(redact('john.doe@example.com', field_name='email'), '[REDACTED]')
        self.assertEqual(redact('secret-password', field_name='password'), '[REDACTED]')

    def test_allowed_field_passes_through(self):
        self.assertEqual(redact('GET', field_name='method'), 'GET')
        self.assertEqual(redact('/pet/123', field_name='path'), '/pet/123')

    def test_unknown_field_still_runs_regex(self):
        self.assertEqual(redact('Contact john.doe@example.com', field_name='summary'), 'Contact [EMAIL]')


if __name__ == '__main__':
    unittest.main()
