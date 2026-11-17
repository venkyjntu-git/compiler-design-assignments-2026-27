import unittest
from compiler.lexer import tokenize
from compiler.parser import Parser

class ParserTests(unittest.TestCase):
    def test_valid_expression(self):
        tree = Parser(tokenize("2 + 3 * 4")).parse()
        self.assertIsNotNone(tree)

    def test_missing_parenthesis(self):
        with self.assertRaises(SyntaxError):
            Parser(tokenize("(2 + 3")).parse()
