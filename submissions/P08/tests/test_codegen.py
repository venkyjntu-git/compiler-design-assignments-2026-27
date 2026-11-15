import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import subprocess
import tempfile
from pathlib import Path

from compiler.optimizer import OptimizerConfig
from main import compile_program, run_compiled

ROOT = Path(__file__).resolve().parent.parent
NOOPT = OptimizerConfig(enabled=False)


def run(src, inputs=None, config=None):
    return run_compiled(compile_program(src, config=config, save=False), inputs)


class TestCodegen(unittest.TestCase):
    def test_nested_loops_and_assignment_text(self):
        code = compile_program("tensor A[2, 2]\ntensor B[2, 2]\ntensor C[2, 2]\n"
                               "C[i, j] = A[i, j] + B[i, j]", "examples/addition.dsl",
                               save=False).code
        for text in ("for i in range(2):", "for j in range(2):",
                     "C[i][j] = A[i][j] + B[i][j]", "def run(inputs):",
                     "Source DSL file: examples/addition.dsl",
                     "C = [[0] * 2 for _ in range(2)]"):
            self.assertIn(text, code)
        compile(code, "<t>", "exec")

    def test_header_lists_applied_optimizations(self):
        src = ("tensor A[2, 3]\ntensor B[3, 2]\ntensor C[2, 2]\n"
               "C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)")
        code = compile_program(src, save=False).code
        self.assertIn("loop interchange", code)
        self.assertIn("+=", code)
        off = compile_program(src, config=NOOPT, save=False).code
        self.assertIn("Optimizations applied: none", off)
        self.assertIn("for k in range(3):", off)

    def test_vector_matrix_and_3d(self):
        out = run("tensor V[3]\ntensor W[3]\nW[i] = V[i] * 2 + 1", {"V": [1, 2, 3]})
        self.assertEqual(out["W"], [3, 5, 7])
        t = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]]
        out = run("tensor X[2, 2, 2]\ntensor Y[2, 2, 2]\nY[i, j, k] = X[i, j, k] * 3 - 1", {"X": t})
        self.assertEqual(out["Y"], [[[2, 5], [8, 11]], [[14, 17], [20, 23]]])

    def test_matrix_vector_product(self):
        out = run("tensor A[2, 3]\ntensor V[3]\ntensor R[2]\nR[i] = sum(A[i, k] * V[k], k, 0, 3)",
                  {"A": [[1, 2, 3], [4, 5, 6]], "V": [1, 0, 2]})
        self.assertEqual(out["R"], [7, 16])

    def test_expression_structure_preserved(self):
        base = "tensor A[1]\ntensor B[1]\ntensor D[1]\ntensor C[1]\n"
        ins = {"A": [10], "B": [4], "D": [3]}
        self.assertEqual(run(base + "C[i] = A[i] - (B[i] - D[i])", ins)["C"], [9])
        self.assertEqual(run(base + "C[i] = A[i] * (B[i] + D[i])", ins)["C"], [70])
        self.assertEqual(run(base + "C[i] = A[i] - B[i] - D[i]", ins)["C"], [3])

    def test_float_and_negative_constants(self):
        out = run("tensor A[2]\ntensor B[2]\nB[i] = A[i] * 0.5 + (3 - 5)", {"A": [4, 8]})
        self.assertEqual(out["B"], [0.0, 2.0])

    def test_constant_only_assignment(self):
        self.assertEqual(run("tensor A[3]\nA[i] = 2 * 3")["A"], [6, 6, 6])

    def test_sum_inside_larger_expression_uses_temporary(self):
        src = ("tensor A[2, 2]\ntensor B[2, 2]\ntensor D[2, 2]\ntensor C[2, 2]\n"
               "C[i, j] = 2 * sum(A[i, k] * B[k, j], k, 0, 2) + D[i, j]")
        ins = {"A": [[1, 2], [3, 4]], "B": [[5, 6], [7, 8]], "D": [[1, 1], [1, 1]]}
        for cfg in (None, NOOPT):
            self.assertEqual(run(src, ins, cfg)["C"], [[39, 45], [87, 101]])

    def test_generated_file_saved_and_runnable(self):
        with tempfile.TemporaryDirectory() as tmp:
            c = compile_program("tensor A[2, 2]\ntensor B[2, 2]\ntensor C[2, 2]\n"
                                "C[i, j] = A[i, j] + B[i, j]", "examples/addition.dsl",
                                output_dir=tmp)
            self.assertEqual(c.generated_path, Path(tmp) / "addition.py")
            self.assertEqual(c.generated_path.read_text(encoding="utf-8"), c.code)
            res = subprocess.run([sys.executable, str(c.generated_path)], capture_output=True,
                                 text=True, cwd=str(ROOT))
            self.assertEqual(res.returncode, 0, res.stderr)
            self.assertIn("C = [[6, 8], [10, 12]]", res.stdout)
            n = compile_program("tensor A[1]\nA[i] = 1", "x.dsl", config=NOOPT, output_dir=tmp)
            self.assertEqual(n.generated_path.name, "x_noopt.py")


if __name__ == "__main__":
    unittest.main()
