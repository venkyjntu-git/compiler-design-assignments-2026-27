"""
Unit & Integration Tests for backend.similarity, comparator, and database
"""

import unittest
import os
import sys
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.comparator import compare_programs
from backend.database import (
    init_db,
    save_comparison,
    get_history,
    get_comparison_by_id,
    delete_comparison,
    clear_history
)
from sample_codes.samples import SAMPLES


class TestSimilarityAndComparator(unittest.TestCase):

    def test_case1_identical_programs(self):
        sample = SAMPLES["case1_identical"]
        result = compare_programs(sample["program_a"], sample["program_b"])
        self.assertTrue(result["success"])
        self.assertEqual(result["metrics"]["ast_similarity"], 100.0)
        self.assertEqual(result["metrics"]["text_similarity"], 100.0)
        self.assertEqual(result["metrics"]["similarity_category"], "High structural similarity")

    def test_case2_whitespace_comments(self):
        sample = SAMPLES["case2_whitespace_comments"]
        result = compare_programs(sample["program_a"], sample["program_b"])
        self.assertTrue(result["success"])
        # AST should identify exact structural identity regardless of comments
        self.assertEqual(result["metrics"]["ast_similarity"], 100.0)
        # Text similarity must be noticeably lower because of verbose comments/docstrings
        self.assertLess(result["metrics"]["text_similarity"], 85.0)

    def test_case3_renamed_variables(self):
        sample = SAMPLES["case3_renamed_variables"]
        # With normalization enabled:
        result = compare_programs(
            sample["program_a"],
            sample["program_b"],
            {"normalize_variables": True, "normalize_functions": True}
        )
        self.assertTrue(result["success"])
        self.assertGreaterEqual(result["metrics"]["ast_similarity"], 95.0)
        self.assertEqual(result["metrics"]["similarity_category"], "High structural similarity")

        # Without normalization, similarity drops because identifier names mismatch:
        unnorm_result = compare_programs(
            sample["program_a"],
            sample["program_b"],
            {"normalize_variables": False, "normalize_functions": False}
        )
        self.assertLess(
            unnorm_result["metrics"]["subtree_jaccard"],
            result["metrics"]["subtree_jaccard"]
        )

    def test_case4_modified_statements(self):
        sample = SAMPLES["case4_modified_statements"]
        result = compare_programs(sample["program_a"], sample["program_b"])
        self.assertTrue(result["success"])
        # Should be moderate to high
        self.assertGreater(result["metrics"]["ast_similarity"], 50.0)
        self.assertLess(result["metrics"]["ast_similarity"], 98.0)

    def test_case5_different_logic(self):
        sample = SAMPLES["case5_different_logic"]
        result = compare_programs(sample["program_a"], sample["program_b"])
        self.assertTrue(result["success"])
        self.assertLess(result["metrics"]["ast_similarity"], 50.0)
        self.assertEqual(result["metrics"]["similarity_category"], "Low structural similarity")

    def test_matched_code_regions(self):
        sample = SAMPLES["case3_renamed_variables"]
        result = compare_programs(sample["program_a"], sample["program_b"])
        self.assertIn("matched_regions", result)
        self.assertGreater(len(result["matched_regions"]), 0)
        for r in result["matched_regions"]:
            self.assertIn("lines_a", r)
            self.assertIn("lines_b", r)


class TestDatabaseLayer(unittest.TestCase):

    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.temp_db_path = self.temp_db.name
        self.temp_db.close()
        init_db(self.temp_db_path)

    def tearDown(self):
        if os.path.exists(self.temp_db_path):
            try:
                os.remove(self.temp_db_path)
            except Exception:
                pass

    def test_save_and_retrieve_history(self):
        sample = SAMPLES["case1_identical"]
        result = compare_programs(sample["program_a"], sample["program_b"])

        comp_id = save_comparison(
            program_a_name="TestA",
            program_b_name="TestB",
            comparison_result=result,
            code_a=sample["program_a"],
            code_b=sample["program_b"],
            db_path=self.temp_db_path
        )
        self.assertGreater(comp_id, 0)

        history = get_history(db_path=self.temp_db_path)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["program_a_name"], "TestA")
        self.assertEqual(history[0]["ast_similarity"], 100.0)

        record = get_comparison_by_id(comp_id, db_path=self.temp_db_path)
        self.assertIsNotNone(record)
        self.assertEqual(record["ast_similarity"], 100.0)
        self.assertIn("details", record)

        deleted = delete_comparison(comp_id, db_path=self.temp_db_path)
        self.assertTrue(deleted)
        self.assertEqual(len(get_history(db_path=self.temp_db_path)), 0)


if __name__ == "__main__":
    unittest.main()
