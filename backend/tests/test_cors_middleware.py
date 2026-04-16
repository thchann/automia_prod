import importlib
import os
import sys
import unittest

from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient


def load_main_with_env(cors_origins: str | None):
    if cors_origins is None:
        os.environ.pop("CORS_ORIGINS", None)
    else:
        os.environ["CORS_ORIGINS"] = cors_origins

    sys.modules.pop("backend.main", None)
    return importlib.import_module("backend.main")


class CorsMiddlewareTests(unittest.TestCase):
    def test_parse_cors_origins_uses_defaults_when_env_missing(self):
        main = load_main_with_env(None)
        self.assertEqual(
            main._parse_cors_origins(),
            [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:8080",
            ],
        )

    def test_parse_cors_origins_parses_and_trims_env_values(self):
        main = load_main_with_env(" https://a.com ,https://b.com,   https://c.com ")
        self.assertEqual(
            main._parse_cors_origins(),
            ["https://a.com", "https://b.com", "https://c.com"],
        )

    def test_parse_cors_origins_ignores_empty_tokens(self):
        main = load_main_with_env("https://a.com, ,,, https://b.com , ")
        self.assertEqual(main._parse_cors_origins(), ["https://a.com", "https://b.com"])

    def test_cors_preflight_allowed_origin_is_not_405_and_sets_headers(self):
        main = load_main_with_env("https://allowed.example")
        client = TestClient(main.app)
        response = client.options(
            "/auth/register",
            headers={
                "Origin": "https://allowed.example",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertNotEqual(response.status_code, 405)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "https://allowed.example")
        self.assertEqual(response.headers.get("access-control-allow-credentials"), "true")

    def test_cors_preflight_disallowed_origin_is_rejected(self):
        main = load_main_with_env("https://allowed.example")
        client = TestClient(main.app)
        response = client.options(
            "/auth/register",
            headers={
                "Origin": "https://blocked.example",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertNotEqual(response.status_code, 405)
        self.assertNotEqual(response.headers.get("access-control-allow-origin"), "https://blocked.example")

    def test_cors_headers_are_present_on_normal_request(self):
        main = load_main_with_env("https://allowed.example")
        client = TestClient(main.app)
        response = client.get("/health", headers={"Origin": "https://allowed.example"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "https://allowed.example")
        self.assertEqual(response.headers.get("access-control-allow-credentials"), "true")

    def test_cors_middleware_is_registered_with_expected_options(self):
        main = load_main_with_env("https://allowed.example")
        cors_entries = [m for m in main.app.user_middleware if m.cls is CORSMiddleware]
        self.assertEqual(len(cors_entries), 1)
        cors = cors_entries[0]
        self.assertTrue(cors.kwargs.get("allow_credentials"))
        self.assertEqual(cors.kwargs.get("allow_methods"), ["*"])
        self.assertEqual(cors.kwargs.get("allow_headers"), ["*"])
        self.assertEqual(cors.kwargs.get("allow_origins"), ["https://allowed.example"])


if __name__ == "__main__":
    unittest.main()
