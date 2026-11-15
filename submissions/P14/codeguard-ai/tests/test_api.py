"""
Integration Tests for Flask API Endpoints
"""

import unittest
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from sample_codes.samples import SAMPLES


class TestFlaskAPI(unittest.TestCase):

    def setUp(self):
        self.app = app
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_index_route(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"CodeGuard AI", response.data)

    def test_samples_endpoint(self):
        response = self.client.get("/api/samples")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertIn("case1_identical", data["samples"])

    def test_generate_ast_endpoint(self):
        payload = {
            "code": "def hello():\n    return 'world'",
            "normalize": True
        }
        response = self.client.post(
            "/api/ast",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertIn("ast_tree", data)
        self.assertIn("stats", data)

    def test_generate_ast_syntax_error(self):
        payload = {"code": "def broken_func("}
        response = self.client.post(
            "/api/ast",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data["success"])
        self.assertEqual(data["error"]["error_type"], "SyntaxError")

    def test_compare_endpoint(self):
        sample = SAMPLES["case1_identical"]
        payload = {
            "code_a": sample["program_a"],
            "code_b": sample["program_b"],
            "name_a": "TestA",
            "name_b": "TestB",
            "normalization": {"normalize_variables": True},
            "save_to_history": True
        }
        response = self.client.post(
            "/api/compare",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["metrics"]["ast_similarity"], 100.0)
        self.assertIsNotNone(data["history_id"])

        # Verify history retrieval
        hist_resp = self.client.get("/api/history")
        self.assertEqual(hist_resp.status_code, 200)
        hist_data = json.loads(hist_resp.data)
        self.assertGreater(hist_data["count"], 0)

        # Retrieve specific record
        rec_id = data["history_id"]
        rec_resp = self.client.get(f"/api/history/{rec_id}")
        self.assertEqual(rec_resp.status_code, 200)
        rec_data = json.loads(rec_resp.data)
        self.assertTrue(rec_data["success"])

        # Delete record
        del_resp = self.client.delete(f"/api/history/{rec_id}")
        self.assertEqual(del_resp.status_code, 200)


if __name__ == "__main__":
    unittest.main()
