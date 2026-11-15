import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import contextlib
import io
import json
import subprocess
import tempfile
from pathlib import Path

from main import DSLCompileError, compile_program, main, run_compiled
from compiler.optimizer import OptimizerConfig
from runtime.executor import ExecutionError, default_inputs, execute

ROOT = Path(__file__).resolve().parent.parent
EXAMPLES = ROOT / "examples"
EXPECTED = {
    "addition": {"C": [[6, 8], [10, 12]]},
    "subtraction": {"C": [[-4, -4], [-4, -4]]},
    "multiplication": {"C": [[5, 12], [21, 32]]},
    "scalar": {"B": [[3, 6], [9, 12]]},
    "matrix_multiply": {"C": [[58, 64], [139, 154]]},
    "complex_expression": {"C": [[2, 4], [6, 8]]},
}


def cli(argv):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = main(argv)
    return code, out.getvalue(), err.getvalue()


class TestExamples(unittest.TestCase):
    def test_all_six_example_files_exist_and_are_nonempty(self):
        for name in EXPECTED:
            path = EXAMPLES / f"{name}.dsl"
            self.assertTrue(path.is_file(), name)
            self.assertGreater(len(path.read_text(encoding="utf-8").strip()), 20)

    def test_examples_optimized_and_unoptimized(self):
        with tempfile.TemporaryDirectory() as tmp:
            for name, expected in EXPECTED.items():
                src = (EXAMPLES / f"{name}.dsl").read_text(encoding="utf-8")
                for enabled in (True, False):
                    for tile in (2, 16, 32):
                        cfg = OptimizerConfig(enabled=enabled, tile_size=tile)
                        c = compile_program(src, f"examples/{name}.dsl", cfg, output_dir=tmp)
                        self.assertTrue(c.generated_path.is_file())
                        self.assertEqual(run_compiled(c), expected,
                                         msg=f"{name} opt={enabled} tile={tile}")

    def test_default_inputs_are_deterministic(self):
        self.assertEqual(default_inputs({"A": (2, 2), "B": (2, 2)}),
                         {"A": [[1, 2], [3, 4]], "B": [[5, 6], [7, 8]]})

    def test_custom_inputs(self):
        src = (EXAMPLES / "addition.dsl").read_text(encoding="utf-8")
        c = compile_program(src, save=False)
        out = run_compiled(c, {"A": [[0, 0], [0, 0]], "B": [[1, 1], [1, 1]]})
        self.assertEqual(out["C"], [[1, 1], [1, 1]])

    def test_matmul_unoptimized_matches_optimized_for_tile_sizes(self):
        src = (EXAMPLES / "matrix_multiply.dsl").read_text(encoding="utf-8")
        base = run_compiled(compile_program(src, config=OptimizerConfig(enabled=False), save=False))
        for tile in (2, 16, 32):
            c = compile_program(src, config=OptimizerConfig(tile_size=tile), save=False)
            self.assertEqual(run_compiled(c), base)


class TestErrorsEndToEnd(unittest.TestCase):
    def test_errors_are_dsl_compile_errors_with_filename(self):
        cases = [("tensor A[2]\nB[i] = A[i]", "not declared"),
                 ("tensor A[2]\nA[i] = A[i] / 2", "unsupported operator"),
                 ("tensor A[2\nA[i] = 1", "syntax error"),
                 ("tensor A[2, 2]\ntensor B[3, 3]\ntensor C[2, 2]\nC[i, j] = A[i, j] + B[i, j]",
                  "shape mismatch")]
        for src, text in cases:
            with self.assertRaises(DSLCompileError) as cm:
                compile_program(src, "bad.dsl", save=False)
            self.assertIn(text, str(cm.exception))
            self.assertTrue(str(cm.exception).startswith("bad.dsl:"))

    def test_unsupported_features_rejected(self):
        for src in ("tensor A[2]\ntensor B[2]\nB[i] = -A[i]",
                    "tensor A[2, 3]\ntensor B[2]\nB[i] = A[i]",          # broadcasting / rank
                    "tensor A[2, 2, 2, 2]\nA[i, j, k, l] = 1"):
            with self.assertRaises(DSLCompileError):
                compile_program(src, save=False)

    def test_runtime_input_validation(self):
        c = compile_program((EXAMPLES / "addition.dsl").read_text(encoding="utf-8"), save=False)
        bad_inputs = [{"A": [[1, 2], [3, 4]]},                                  # missing B
                      {"A": [[1, 2], [3, 4]], "B": [[1, 2], [3, 4]], "Z": [1]},  # extra
                      {"A": [[1, 2, 3], [3, 4, 5]], "B": [[1, 2], [3, 4]]},      # bad shape
                      {"A": [[1, "x"], [3, 4]], "B": [[1, 2], [3, 4]]},          # bad value
                      {"A": [[1, 2], [3, 4]], "B": [[True, 2], [3, 4]]}]
        for inputs in bad_inputs:
            with self.assertRaises(ExecutionError):
                run_compiled(c, inputs)

    def test_executor_rejects_broken_code(self):
        with self.assertRaises(ExecutionError):
            execute("def run(inputs:\n    pass", {}, {})
        with self.assertRaises(ExecutionError):
            execute("x = 1", {}, {})
        with self.assertRaises(ExecutionError):
            execute("def run(inputs):\n    return {'C': open('x')}", {}, {"C": (1,)})

    def test_restricted_builtins(self):
        with self.assertRaises(ExecutionError):
            execute("def run(inputs):\n    return {'C': __import__('os')}", {}, {"C": (1,)})


class TestCLI(unittest.TestCase):
    def test_default_run_prints_outputs_and_saves_code(self):
        with tempfile.TemporaryDirectory() as tmp:
            code, out, err = cli([str(EXAMPLES / "addition.dsl"), "--out-dir", tmp])
            self.assertEqual(code, 0, err)
            self.assertIn("C = [[6, 8], [10, 12]]", out)
            self.assertTrue((Path(tmp) / "addition.py").is_file())

    def test_flags(self):
        with tempfile.TemporaryDirectory() as tmp:
            mm = str(EXAMPLES / "matrix_multiply.dsl")
            code, out, _ = cli([mm, "--tile", "2", "--show-code", "--show-ast", "--show-ir",
                                "--out-dir", tmp])
            self.assertEqual(code, 0)
            for text in ("tile size 2", "min(_t_k + 2, 3)", "SumExpression", "C = [[58, 64], [139, 154]]"):
                self.assertIn(text, out)
            code, out, _ = cli([mm, "--no-opt", "--run", "--out-dir", tmp])
            self.assertIn("Optimizations applied: none", out)
            self.assertTrue((Path(tmp) / "matrix_multiply_noopt.py").is_file())
            code, out, _ = cli([mm, "--compile-only", "--out-dir", tmp])
            self.assertEqual(code, 0)
            self.assertNotIn("Outputs:", out)
            code, out, _ = cli([mm, "--disable", "interchange", "--out-dir", tmp])
            self.assertIn("Optimizations applied: none", out)

    def test_custom_inputs_via_flags_and_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            add = str(EXAMPLES / "addition.dsl")
            code, out, err = cli([add, "--out-dir", tmp, "--input", "A=[[1,1],[1,1]]",
                                  "--input", "B=[[2,2],[2,2]]"])
            self.assertEqual(code, 0, err)
            self.assertIn("C = [[3, 3], [3, 3]]", out)
            f = Path(tmp) / "in.json"
            f.write_text(json.dumps({"A": [[0, 0], [0, 0]]}), encoding="utf-8")
            code, out, _ = cli([add, "--out-dir", tmp, "--inputs-file", str(f)])
            self.assertIn("C = [[5, 6], [7, 8]]", out)   # B keeps its default sample values

    def test_cli_errors_return_nonzero(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "bad.dsl"
            bad.write_text("tensor A[2, 2]\nC[i, j] = A[i, j]\n", encoding="utf-8")
            code, _, err = cli([str(bad), "--out-dir", tmp])
            self.assertEqual(code, 1)
            self.assertIn("not declared", err)
            code, _, err = cli([str(Path(tmp) / "missing.dsl")])
            self.assertEqual(code, 1)
            code, _, err = cli([str(EXAMPLES / "addition.dsl"), "--tile", "0", "--out-dir", tmp])
            self.assertEqual(code, 1)
            code, _, err = cli([str(EXAMPLES / "addition.dsl"), "--input", "Z=[1]", "--out-dir", tmp])
            self.assertEqual(code, 1)

    def test_subprocess_invocation(self):
        with tempfile.TemporaryDirectory() as tmp:
            res = subprocess.run([sys.executable, "main.py", "examples/complex_expression.dsl",
                                  "--out-dir", tmp], capture_output=True, text=True, cwd=str(ROOT))
            self.assertEqual(res.returncode, 0, res.stderr)
            self.assertIn("C = [[2, 4], [6, 8]]", res.stdout)


if __name__ == "__main__":
    unittest.main()
