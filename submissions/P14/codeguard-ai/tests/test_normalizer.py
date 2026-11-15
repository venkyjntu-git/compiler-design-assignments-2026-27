"""
Unit Tests for backend.normalizer
"""

import unittest
import ast
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.ast_parser import parse_code
from backend.normalizer import normalize_ast, BUILTIN_IDENTIFIERS


class TestASTNormalizer(unittest.TestCase):

    def test_variable_normalization(self):
        code = """total_sum = 0
for count in range(10):
    total_sum += count
print(total_sum)
"""
        ok, tree, _ = parse_code(code)
        self.assertTrue(ok)

        norm_tree, norm_code, meta = normalize_ast(tree, {"normalize_variables": True})
        self.assertIn("total_sum", meta["variable_map"])
        self.assertIn("count", meta["variable_map"])
        # Built-in print and range should NOT be renamed
        self.assertNotIn("print", meta["variable_map"])
        self.assertNotIn("range", meta["variable_map"])
        self.assertIn("var_", norm_code)

    def test_function_and_param_normalization(self):
        code = """def multiply_numbers(first_val, second_val):
    result = first_val * second_val
    return result

res = multiply_numbers(4, 5)
"""
        ok, tree, _ = parse_code(code)
        self.assertTrue(ok)

        norm_tree, norm_code, meta = normalize_ast(tree, {
            "normalize_variables": True,
            "normalize_functions": True
        })
        self.assertIn("multiply_numbers", meta["function_map"])
        self.assertIn("first_val", meta["param_map"])
        self.assertIn("second_val", meta["param_map"])
        self.assertIn("def func_0(param_0, param_1):", norm_code)
        self.assertIn("func_0(4, 5)", norm_code)

    def test_docstring_stripping(self):
        code = '''"""Module docstring."""
def sample():
    """Function docstring."""
    return 10
'''
        ok, tree, _ = parse_code(code)
        self.assertTrue(ok)

        _, norm_code, _ = normalize_ast(tree, {"strip_docstrings": True})
        self.assertNotIn("Module docstring", norm_code)
        self.assertNotIn("Function docstring", norm_code)

    def test_constant_normalization_toggle(self):
        code = "val = 100\nmsg = 'hello'"
        ok, tree, _ = parse_code(code)
        self.assertTrue(ok)

        # By default, constants are preserved
        _, preserved_code, _ = normalize_ast(tree, {"normalize_constants": False})
        self.assertIn("100", preserved_code)
        self.assertIn("'hello'", preserved_code)

        # When enabled, constants are normalized
        _, norm_code, _ = normalize_ast(tree, {"normalize_constants": True})
        self.assertIn("0", norm_code)
        self.assertNotIn("100", norm_code)


if __name__ == "__main__":
    unittest.main()
