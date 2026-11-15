import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from compiler import ParseError
from compiler.ast_nodes import (Assignment, BinaryOperation, Number, Program, SumExpression,
                                TensorAccess, TensorDeclaration, format_ast)
from compiler.parser import parse


def acc(name, *idx):
    return TensorAccess(name, list(idx))


class TestParser(unittest.TestCase):
    def test_declaration(self):
        prog = parse("tensor A[2, 3]")
        self.assertEqual(prog, Program([TensorDeclaration("A", [2, 3])]))

    def test_assignment_ast(self):
        prog = parse("C[i, j] = A[i, j] + B[i, j]")
        expected = Assignment(acc("C", "i", "j"),
                              BinaryOperation("+", acc("A", "i", "j"), acc("B", "i", "j")))
        self.assertEqual(prog.statements[0], expected)

    def test_precedence_mul_over_add_and_left_assoc(self):
        stmt = parse("C[i] = A[i] + 2 * B[i] - D[i]").statements[0]
        expected = BinaryOperation(
            "-", BinaryOperation("+", acc("A", "i"), BinaryOperation("*", Number(2), acc("B", "i"))),
            acc("D", "i"))
        self.assertEqual(stmt.value, expected)

    def test_parentheses_override_precedence(self):
        stmt = parse("C[i] = (A[i] + B[i]) * 2").statements[0]
        self.assertEqual(stmt.value, BinaryOperation(
            "*", BinaryOperation("+", acc("A", "i"), acc("B", "i")), Number(2)))

    def test_sum_expression(self):
        stmt = parse("C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)").statements[0]
        self.assertEqual(stmt.value, SumExpression(
            BinaryOperation("*", acc("A", "i", "k"), acc("B", "k", "j")), "k", 0, 3))

    def test_multiple_statements_and_comments(self):
        prog = parse("# c\ntensor A[2]\n\ntensor B[2]\nB[i] = A[i] * 3\n")
        self.assertEqual(len(prog.declarations), 2)
        self.assertEqual(len(prog.assignments), 1)

    def test_format_ast_mentions_nodes(self):
        text = format_ast(parse("tensor A[2]\nA[i] = 1 + 2"))
        for word in ("Program", "TensorDeclaration", "Assignment", "BinaryOperation", "Number"):
            self.assertIn(word, text)

    def _err(self, src):
        with self.assertRaises(ParseError) as cm:
            parse(src)
        return cm.exception

    def test_missing_bracket_has_position(self):
        e = self._err("tensor A[2, 2\nC[i] = 1")
        self.assertEqual(e.line, 1)
        self.assertIn("']'", str(e))

    def test_missing_operand(self):
        e = self._err("C[i] = A[i] +")
        self.assertIn("expected an expression", str(e))
        self.assertEqual(e.line, 1)

    def test_unary_minus_rejected(self):
        self.assertIn("unary", str(self._err("C[i] = -A[i]")))

    def test_unindexed_tensor_rejected(self):
        self.assertIn("must be indexed", str(self._err("C[i] = A + 1")))

    def test_constant_index_rejected(self):
        self.assertIn("variable name", str(self._err("C[0] = 1")))

    def test_bad_dimensions(self):
        self.assertIn("integer", str(self._err("tensor A[2.5]")))
        self.assertIn("at least 1", str(self._err("tensor A[0]")))

    def test_incomplete_sum(self):
        self.assertIn("','", str(self._err("C[i] = sum(A[i], i)")))

    def test_trailing_tokens(self):
        self.assertIn("end of line", str(self._err("C[i] = A[i] B[i]")))

    def test_statement_must_start_properly(self):
        self.assertIn("expected a 'tensor' declaration", str(self._err("= 5")))


if __name__ == "__main__":
    unittest.main()
