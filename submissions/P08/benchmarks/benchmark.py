"""Benchmark: execution time with optimization disabled vs enabled.

Usage (from the project root):
    python benchmarks/benchmark.py [--size 48] [--ew-size 200] [--repeats 3] [--seed 0]

For every workload and configuration the generated code is compiled (compile
time) and then executed `repeats` times (best execution time is reported).
Results of every configuration are compared with the unoptimized result
FIRST; if any differ, no timings are reported and the exit code is 1.
Numbers are measured on your machine and are not guaranteed to improve:
tiling in pure Python often does not help on small inputs.
"""
from __future__ import annotations

import argparse
import os
import random
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from compiler.optimizer import OptimizerConfig  # noqa: E402
from main import compile_program  # noqa: E402
from runtime.executor import load_program, validate_inputs  # noqa: E402

CONFIGS = [
    ("no optimization", OptimizerConfig(enabled=False)),
    ("opt, no tiling", OptimizerConfig(loop_tiling=False)),
    ("opt, tile=16", OptimizerConfig(tile_size=16)),
    ("opt, tile=32", OptimizerConfig(tile_size=32)),
]


def rand_tensor(shape, rng):
    if len(shape) == 1:
        return [rng.randint(-9, 9) for _ in range(shape[0])]
    return [rand_tensor(shape[1:], rng) for _ in range(shape[0])]


def workloads(size, ew):
    return [
        ("matrix multiply", f"{size}x{size} @ {size}x{size}",
         f"tensor A[{size}, {size}]\ntensor B[{size}, {size}]\ntensor C[{size}, {size}]\n"
         f"C[i, j] = sum(A[i, k] * B[k, j], k, 0, {size})\n"),
        ("element-wise expr", f"{ew}x{ew}",
         f"tensor A[{ew}, {ew}]\ntensor B[{ew}, {ew}]\ntensor D[{ew}, {ew}]\ntensor C[{ew}, {ew}]\n"
         "C[i, j] = A[i, j] + 2 * 3 * B[i, j] - D[i, j]\n"),
        ("two-stage chain (fusion)", f"{ew}x{ew}",
         f"tensor A[{ew}, {ew}]\ntensor B[{ew}, {ew}]\ntensor T[{ew}, {ew}]\ntensor E[{ew}, {ew}]\n"
         "T[i, j] = A[i, j] + B[i, j]\nE[p, q] = T[p, q] * 2\n"),
    ]


def measure(name, source, repeats, seed):
    rng = random.Random(seed)
    inputs = None
    rows, baseline = [], None
    for label, cfg in CONFIGS:
        t0 = time.perf_counter()
        compiled = compile_program(source, name, cfg, save=False)
        compile_s = time.perf_counter() - t0
        if inputs is None:
            inputs = {n: rand_tensor(s, rng) for n, s in compiled.input_shapes.items()}
        fn = load_program(compiled.code)
        clean = validate_inputs(compiled.input_shapes, inputs)
        best, out = float("inf"), None
        for _ in range(repeats):
            t0 = time.perf_counter()
            out = fn(clean)
            best = min(best, time.perf_counter() - t0)
        if baseline is None:
            baseline = out
        rows.append({"label": label, "compile": compile_s, "exec": best,
                     "match": out == baseline, "applied": compiled.applied})
    return rows


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--size", type=int, default=48, help="matrix multiply size N (NxN @ NxN)")
    ap.add_argument("--ew-size", type=int, default=200, help="element-wise matrix size")
    ap.add_argument("--repeats", type=int, default=3)
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args(argv)

    all_rows = []
    for name, dims, src in workloads(args.size, args.ew_size):
        all_rows.append((name, dims, measure(name, src, args.repeats, args.seed)))

    bad = [(n, r["label"]) for n, _, rows in all_rows for r in rows if not r["match"]]
    if bad:
        print("ERROR: results differ from the unoptimized baseline; timings not reported:")
        for n, label in bad:
            print(f"  {n}: {label}")
        return 1

    print(f"Inputs: random integers in [-9, 9], seed={args.seed}; best of {args.repeats} runs.")
    print("All configurations produced results identical to the unoptimized baseline.\n")
    head = f"{'workload':26} {'dimensions':20} {'configuration':16} {'compile ms':>10} {'exec ms':>9} {'vs no-opt':>9}  match"
    print(head)
    print("-" * len(head))
    for name, dims, rows in all_rows:
        base = rows[0]["exec"]
        for r in rows:
            ratio = base / r["exec"] if r["exec"] > 0 else float("inf")
            print(f"{name:26} {dims:20} {r['label']:16} {r['compile'] * 1000:10.2f} "
                  f"{r['exec'] * 1000:9.2f} {ratio:8.2f}x  {'yes' if r['match'] else 'NO'}")
        print()
    print("'vs no-opt' = unoptimized exec time / this exec time (>1 faster, <1 slower).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
