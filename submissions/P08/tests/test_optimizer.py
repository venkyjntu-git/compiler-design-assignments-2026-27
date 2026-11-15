import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import copy
import random

from compiler.ir import IRBin, IRConst, IRLoad, Loop, LoopNest, Stmt, format_ir, lower
from compiler.optimizer import OptimizerConfig, optimize
from compiler.parser import parse
from compiler.semantic import analyze
from main import compile_program, run_compiled
from optimizations import constant_folding, loop_fusion, loop_interchange, loop_tiling

MATMUL = "tensor A[{m}, {k}]\ntensor B[{k}, {n}]\ntensor C[{m}, {n}]\nC[i, j] = sum(A[i, k] * B[k, j], k, 0, {k})"
NOOPT = OptimizerConfig(enabled=False)


def ir_of(src):
    p = parse(src)
    return lower(p, analyze(p))


def rand_matrix(rng, r, c, floats=False):
    if floats:
        return [[rng.uniform(-1, 1) for _ in range(c)] for _ in range(r)]
    return [[rng.randint(-9, 9) for _ in range(c)] for _ in range(r)]


def ref_matmul(a, b):
    m, k, n = len(a), len(b), len(b[0])
    out = []
    for i in range(m):
        row = []
        for j in range(n):
            acc = 0
            for kk in range(k):
                acc += a[i][kk] * b[kk][j]
            row.append(acc)
        out.append(row)
    return out


class TestConstantFolding(unittest.TestCase):
    def test_folds_constant_subtree(self):
        prog = optimize(ir_of("tensor A[2]\ntensor B[2]\nB[i] = 2 * 3 * A[i] + (5 - 3)"))
        expr = prog.nests[0].body[0].expr
        self.assertEqual(expr, IRBin("+", IRBin("*", IRConst(6), IRLoad("A", ["i"])), IRConst(2)))
        self.assertTrue(any("constant folding" in m for m in prog.applied))

    def test_fold_expr_counts(self):
        e, n = constant_folding.fold_expr(IRBin("*", IRBin("+", IRConst(1), IRConst(2)), IRConst(4)))
        self.assertEqual((e, n), (IRConst(12), 2))

    def test_does_not_reassociate(self):
        prog = optimize(ir_of("tensor A[2]\ntensor B[2]\nB[i] = A[i] * 2 * 3"))
        self.assertFalse(any("constant folding" in m for m in prog.applied))
        self.assertTrue(any("constant folding" in m for m in prog.not_applied))

    def test_overflow_not_folded(self):
        e, n = constant_folding.fold_expr(IRBin("*", IRConst(1e308), IRConst(10)))
        self.assertEqual(n, 0)

    def test_results_unchanged(self):
        src = "tensor A[3]\ntensor B[3]\nB[i] = A[i] * (2 + 3) - 1 * 4"
        ins = {"A": [1, 2, 3]}
        a = run_compiled(compile_program(src, save=False), ins)
        b = run_compiled(compile_program(src, config=NOOPT, save=False), ins)
        self.assertEqual(a, b)
        self.assertEqual(a["B"], [1, 6, 11])


FUSE_SRC = ("tensor A[3, 3]\ntensor B[3, 3]\ntensor T[3, 3]\ntensor E[3, 3]\n"
            "T[i, j] = A[i, j] + B[i, j]\nE[p, q] = T[p, q] * 2\n")
INS = {"A": [[1, 2, 3], [4, 5, 6], [7, 8, 9]], "B": [[1, 1, 1], [2, 2, 2], [3, 3, 3]]}


class TestLoopFusion(unittest.TestCase):
    def test_legal_fusion_applied_and_correct(self):
        prog = optimize(ir_of(FUSE_SRC))
        self.assertEqual(len(prog.nests), 1)
        self.assertEqual(len(prog.nests[0].body), 2)
        self.assertTrue(any(m.startswith("loop fusion") for m in prog.applied))
        a = run_compiled(compile_program(FUSE_SRC, save=False), INS)
        b = run_compiled(compile_program(FUSE_SRC, config=NOOPT, save=False), INS)
        self.assertEqual(a, b)
        self.assertEqual(a["E"][0], [4, 6, 8])

    def test_fusion_renames_second_nest_variables(self):
        code = compile_program(FUSE_SRC, save=False).code
        self.assertIn("E[i][j] = T[i][j] * 2", code)
        self.assertEqual(code.count("for i in range(3):"), 1)

    def test_not_fused_when_transposed_read(self):
        src = ("tensor A[3, 3]\ntensor T[3, 3]\ntensor E[3, 3]\n"
               "T[i, j] = A[i, j] * 2\nE[i, j] = T[j, i] + 1\n")
        prog = optimize(ir_of(src))
        self.assertEqual(len(prog.nests), 2)
        self.assertFalse(any(m.startswith("loop fusion") for m in prog.applied))
        self.assertTrue(any("not fused" in m for m in prog.not_applied))
        ins = {"A": [[1, 2, 3], [4, 5, 6], [7, 8, 9]]}
        a = run_compiled(compile_program(src, save=False), ins)
        b = run_compiled(compile_program(src, config=NOOPT, save=False), ins)
        self.assertEqual(a, b)
        self.assertEqual(a["E"][0][1], 2 * 4 + 1)

    def test_not_fused_when_iteration_spaces_differ(self):
        src = ("tensor A[2, 2]\ntensor B[3]\ntensor C[2, 2]\ntensor D[3]\n"
               "C[i, j] = A[i, j] + 1\nD[i] = B[i] * 2\n")
        prog = optimize(ir_of(src))
        self.assertEqual(len(prog.nests), 2)
        self.assertFalse(any(m.startswith("loop fusion") for m in prog.applied))

    def test_reduction_nests_not_fused(self):
        src = ("tensor A[2, 2]\ntensor B[2, 2]\ntensor C[2, 2]\ntensor D[2, 2]\n"
               "C[i, j] = sum(A[i, k] * B[k, j], k, 0, 2)\nD[i, j] = C[i, j] + 1\n")
        prog = optimize(ir_of(src))
        self.assertEqual(len(prog.nests), 2)
        self.assertTrue(any("reduction" in m for m in prog.not_applied))
        ins = {"A": [[1, 2], [3, 4]], "B": [[5, 6], [7, 8]]}
        self.assertEqual(run_compiled(compile_program(src, save=False), ins)["D"],
                         [[20, 23], [44, 51]])

    def test_can_fuse_direct(self):
        nests = optimize(ir_of(FUSE_SRC), OptimizerConfig(loop_fusion=False)).nests
        self.assertTrue(loop_fusion.can_fuse(nests[0], nests[1])[0])


class TestLoopInterchange(unittest.TestCase):
    def test_matmul_interchanged_to_ikj(self):
        prog = optimize(ir_of(MATMUL.format(m=2, k=3, n=2)))
        self.assertEqual([l.var for l in prog.nests[0].loops], ["i", "k", "j"])
        self.assertTrue(any("loop interchange" in m for m in prog.applied))

    def test_elementwise_order_unchanged_and_not_claimed(self):
        prog = optimize(ir_of("tensor A[2, 2]\ntensor B[2, 2]\nB[i, j] = A[i, j] + 1"))
        self.assertEqual([l.var for l in prog.nests[0].loops], ["i", "j"])
        self.assertFalse(any("loop interchange" in m for m in prog.applied))

    def test_legality_rejects_non_uniform_access(self):
        loops = [Loop("i", 0, 3), Loop("j", 0, 3)]
        bad = LoopNest(loops, [Stmt("C", ["i", "j"], IRLoad("C", ["j", "i"]))])
        ok, why = loop_interchange.legal_interchange(bad, ["j", "i"])
        self.assertFalse(ok)
        self.assertIn("different subscripts", why)

    def test_legality_rejects_reordering_reductions_and_tiled(self):
        loops = [Loop("i", 0, 2), Loop("k", 0, 2, kind="reduce"), Loop("l", 0, 2, kind="reduce")]
        nest = LoopNest(loops, [Stmt("C", ["i"], IRLoad("A", ["i", "k", "l"]), True)])
        self.assertFalse(loop_interchange.legal_interchange(nest, ["i", "l", "k"])[0])
        self.assertTrue(loop_interchange.legal_interchange(nest, ["k", "l", "i"])[0])
        nest.tile_size = 2
        self.assertFalse(loop_interchange.legal_interchange(nest, ["k", "l", "i"])[0])

    def test_interchange_results_bit_identical_with_floats(self):
        rng = random.Random(1)
        ins = {"A": rand_matrix(rng, 4, 5, True), "B": rand_matrix(rng, 5, 3, True)}
        src = MATMUL.format(m=4, k=5, n=3)
        a = run_compiled(compile_program(src, save=False), ins)
        b = run_compiled(compile_program(src, config=NOOPT, save=False), ins)
        self.assertEqual(a, b)


class TestLoopTiling(unittest.TestCase):
    def test_non_divisible_dimensions(self):
        rng = random.Random(7)
        for (m, k, n) in [(5, 7, 6), (3, 3, 3), (1, 9, 2), (17, 5, 19)]:
            a, b = rand_matrix(rng, m, k), rand_matrix(rng, k, n)
            expected = ref_matmul(a, b)
            for tile in (1, 2, 3, 4, 16, 32):
                c = compile_program(MATMUL.format(m=m, k=k, n=n), save=False,
                                    config=OptimizerConfig(tile_size=tile))
                self.assertEqual(run_compiled(c, {"A": a, "B": b})["C"], expected,
                                 msg=f"{(m, k, n)} tile={tile}")

    def test_tiling_structure_with_partial_tile(self):
        prog = optimize(ir_of(MATMUL.format(m=5, k=7, n=6)), OptimizerConfig(tile_size=2))
        nest = prog.nests[0]
        self.assertEqual(nest.tile_size, 2)
        self.assertEqual(sorted(l.var for l in nest.loops if l.var.startswith("_t_")),
                         ["_t_i", "_t_j", "_t_k"])
        self.assertTrue(any("min(_t_k + 2, 7)" in str(l.upper) for l in nest.loops))
        self.assertTrue(any(m.startswith("loop tiling") for m in prog.applied))

    def test_not_applied_when_extent_not_larger_than_tile(self):
        for src in (MATMUL.format(m=2, k=3, n=2), MATMUL.format(m=16, k=16, n=16)):
            prog = optimize(ir_of(src), OptimizerConfig(tile_size=16))
            self.assertIsNone(prog.nests[0].tile_size)
            self.assertFalse(any(m.startswith("loop tiling") for m in prog.applied))
            self.assertTrue(any(m.startswith("loop tiling") for m in prog.not_applied))

    def test_only_large_loops_are_tiled(self):
        prog = optimize(ir_of(MATMUL.format(m=2, k=3, n=2)), OptimizerConfig(tile_size=2))
        self.assertEqual([l.var for l in prog.nests[0].loops if l.var.startswith("_t_")], ["_t_k"])

    def test_tiling_elementwise_and_fused_nests(self):
        src = ("tensor A[5, 5]\ntensor B[5, 5]\ntensor T[5, 5]\ntensor E[5, 5]\n"
               "T[i, j] = A[i, j] + B[i, j]\nE[i, j] = T[i, j] * 2\n")
        rng = random.Random(3)
        ins = {"A": rand_matrix(rng, 5, 5), "B": rand_matrix(rng, 5, 5)}
        a = run_compiled(compile_program(src, save=False, config=OptimizerConfig(tile_size=2)), ins)
        b = run_compiled(compile_program(src, save=False, config=NOOPT), ins)
        self.assertEqual(a, b)

    def test_invalid_tile_size(self):
        from compiler import OptimizationError
        with self.assertRaises(OptimizationError):
            optimize(ir_of(MATMUL.format(m=2, k=2, n=2)), OptimizerConfig(tile_size=0))


class TestOptimizerController(unittest.TestCase):
    def test_disabled_means_nothing_applied_and_ir_unchanged(self):
        ir = ir_of(MATMUL.format(m=40, k=40, n=40))
        before = format_ir(ir)
        out = optimize(ir, NOOPT)
        self.assertEqual(out.applied, [])
        self.assertEqual(format_ir(out), before)

    def test_input_ir_not_mutated(self):
        ir = ir_of(MATMUL.format(m=40, k=40, n=40))
        snapshot = copy.deepcopy(ir)
        optimize(ir, OptimizerConfig(tile_size=8))
        self.assertEqual(format_ir(ir), format_ir(snapshot))

    def test_individual_pass_toggles(self):
        ir = ir_of(MATMUL.format(m=40, k=40, n=40))
        out = optimize(ir, OptimizerConfig(loop_tiling=False, loop_interchange=False))
        self.assertEqual(out.applied, [])
        self.assertTrue(any("disabled by configuration" in m for m in out.not_applied))


if __name__ == "__main__":
    unittest.main()
