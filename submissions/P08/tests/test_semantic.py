import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from compiler import SemanticError
from compiler.parser import parse
from compiler.semantic import analyze

DECL = "tensor A[2, 2]\ntensor B[2, 2]\ntensor C[2, 2]\n"


def check(src):
    return analyze(parse(src))


class TestSemantic(unittest.TestCase):
    def fails(self, src, text):
        with self.assertRaises(SemanticError) as cm:
            check(src)
        self.assertIn(text, str(cm.exception))

    def test_valid_programs(self):
        st = check(DECL + "C[i, j] = A[i, j] + B[i, j]")
        self.assertEqual([s.name for s in st.inputs()], ["A", "B"])
        self.assertEqual([s.name for s in st.outputs()], ["C"])
        self.assertEqual(st.get("A").shape, (2, 2))
        self.assertEqual(st.get("A").rank, 2)
        check("tensor A[2, 3]\ntensor B[3, 2]\ntensor C[2, 2]\n"
              "C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)")
        check("tensor V[4]\ntensor W[4]\nW[i] = V[i] * 2")
        check("tensor X[2, 3, 4]\ntensor Y[2, 3, 4]\nY[i, j, l] = X[i, j, l] + 1")

    def test_undeclared_tensor(self):
        self.fails("tensor A[2, 2]\nC[i, j] = A[i, j]", "not declared")
        self.fails("tensor A[2, 2]\ntensor C[2, 2]\nC[i, j] = A[i, j] + Z[i, j]", "not declared")

    def test_use_before_declaration(self):
        self.fails("C[i, j] = A[i, j]\ntensor A[2, 2]\ntensor C[2, 2]", "not declared")

    def test_duplicate_declaration(self):
        self.fails("tensor A[2]\ntensor A[3]\nA[i] = 1", "already declared")

    def test_rank_errors(self):
        self.fails(DECL + "C[i, j] = A[i] + B[i, j]", "rank")
        self.fails(DECL + "C[i] = A[i, j]", "rank")
        self.fails("tensor A[1, 1, 1, 1]\nA[i, j, k, l] = 1", "rank")

    def test_elementwise_shape_mismatch(self):
        self.fails("tensor A[2, 2]\ntensor B[2, 3]\ntensor C[2, 2]\n"
                   "C[i, j] = A[i, j] + B[i, j]", "shape mismatch")

    def test_matmul_inner_dimension_mismatch(self):
        self.fails("tensor A[2, 3]\ntensor B[2, 2]\ntensor C[2, 2]\n"
                   "C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)", "exceeds")

    def test_matmul_result_shape_mismatch(self):
        self.fails("tensor A[2, 3]\ntensor B[3, 4]\ntensor C[2, 2]\n"
                   "C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)", "shape mismatch")

    def test_undefined_index(self):
        self.fails(DECL + "C[i, j] = A[i, k] + B[i, j]", "undefined index 'k'")

    def test_sum_errors(self):
        self.fails("tensor A[2, 3]\ntensor C[2]\nC[i] = sum(A[i, k], k, 0, 4)", "exceeds")
        self.fails("tensor A[2, 3]\ntensor C[2]\nC[i] = sum(A[i, i], k, 0, 2)", "not used")
        self.fails("tensor A[2, 3]\ntensor C[2]\nC[i] = sum(A[i, k], k, 2, 2)", "empty")
        self.fails("tensor A[2, 2]\ntensor C[2]\nC[i] = sum(A[i, i], i, 0, 2)", "shadows")
        self.fails("tensor A[2, 2, 2]\ntensor C[2]\n"
                   "C[i] = sum(sum(A[i, k, l], l, 0, 2), k, 0, 2)", "nested")

    def test_assignment_rules(self):
        self.fails(DECL + "C[i, j] = A[i, j]\nC[i, j] = B[i, j]", "already assigned")
        self.fails(DECL + "C[i, j] = C[i, j] + A[i, j]", "both sides")
        self.fails(DECL + "tensor D[2, 2]\nD[i, j] = C[i, j]\nC[i, j] = A[i, j]",
                   "before it is assigned")
        self.fails(DECL + "C[i, i] = A[i, i]", "duplicate index")

    def test_reserved_and_clashing_names(self):
        self.fails("tensor _x[2]\n_x[i] = 1", "reserved")
        self.fails("tensor min[2]\nmin[i] = 1", "reserved")
        self.fails("tensor i[2]\ntensor B[2]\nB[i] = 1", "clashes")

    def test_no_assignment(self):
        self.fails("tensor A[2]", "no assignment")

    def test_error_carries_line_number(self):
        with self.assertRaises(SemanticError) as cm:
            check("tensor A[2]\n\nB[i] = A[i]")
        self.assertEqual(cm.exception.line, 3)


if __name__ == "__main__":
    unittest.main()
