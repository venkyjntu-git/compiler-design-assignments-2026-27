import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from compiler import LexError
from compiler.lexer import tokenize


def kinds(src):
    return [t.kind for t in tokenize(src)]


class TestLexer(unittest.TestCase):
    def test_declaration_tokens(self):
        self.assertEqual(kinds("tensor A[2, 3]"),
                         ["TENSOR", "IDENT", "LBRACKET", "NUMBER", "COMMA", "NUMBER",
                          "RBRACKET", "NEWLINE", "EOF"])

    def test_assignment_tokens(self):
        self.assertEqual(kinds("C[i] = A[i] + 2 * B[i] - 1"),
                         ["IDENT", "LBRACKET", "IDENT", "RBRACKET", "EQUALS", "IDENT",
                          "LBRACKET", "IDENT", "RBRACKET", "PLUS", "NUMBER", "STAR", "IDENT",
                          "LBRACKET", "IDENT", "RBRACKET", "MINUS", "NUMBER", "NEWLINE", "EOF"])

    def test_sum_keyword_parentheses_commas(self):
        ks = kinds("sum(A[i], i, 0, 3)")
        self.assertEqual(ks[:2], ["SUM", "LPAREN"])
        self.assertIn("COMMA", ks)
        self.assertIn("RPAREN", ks)

    def test_numbers_int_and_float(self):
        toks = [t for t in tokenize("3 2.5 1e2") if t.kind == "NUMBER"]
        self.assertEqual([t.value for t in toks], [3, 2.5, 100.0])
        self.assertIsInstance(toks[0].value, int)
        self.assertIsInstance(toks[1].value, float)

    def test_comments_and_blank_lines(self):
        ks = kinds("# comment\n\ntensor A[1]  # trailing\n")
        self.assertEqual(ks[0], "TENSOR")
        self.assertEqual(ks.count("NEWLINE"), 1)

    def test_positions(self):
        toks = tokenize("C[i] = 1")
        self.assertEqual((toks[0].line, toks[0].col), (1, 1))
        self.assertEqual((toks[4].kind, toks[4].col), ("EQUALS", 6))

    def test_invalid_character_reports_position(self):
        with self.assertRaises(LexError) as cm:
            tokenize("C[i] = A[i] $ 2")
        self.assertEqual((cm.exception.line, cm.exception.col), (1, 13))
        self.assertIn("invalid character", str(cm.exception))

    def test_unsupported_operator(self):
        with self.assertRaises(LexError) as cm:
            tokenize("C[i] = A[i] / 2")
        self.assertIn("unsupported operator '/'", str(cm.exception))

    def test_malformed_numbers(self):
        for bad in ("C[i] = 3.", "C[i] = 12abc", "C[i] = 1.2.3"):
            with self.assertRaises(LexError, msg=bad):
                tokenize(bad)

    def test_error_line_number(self):
        with self.assertRaises(LexError) as cm:
            tokenize("tensor A[2]\nA[i] = ?")
        self.assertEqual(cm.exception.line, 2)


if __name__ == "__main__":
    unittest.main()
