import unittest
from compiler.lexer import tokenize

class LexerTests(unittest.TestCase):
    def test_numbers_and_operators(self):
        kinds = [t.kind for t in tokenize("12 + 3")]
        self.assertEqual(kinds, ["NUMBER", "+", "NUMBER", "EOF"])

    def test_invalid_character(self):
        with self.assertRaises(SyntaxError):
            tokenize("2 @ 3")
