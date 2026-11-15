"""
Unit Tests for backend.ast_parser
"""

import unittest
import ast
import os
import sys

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.ast_parser import (
    parse_code,
    ast_to_dict,
    get_ast_statistics,
    get_node_category
)


class TestASTParser(unittest.TestCase):

    def test_valid_code_parsing(self):
        code = "def add(x, y):\n    return x + y\n"
        ok, tree, err = parse_code(code)
        self.assertTrue(ok)
        self.assertIsNotNone(tree)
        self.assertIsNone(err)
        self.assertIsInstance(tree, ast.Module)

    def test_empty_code_parsing(self):
        code = "   \n\t  "
        ok, tree, err = parse_code(code)
        self.assertFalse(ok)
        self.assertIsNone(tree)
        self.assertEqual(err["error_type"], "EmptyInputError")

    def test_syntax_error_reporting(self):
        invalid_code = "def invalid_func(\n    print('missing paren'"
        ok, tree, err = parse_code(invalid_code)
        self.assertFalse(ok)
        self.assertIsNone(tree)
        self.assertEqual(err["error_type"], "SyntaxError")
        self.assertGreater(err["line"], 0)
        self.assertIn("Python Syntax Error", err["message"])

    def test_ast_to_dict_structure(self):
        code = "x = 42 + 8"
        ok, tree, err = parse_code(code)
        self.assertTrue(ok)

        tree_dict = ast_to_dict(tree)
        self.assertEqual(tree_dict["name"], "Module")
        self.assertIn("children", tree_dict)
        self.assertGreater(len(tree_dict["children"]), 0)

        assign_node = tree_dict["children"][0]
        self.assertEqual(assign_node["name"], "Assign")
        self.assertEqual(assign_node["category"], "Statement")
        self.assertIn("doc", assign_node)

    def test_node_categories(self):
        code = "if True:\n    for i in range(1):\n        x = 10 + 20"
        _, tree, _ = parse_code(code)
        if_node = tree.body[0]
        for_node = if_node.body[0]
        assign_node = for_node.body[0]
        binop_node = assign_node.value

        self.assertEqual(get_node_category(if_node), "ControlFlow")
        self.assertEqual(get_node_category(for_node), "ControlFlow")
        self.assertEqual(get_node_category(assign_node), "Statement")
        self.assertEqual(get_node_category(binop_node), "Operation")
        self.assertEqual(get_node_category(binop_node.left), "Constant")
        self.assertEqual(get_node_category(assign_node.targets[0]), "Identifier")

    def test_ast_statistics(self):
        code = """def calc(a, b):
    if a > b:
        return a - b
    else:
        return b - a
"""
        ok, tree, _ = parse_code(code)
        self.assertTrue(ok)

        stats = get_ast_statistics(tree, code)
        self.assertGreater(stats["total_nodes"], 10)
        self.assertGreater(stats["max_depth"], 3)
        self.assertIn("FunctionDef", stats["node_types"])
        self.assertIn("If", stats["node_types"])
        self.assertEqual(stats["node_types"]["FunctionDef"], 1)
        self.assertGreater(stats["cyclomatic_complexity"], 1)


if __name__ == "__main__":
    unittest.main()
