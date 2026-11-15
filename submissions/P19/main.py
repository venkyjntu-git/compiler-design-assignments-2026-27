"""
Quantum Circuit Optimizer: Demonstration Script
Author: Compiler Design - Track E, Problem 19
Demonstrates Peephole and DAG-Based Quantum Circuit Optimization on 7 key circuits.
"""

import sys
# Configure UTF-8 encoding for Windows terminals to display circuit ASCII characters properly
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import math
from qiskit import QuantumCircuit
from optimizer import (
    QuantumCircuitOptimizer,
    optimize_peephole,
    check_unitary_equivalence,
    circuit_to_networkx,
)


def print_circuit_comparison(
    title: str,
    original_qc: QuantumCircuit,
    optimized_qc: QuantumCircuit,
    peephole_qc: QuantumCircuit = None,
    note: str = "",
):
    print("=" * 80)
    print(f" DEMONSTRATION: {title}")
    print("=" * 80)
    if note:
        print(f"Note: {note}\n")

    orig_gates = original_qc.size()
    orig_depth = original_qc.depth()
    opt_gates = optimized_qc.size()
    opt_depth = optimized_qc.depth()
    reduction = orig_gates - opt_gates
    pct_reduction = (reduction / orig_gates * 100.0) if orig_gates > 0 else 0.0

    print("--- [ORIGINAL CIRCUIT] ---")
    try:
        print(original_qc.draw(output="text"))
    except Exception:
        print(f"Circuit with {original_qc.num_qubits} qubits and {orig_gates} operations")
    print(f"Original Gate Count: {orig_gates} | Circuit Depth: {orig_depth}\n")

    if peephole_qc is not None:
        peep_gates = peephole_qc.size()
        peep_depth = peephole_qc.depth()
        print("--- [PEEPHOLE OPTIMIZED CIRCUIT] ---")
        try:
            print(peephole_qc.draw(output="text"))
        except Exception:
            pass
        print(f"Peephole Gate Count: {peep_gates} | Depth: {peep_depth}\n")

    print("--- [DAG OPTIMIZED CIRCUIT] ---")
    try:
        print(optimized_qc.draw(output="text"))
    except Exception:
        print(f"Circuit with {optimized_qc.num_qubits} qubits and {opt_gates} operations")
    print(f"DAG Optimized Gate Count: {opt_gates} | Circuit Depth: {opt_depth}")
    print(f"Gate Reduction: {reduction} gates ({pct_reduction:.1f}% reduction)")
    print(f"Depth Reduction: {orig_depth - opt_depth} layers\n")

    # Mathematical Equivalence Check
    equiv, msg = check_unitary_equivalence(original_qc, optimized_qc)
    print(f"Mathematical Equivalence Check: {'PASS [✓]' if equiv else 'FAIL [✗]'}")
    print(f"Verification Detail: {msg}\n")


def demo_circuit_1():
    """1. Consecutive H-H cancellation: H(H) = I."""
    qc = QuantumCircuit(1, name="H-H Cancellation")
    qc.h(0)
    qc.h(0)
    qc.x(0)
    qc.h(0)
    qc.h(0)

    opt = QuantumCircuitOptimizer()
    qc_opt = opt.optimize_dag(qc)
    qc_peep = opt.optimize_peephole(qc)

    print_circuit_comparison(
        "1. H-H Gate Cancellation (H(H) = I)",
        qc,
        qc_opt,
        qc_peep,
        note="Two consecutive Hadamard gates on the same qubit cancel out to identity."
    )


def demo_circuit_2():
    """2. Consecutive X-X, Y-Y, and Z-Z cancellation: X(X) = I."""
    qc = QuantumCircuit(2, name="Self-Inverse Cancellation")
    qc.x(0)
    qc.x(0)
    qc.y(1)
    qc.y(1)
    qc.z(0)
    qc.z(0)
    qc.h(0)

    opt = QuantumCircuitOptimizer()
    qc_opt = opt.optimize_dag(qc)
    qc_peep = opt.optimize_peephole(qc)

    print_circuit_comparison(
        "2. Self-Inverse Gate Cancellation (X-X, Y-Y, Z-Z = I)",
        qc,
        qc_opt,
        qc_peep,
        note="Pauli gates are self-inverse: X^2 = Y^2 = Z^2 = I."
    )


def demo_circuit_3():
    """3. Rotation Gate Merging: Rx, Ry, Rz, P."""
    qc = QuantumCircuit(2, name="Rotation Merging")
    qc.rx(0.3, 0)
    qc.rx(0.5, 0)
    qc.rz(math.pi / 4.0, 1)
    qc.rz(math.pi / 4.0, 1)
    qc.p(0.2, 0)
    qc.p(0.4, 0)

    opt = QuantumCircuitOptimizer()
    qc_opt = opt.optimize_dag(qc)
    qc_peep = opt.optimize_peephole(qc)

    print_circuit_comparison(
        "3. Rotation Gate Merging (Rx, Rz, Phase)",
        qc,
        qc_opt,
        qc_peep,
        note="Consecutive rotations along the same axis sum their angles: R(a)R(b) = R(a+b)."
    )


def demo_circuit_4():
    """4. Zero-Angle Rotation Removal."""
    qc = QuantumCircuit(1, name="Zero-Angle Removal")
    qc.ry(0.7, 0)
    qc.ry(-0.7, 0)
    qc.rz(2.0 * math.pi, 0)  # 2*pi mod 2*pi = 0
    qc.x(0)

    opt = QuantumCircuitOptimizer()
    qc_opt = opt.optimize_dag(qc)
    qc_peep = opt.optimize_peephole(qc)

    print_circuit_comparison(
        "4. Zero-Angle Rotation Removal (Angle = 0 mod 2π)",
        qc,
        qc_opt,
        qc_peep,
        note="Rotations whose net angle is 0 mod 2π are identities and are safely removed."
    )


def demo_circuit_5():
    """
    5. Circuit with independent gates and multi-qubit operations.
    Highlights DAG advantage over Peephole!
    """
    qc = QuantumCircuit(3, name="Independent Gates & Multi-Qubit")
    # Gate on q0
    qc.h(0)
    # Intervening independent gate on q1
    qc.x(1)
    # Second H on q0 - in linear order separated by X(1)!
    qc.h(0)
    # Multi-qubit gate
    qc.cx(0, 2)
    # Another pair on q1 separated by gate on q2
    qc.z(1)
    qc.y(2)
    qc.z(1)

    opt = QuantumCircuitOptimizer()
    qc_peep = opt.optimize_peephole(qc)
    qc_opt = opt.optimize_dag(qc)

    print_circuit_comparison(
        "5. Independent Operations Across Wires (Peephole vs DAG Advantage)",
        qc,
        qc_opt,
        qc_peep,
        note="A linear peephole optimizer cannot cancel H(0) and H(0) because X(1) lies between them.\n"
             "The DAG optimizer recognizes that wire 0 and wire 1 are independent and cancels H(0) and Z(1)!"
    )


def demo_circuit_6():
    """
    6. Commutation-Based Cancellation across a Multi-Qubit Gate (CX).
    Z gate on control qubit of CX commutes past CX to cancel matching Z.
    """
    qc = QuantumCircuit(2, name="Commutation Across CX")
    qc.z(0)
    qc.cx(0, 1)
    qc.z(0)
    qc.x(1)
    qc.cx(0, 1)
    qc.x(1)

    opt = QuantumCircuitOptimizer()
    qc_peep = opt.optimize_peephole(qc)
    qc_opt = opt.optimize_dag(qc)

    print_circuit_comparison(
        "6. Commutation-Based Cancellation Across Multi-Qubit CX Gate",
        qc,
        qc_opt,
        qc_peep,
        note="Z on the control qubit commutes with CX; X on the target qubit commutes with CX.\n"
             "The DAG optimizer commutes them across the CX to cancel the matching pair!"
    )


def demo_circuit_7():
    """
    7. Preservation of Barriers, Resets, and Measurements.
    Ensures safe operations are preserved.
    """
    qc = QuantumCircuit(2, 2, name="Barrier & Measurement Safety")
    qc.h(0)
    qc.barrier()
    qc.h(0)  # Should NOT cancel across barrier!
    qc.cx(0, 1)
    qc.measure(0, 0)
    qc.measure(1, 1)

    opt = QuantumCircuitOptimizer()
    qc_opt = opt.optimize_dag(qc)

    print_circuit_comparison(
        "7. Preservation of Barriers and Measurements",
        qc,
        qc_opt,
        note="Barriers and measurement operations prevent optimizations across their boundaries."
    )


def main():
    print("\n" + "#" * 80)
    print(" QUANTUM CIRCUIT OPTIMIZER: PEEPHOLE & DAG-BASED OPTIMIZATION DEMO")
    print(" Compiler Design - Track E, Assignment Problem 19")
    print("#" * 80 + "\n")

    demo_circuit_1()
    demo_circuit_2()
    demo_circuit_3()
    demo_circuit_4()
    demo_circuit_5()
    demo_circuit_6()
    demo_circuit_7()

    print("=" * 80)
    print(" ALL 7 DEMONSTRATION CIRCUITS COMPLETED SUCCESSFULLY!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
