import unittest
from compiler.lexer import tokenize
from compiler.parser import Parser
from compiler.semantic import evaluate

def run(source):
    return evaluate(Parser(tokenize(source)).parse())

class AttributeTests(unittest.TestCase):
    def test_synthesized_value(self):
        self.assertEqual(run("2 + 3 * 4"), 14)

    def test_parentheses(self):
        self.assertEqual(run("(2 + 3) * 4"), 20)

    def test_unary(self):
        self.assertEqual(run("-5 + 2"), -3)

    def test_division_by_zero(self):
        with self.assertRaises(ZeroDivisionError):
            run("5 / 0")
