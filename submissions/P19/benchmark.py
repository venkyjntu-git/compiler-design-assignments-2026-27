"""
Benchmark Suite for Quantum Circuit Optimizer
Author: Compiler Design - Track E, Problem 19
Benchmarks genuine quantum circuits sourced directly from PNNL QASMBench (19 circuits, 2 to 8 qubits).
Measures:
1. Original gate count & Optimized gate count
2. Original depth & Optimized depth
3. Original CX count & Optimized CX count
4. Original T count & Optimized T count
5. Gate reduction percentage
6. Depth reduction percentage
7. Optimization execution time (ms)
8. Unitary equivalence result (Operator.equiv)
Saves results to benchmark_results.csv.
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import csv
import time
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
from qiskit import QuantumCircuit, qasm2

from optimizer import (
    QuantumCircuitOptimizer,
    check_unitary_equivalence,
    count_specific_gates,
)

BENCHMARK_NAMES = [
    "deutsch_n2",
    "grover_n2",
    "iswap_n2",
    "quantumwalks_n2",
    "fredkin_n3",
    "linearsolver_n3",
    "qaoa_n3",
    "teleportation_n3",
    "toffoli_n3",
    "wstate_n3",
    "adder_n4",
    "bell_n4",
    "cat_state_n4",
    "hs4_n4",
    "qft_n4",
    "lpn_n5",
    "simon_n6",
    "sat_n7",
    "bb84_n8",
]

PROJECT_ROOT = Path(__file__).resolve().parent
QASM_DIR = PROJECT_ROOT / "benchmarks" / "qasm"


def load_genuine_qasmbench_circuit(name: str) -> QuantumCircuit:
    """
    Load a genuine benchmark circuit from the benchmarks/qasm directory.
    Extracts the quantum computational kernel (excluding terminal measurements and classical bits)
    so that compiler optimization and exact unitary matrix equivalence verification can be performed.
    """
    file_path = QASM_DIR / f"{name}.qasm"
    if not file_path.exists():
        raise FileNotFoundError(
            f"Genuine QASMBench file not found: {file_path}. "
            "Please ensure the benchmark files are placed in benchmarks/qasm/."
        )

    raw_circuit = qasm2.loads(file_path.read_text(encoding="utf-8"))

    # Construct the unitary quantum computational kernel
    unitary_qc = QuantumCircuit(raw_circuit.num_qubits, name=name)
    unitary_qc.global_phase = raw_circuit.global_phase

    for inst in raw_circuit.data:
        op = inst.operation
        op_name = op.name.lower()
        # Skip terminal measurement readout, resets, and classical registers
        if op_name in ("measure", "reset") or inst.clbits:
            continue
        q_indices = [raw_circuit.find_bit(q).index for q in inst.qubits]
        unitary_qc.append(op, [unitary_qc.qubits[i] for i in q_indices])

    return unitary_qc


def load_benchmark_suite() -> List[Tuple[str, str, QuantumCircuit]]:
    """
    Load all benchmark circuits with metadata.
    Returns list of (circuit_name, source, QuantumCircuit).
    """
    circuits = []
    for name in BENCHMARK_NAMES:
        qc = load_genuine_qasmbench_circuit(name)
        circuits.append((name, "PNNL QASMBench", qc))
    return circuits


def run_benchmark(level: int = 3, save_csv: str = "benchmark_results.csv") -> List[Dict]:
    """
    Execute the benchmark suite on the custom quantum circuit optimizer.
    Measures all 12 required metrics and writes results to CSV.
    """
    circuits_with_meta = load_benchmark_suite()
    optimizer = QuantumCircuitOptimizer(level=level)

    results = []
    print("\n" + "=" * 98)
    print(f" RUNNING QUANTUM CIRCUIT OPTIMIZER BENCHMARK SUITE ({len(circuits_with_meta)} GENUINE QASMBENCH CIRCUITS)")
    print(f" Optimization Level: {level} (Fixed-Point Pass Manager with Commutation & Gate Fusion)")
    print("=" * 98 + "\n")

    for idx, (name, source, qc) in enumerate(circuits_with_meta, 1):
        num_qubits = qc.num_qubits
        orig_gates = qc.size()
        orig_depth = qc.depth()
        orig_cx, orig_t = count_specific_gates(qc)

        # Measure optimization execution time
        start_time = time.perf_counter()
        qc_opt = optimizer.optimize(qc, level=level)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        opt_gates = qc_opt.size()
        opt_depth = qc_opt.depth()
        opt_cx, opt_t = count_specific_gates(qc_opt)

        gate_red = orig_gates - opt_gates
        gate_red_pct = (gate_red / orig_gates * 100.0) if orig_gates > 0 else 0.0

        depth_red = orig_depth - opt_depth
        depth_red_pct = (depth_red / orig_depth * 100.0) if orig_depth > 0 else 0.0

        # Mathematical Equivalence Verification via Operator.equiv
        equiv_pass, equiv_msg = check_unitary_equivalence(qc, qc_opt)

        row = {
            "Circuit": name,
            "Source": source,
            "Qubits": num_qubits,
            "Orig_Gates": orig_gates,
            "Opt_Gates": opt_gates,
            "Gate_Red": gate_red,
            "Gate_Red_Pct": round(gate_red_pct, 1),
            "Orig_Depth": orig_depth,
            "Opt_Depth": opt_depth,
            "Depth_Red": depth_red,
            "Depth_Red_Pct": round(depth_red_pct, 1),
            "Orig_CX": orig_cx,
            "Opt_CX": opt_cx,
            "Orig_T": orig_t,
            "Opt_T": opt_t,
            "Time_ms": round(elapsed_ms, 2),
            "Equiv_Pass": "PASS" if equiv_pass else "FAIL",
        }
        results.append(row)

        print(
            f"[{idx:02d}/{len(circuits_with_meta):02d}] {name:<18} | Qubits: {num_qubits:>2} | "
            f"Gates: {orig_gates:>2} -> {opt_gates:>2} (-{gate_red_pct:>5.1f}%) | "
            f"Depth: {orig_depth:>2} -> {opt_depth:>2} (-{depth_red_pct:>5.1f}%) | "
            f"CX: {orig_cx:>2}->{opt_cx:>2} | T: {orig_t:>2}->{opt_t:>2} | "
            f"Equiv: {'PASS [✓]' if equiv_pass else 'FAIL [✗]'} | Time: {elapsed_ms:>5.2f} ms"
        )

    # Save results to CSV
    csv_path = PROJECT_ROOT / save_csv
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(results[0].keys()))
        writer.writeheader()
        writer.writerows(results)

    print("\n" + "=" * 98)
    print(f" Successfully exported benchmark results to: {csv_path.name}")
    print("=" * 98)

    # Summary table with Pandas
    df = pd.DataFrame(results)
    summary_cols = [
        "Circuit", "Qubits", "Orig_Gates", "Opt_Gates", "Gate_Red_Pct",
        "Orig_Depth", "Opt_Depth", "Depth_Red_Pct", "Orig_CX", "Opt_CX",
        "Orig_T", "Opt_T", "Time_ms", "Equiv_Pass"
    ]
    print("\n--- BENCHMARK RESULTS SUMMARY TABLE ---")
    print(df[summary_cols].to_string(index=False))

    tot_orig_gates = sum(r["Orig_Gates"] for r in results)
    tot_opt_gates = sum(r["Opt_Gates"] for r in results)
    tot_orig_depth = sum(r["Orig_Depth"] for r in results)
    tot_opt_depth = sum(r["Opt_Depth"] for r in results)
    tot_orig_cx = sum(r["Orig_CX"] for r in results)
    tot_opt_cx = sum(r["Opt_CX"] for r in results)
    tot_orig_t = sum(r["Orig_T"] for r in results)
    tot_opt_t = sum(r["Opt_T"] for r in results)
    avg_gate_red = (tot_orig_gates - tot_opt_gates) / tot_orig_gates * 100.0
    avg_depth_red = (tot_orig_depth - tot_opt_depth) / tot_orig_depth * 100.0
    equiv_all = all(r["Equiv_Pass"] == "PASS" for r in results)

    print("\n--- AGGREGATE PERFORMANCE METRICS ---")
    print(f"Total Circuits Evaluated       : {len(results)}")
    print(f"Total Original Gate Count      : {tot_orig_gates}")
    print(f"Total Optimized Gate Count     : {tot_opt_gates} (-{tot_orig_gates - tot_opt_gates} gates)")
    print(f"Overall Gate Count Reduction   : {avg_gate_red:.2f}%")
    print(f"Overall Depth Reduction        : {avg_depth_red:.2f}%")
    print(f"Total CX Gates (Orig -> Opt)   : {tot_orig_cx} -> {tot_opt_cx}")
    print(f"Total T Gates (Orig -> Opt)    : {tot_orig_t} -> {tot_opt_t}")
    print(f"Mean Execution Time per Circuit: {df['Time_ms'].mean():.2f} ms")
    print(f"All Unitaries Verified Equiv   : {'YES [100% PASS]' if equiv_all else 'NO [FAIL]'}\n")

    return results


if __name__ == "__main__":
    run_benchmark()
