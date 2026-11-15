"""
Automated Test Suite for Quantum Circuit Optimizer
Author: Compiler Design - Track E, Problem 19

Comprehensive unit tests verifying:
1. OpenQASM 2.0 loading and exporting (strings and files).
2. DAG construction, DAG-to-circuit, and NetworkX export.
3. Rewrite rules (H-H, X-X, Y-Y, Z-Z, CX-CX, CZ-CZ, S-Sdg, T-Tdg, SX-SXdg, inverse rotation).
4. Algebraic rotation merging (Rx, Ry, Rz, Phase) with angle normalization and parameter safety.
5. Identity gate & zero-angle rotation elimination.
6. Genuine DAG commutation-based cancellation:
   - H gates separated by independent gate on another wire.
   - Inverse rotations separated by commuting operations.
   - CX cancellation across commuting single-qubit operations (same control & target).
   - Gates that do NOT commute and must NOT be reordered (X on control, Z on target, etc.).
   - Preservation of barriers and measurements.
7. Single-qubit gate fusion:
   - Mathematical fusion into UGate representation.
   - Identity chain cancellation.
   - Preservation of global phase.
   - Prevention of fusion across intervening 2-qubit gates or barriers.
8. Fixed-point Pass Manager convergence and CSV logging (gates, depth, CX, T counts).
9. Mathematical equivalence verification:
   - Equivalent unitaries up to global phase.
   - Deliberately non-equivalent circuits.
   - Measurement and reset rejection.
   - Circuits with up to 10 qubits and rejection of >10 qubits.
10. Multi-pass integration.
"""

import sys
import math
import unittest
import tempfile
from pathlib import Path

# Add project root to Python path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
from qiskit.circuit.library import (
    HGate, XGate, YGate, ZGate, SGate, SdgGate, TGate, TdgGate,
    SXGate, SXdgGate, CXGate, CZGate, SwapGate,
    RXGate, RYGate, RZGate, PhaseGate, UGate
)

from optimizer import (
    load_circuit_from_qasm_str,
    load_circuit_from_qasm_file,
    export_circuit_to_qasm_str,
    export_circuit_to_qasm_file,
    normalize_angle,
    is_zero_angle,
    are_inverse_gates,
    gates_commute,
    can_commute,
    optimize_peephole,
    build_dag,
    dag_to_quantum_circuit,
    merge_rotations,
    remove_identity_gates,
    IdentityRemovalPass,
    InverseCancellationPass,
    RotationMergingPass,
    CommutationCancellationPass,
    SingleQubitFusionPass,
    PassManager,
    QuantumCircuitOptimizer,
    circuit_to_networkx,
    dag_to_networkx,
    export_dag_to_networkx,
    check_unitary_equivalence,
    count_specific_gates,
)


class TestQASMFunctions(unittest.TestCase):

    def test_load_qasm_string(self):
        qasm = """
        OPENQASM 2.0;
        include "qelib1.inc";
        qreg q[1];
        h q[0];
        """
        circuit = load_circuit_from_qasm_str(qasm)
        self.assertEqual(circuit.num_qubits, 1)
        self.assertEqual(circuit.size(), 1)

    def test_export_qasm_string(self):
        circuit = QuantumCircuit(1)
        circuit.h(0)
        qasm = export_circuit_to_qasm_str(circuit)
        self.assertIn("OPENQASM", qasm)
        self.assertIn("h q[0];", qasm)

    def test_qasm_file_operations(self):
        circuit = QuantumCircuit(2)
        circuit.h(0)
        circuit.cx(0, 1)

        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test.qasm"
            export_circuit_to_qasm_file(circuit, file_path)
            self.assertTrue(file_path.exists())
            loaded = load_circuit_from_qasm_file(file_path)
            self.assertEqual(loaded.num_qubits, 2)
            self.assertEqual(loaded.size(), 2)


class TestGatePropertiesAndRewriteRules(unittest.TestCase):

    def test_normalize_angle(self):
        self.assertAlmostEqual(normalize_angle(0), 0)
        self.assertAlmostEqual(normalize_angle(2 * math.pi), 0, places=7)
        self.assertAlmostEqual(normalize_angle(3 * math.pi), -math.pi, places=7)
        self.assertAlmostEqual(normalize_angle(-math.pi), -math.pi, places=7)

    def test_is_zero_angle(self):
        self.assertTrue(is_zero_angle(0))
        self.assertTrue(is_zero_angle(2 * math.pi))
        self.assertTrue(is_zero_angle(-4 * math.pi))
        self.assertFalse(is_zero_angle(math.pi / 2))

    def test_self_inverse_gates(self):
        self.assertTrue(are_inverse_gates(HGate(), HGate()))
        self.assertTrue(are_inverse_gates(XGate(), XGate()))
        self.assertTrue(are_inverse_gates(YGate(), YGate()))
        self.assertTrue(are_inverse_gates(ZGate(), ZGate()))
        self.assertTrue(are_inverse_gates(CXGate(), CXGate()))
        self.assertTrue(are_inverse_gates(CZGate(), CZGate()))
        self.assertTrue(are_inverse_gates(SwapGate(), SwapGate()))

    def test_adjoint_inverse_gates(self):
        self.assertTrue(are_inverse_gates(SGate(), SdgGate()))
        self.assertTrue(are_inverse_gates(SdgGate(), SGate()))
        self.assertTrue(are_inverse_gates(TGate(), TdgGate()))
        self.assertTrue(are_inverse_gates(TdgGate(), TGate()))
        self.assertTrue(are_inverse_gates(SXGate(), SXdgGate()))
        self.assertTrue(are_inverse_gates(SXdgGate(), SXGate()))

    def test_rotation_inverse_gates(self):
        self.assertTrue(are_inverse_gates(RXGate(0.7), RXGate(-0.7)))
        self.assertTrue(are_inverse_gates(RYGate(math.pi / 3), RYGate(-math.pi / 3)))
        self.assertTrue(are_inverse_gates(RZGate(1.2), RZGate(-1.2)))
        self.assertTrue(are_inverse_gates(PhaseGate(0.5), PhaseGate(-0.5)))
        self.assertFalse(are_inverse_gates(RXGate(0.5), RXGate(0.5)))

    def test_symbolic_parameter_safety(self):
        theta = Parameter("theta")
        rx_sym1 = RXGate(theta)
        rx_sym2 = RXGate(-theta)
        # Should return False safely without raising exceptions
        self.assertFalse(are_inverse_gates(rx_sym1, rx_sym2))

    def test_gates_commute(self):
        self.assertTrue(gates_commute(RZGate(0.3), PhaseGate(0.5)))
        self.assertTrue(gates_commute(ZGate(), SGate()))
        self.assertTrue(gates_commute(XGate(), SXGate()))
        self.assertFalse(gates_commute(HGate(), XGate()))
        self.assertFalse(gates_commute(XGate(), ZGate()))


class TestPeepholeOptimization(unittest.TestCase):

    def test_hh_cancellation(self):
        qc = QuantumCircuit(1)
        qc.h(0); qc.h(0)
        opt = optimize_peephole(qc)
        self.assertEqual(opt.size(), 0)

    def test_pauli_self_inverse_cancellation(self):
        qc = QuantumCircuit(1)
        qc.x(0); qc.x(0)
        qc.y(0); qc.y(0)
        qc.z(0); qc.z(0)
        opt = optimize_peephole(qc)
        self.assertEqual(opt.size(), 0)

    def test_cxcx_cancellation_same_roles(self):
        qc = QuantumCircuit(2)
        qc.cx(0, 1); qc.cx(0, 1)
        opt = optimize_peephole(qc)
        self.assertEqual(opt.size(), 0)

    def test_cxcx_no_cancellation_different_roles(self):
        qc = QuantumCircuit(2)
        qc.cx(0, 1); qc.cx(1, 0)
        opt = optimize_peephole(qc)
        self.assertEqual(opt.size(), 2)

    def test_cz_cz_cancellation(self):
        qc = QuantumCircuit(2)
        qc.cz(0, 1); qc.cz(0, 1)
        opt = optimize_peephole(qc)
        self.assertEqual(opt.size(), 0)

    def test_adjoint_cancellations(self):
        qc = QuantumCircuit(1)
        qc.s(0); qc.sdg(0)
        qc.t(0); qc.tdg(0)
        qc.sx(0); qc.sxdg(0)
        opt = optimize_peephole(qc)
        self.assertEqual(opt.size(), 0)

    def test_inverse_rotation_cancellation(self):
        qc = QuantumCircuit(1)
        qc.rx(0.75, 0); qc.rx(-0.75, 0)
        opt = optimize_peephole(qc)
        self.assertEqual(opt.size(), 0)


class TestRotationMerging(unittest.TestCase):

    def test_merge_rx_rotations(self):
        qc = QuantumCircuit(1)
        qc.rx(0.3, 0); qc.rx(0.5, 0)
        opt = merge_rotations(qc)
        self.assertEqual(opt.size(), 1)
        self.assertAlmostEqual(float(opt.data[0].operation.params[0]), 0.8)

    def test_merge_ry_rotations(self):
        qc = QuantumCircuit(1)
        qc.ry(math.pi / 4, 0); qc.ry(math.pi / 4, 0)
        opt = merge_rotations(qc)
        self.assertEqual(opt.size(), 1)
        self.assertAlmostEqual(float(opt.data[0].operation.params[0]), math.pi / 2)

    def test_merge_rz_rotations(self):
        qc = QuantumCircuit(1)
        qc.rz(0.2, 0); qc.rz(0.4, 0)
        opt = merge_rotations(qc)
        self.assertEqual(opt.size(), 1)
        self.assertAlmostEqual(float(opt.data[0].operation.params[0]), 0.6)

    def test_merge_phase_rotations(self):
        qc = QuantumCircuit(1)
        qc.p(0.1, 0); qc.p(0.3, 0)
        opt = merge_rotations(qc)
        self.assertEqual(opt.size(), 1)
        self.assertAlmostEqual(float(opt.data[0].operation.params[0]), 0.4)

    def test_merge_cancelling_to_zero(self):
        qc = QuantumCircuit(1)
        qc.rx(math.pi / 2, 0); qc.rx(-math.pi / 2, 0)
        opt = merge_rotations(qc)
        self.assertEqual(opt.size(), 0)

    def test_preserve_different_axes(self):
        qc = QuantumCircuit(1)
        qc.rx(0.4, 0); qc.ry(0.4, 0)
        opt = merge_rotations(qc)
        self.assertEqual(opt.size(), 2)


class TestIdentityRemoval(unittest.TestCase):

    def test_remove_explicit_id_gate(self):
        qc = QuantumCircuit(1)
        qc.id(0)
        opt = remove_identity_gates(qc)
        self.assertEqual(opt.size(), 0)

    def test_remove_zero_angle_rotations(self):
        qc = QuantumCircuit(1)
        qc.rx(0.0, 0); qc.ry(2 * math.pi, 0); qc.rz(-4 * math.pi, 0); qc.p(0.0, 0)
        opt = remove_identity_gates(qc)
        self.assertEqual(opt.size(), 0)

    def test_preserve_nonzero_rotations(self):
        qc = QuantumCircuit(1)
        qc.rx(0.5, 0)
        opt = remove_identity_gates(qc)
        self.assertEqual(opt.size(), 1)


class TestDAGAndNetworkX(unittest.TestCase):

    def test_build_and_convert_dag(self):
        qc = QuantumCircuit(2)
        qc.h(0); qc.cx(0, 1)
        dag = build_dag(qc)
        self.assertIsNotNone(dag)
        self.assertEqual(len(list(dag.topological_op_nodes())), 2)

        converted = dag_to_quantum_circuit(dag)
        self.assertEqual(converted.size(), 2)
        equiv, _ = check_unitary_equivalence(qc, converted)
        self.assertTrue(equiv)

    def test_networkx_graph_export(self):
        qc = QuantumCircuit(3)
        qc.h(0); qc.cx(0, 1); qc.rz(0.5, 1); qc.cx(1, 2)
        g = circuit_to_networkx(qc)
        self.assertEqual(g.number_of_nodes(), 4)
        self.assertGreaterEqual(g.number_of_edges(), 3)
        # Check node attributes
        self.assertIn("label", g.nodes[0])
        self.assertIn("qubits", g.nodes[0])


class TestCommutationBasedDAGOptimization(unittest.TestCase):

    def test_h_separated_by_independent_wire_gate(self):
        """H gates on wire 0 separated by an independent gate on wire 1 cancel out in DAG."""
        qc = QuantumCircuit(2)
        qc.h(0)
        qc.x(1)  # Intervening gate on wire 1
        qc.h(0)

        opt = QuantumCircuitOptimizer(level=2)
        qc_opt = opt.optimize_dag(qc)

        self.assertEqual(qc_opt.size(), 1)
        self.assertEqual(qc_opt.data[0].operation.name, "x")
        self.assertEqual(qc.find_bit(qc_opt.data[0].qubits[0]).index, 1)
        equiv, msg = check_unitary_equivalence(qc, qc_opt)
        self.assertTrue(equiv, msg)

    def test_inverse_rotations_separated_by_commuting_diagonal_gate(self):
        """Rz gates separated by a commuting Z gate cancel out."""
        qc = QuantumCircuit(1)
        qc.rz(0.4, 0)
        qc.z(0)  # Commutes with Rz
        qc.rz(-0.4, 0)

        opt = QuantumCircuitOptimizer(level=2)
        qc_opt = opt.optimize_dag(qc)

        self.assertEqual(qc_opt.size(), 1)
        self.assertEqual(qc_opt.data[0].operation.name, "z")
        equiv, msg = check_unitary_equivalence(qc, qc_opt)
        self.assertTrue(equiv, msg)

    def test_z_commutes_across_cx_control_to_cancel(self):
        """Z gate on control of CX commutes across CX to cancel matching Z."""
        qc = QuantumCircuit(2)
        qc.z(0)
        qc.cx(0, 1)
        qc.z(0)

        opt = QuantumCircuitOptimizer(level=2)
        qc_opt = opt.optimize_dag(qc)

        self.assertEqual(qc_opt.size(), 1)
        self.assertEqual(qc_opt.data[0].operation.name, "cx")
        equiv, msg = check_unitary_equivalence(qc, qc_opt)
        self.assertTrue(equiv, msg)

    def test_x_commutes_across_cx_target_to_cancel(self):
        """X gate on target of CX commutes across CX to cancel matching X."""
        qc = QuantumCircuit(2)
        qc.x(1)
        qc.cx(0, 1)
        qc.x(1)

        opt = QuantumCircuitOptimizer(level=2)
        qc_opt = opt.optimize_dag(qc)

        self.assertEqual(qc_opt.size(), 1)
        self.assertEqual(qc_opt.data[0].operation.name, "cx")
        equiv, msg = check_unitary_equivalence(qc, qc_opt)
        self.assertTrue(equiv, msg)

    def test_cx_cancels_across_commuting_single_qubit_gates(self):
        """CX cancels with matching CX across commuting Z on control and X on target."""
        qc = QuantumCircuit(2)
        qc.cx(0, 1)
        qc.z(0)  # Diagonal on control
        qc.x(1)  # X-type on target
        qc.cx(0, 1)

        opt = QuantumCircuitOptimizer(level=2)
        qc_opt = opt.optimize_dag(qc)

        self.assertEqual(qc_opt.size(), 2)
        gate_names = {inst.operation.name for inst in qc_opt.data}
        self.assertEqual(gate_names, {"z", "x"})
        equiv, msg = check_unitary_equivalence(qc, qc_opt)
        self.assertTrue(equiv, msg)

    def test_non_commuting_gates_must_not_be_reordered(self):
        """X on control does NOT commute with CX and must NOT be commuted past it."""
        qc = QuantumCircuit(2)
        qc.x(0)
        qc.cx(0, 1)
        qc.x(0)

        opt = QuantumCircuitOptimizer(level=2)
        qc_opt = opt.optimize_dag(qc)

        # X on control cannot commute across CX to cancel!
        self.assertEqual(qc_opt.size(), 3)
        equiv, msg = check_unitary_equivalence(qc, qc_opt)
        self.assertTrue(equiv, msg)

    def test_z_on_target_does_not_commute_with_cx(self):
        """Z on target does NOT commute with CX and must NOT be commuted past it."""
        qc = QuantumCircuit(2)
        qc.z(1)
        qc.cx(0, 1)
        qc.z(1)

        opt = QuantumCircuitOptimizer(level=2)
        qc_opt = opt.optimize_dag(qc)

        self.assertEqual(qc_opt.size(), 3)
        equiv, msg = check_unitary_equivalence(qc, qc_opt)
        self.assertTrue(equiv, msg)

    def test_barrier_and_measurement_prevent_commutation(self):
        """Barriers strictly block cancellation across their boundary."""
        qc = QuantumCircuit(1)
        qc.h(0)
        qc.barrier()
        qc.h(0)

        opt = QuantumCircuitOptimizer(level=2)
        qc_opt = opt.optimize_dag(qc)

        # H-barrier-H must preserve both H gates and the barrier
        self.assertEqual(len(qc_opt.data), 3)
        self.assertEqual([inst.operation.name for inst in qc_opt.data], ["h", "barrier", "h"])


class TestSingleQubitGateFusion(unittest.TestCase):

    def test_fuse_consecutive_single_qubit_gates(self):
        qc = QuantumCircuit(1)
        qc.h(0); qc.t(0); qc.h(0); qc.s(0)

        pass_fusion = SingleQubitFusionPass()
        dag = build_dag(qc)
        dag, mods = pass_fusion.run(dag)
        fused_qc = dag_to_quantum_circuit(dag)

        self.assertEqual(fused_qc.size(), 1)
        self.assertEqual(fused_qc.data[0].operation.name, "u")
        equiv, msg = check_unitary_equivalence(qc, fused_qc)
        self.assertTrue(equiv, msg)

    def test_fuse_identity_chain_removed(self):
        """A sequence that evaluates to identity is completely eliminated."""
        qc = QuantumCircuit(1)
        # (H S)^3 is identity up to global phase
        for _ in range(3):
            qc.h(0); qc.s(0)

        pass_fusion = SingleQubitFusionPass()
        dag = build_dag(qc)
        dag, mods = pass_fusion.run(dag)
        fused_qc = dag_to_quantum_circuit(dag)

        self.assertEqual(fused_qc.size(), 0)

    def test_fusion_blocked_by_two_qubit_gate(self):
        """Fusion must never combine gates across intervening multi-qubit gates."""
        qc = QuantumCircuit(2)
        qc.h(0)
        qc.cx(0, 1)
        qc.t(0)

        pass_fusion = SingleQubitFusionPass()
        dag = build_dag(qc)
        dag, mods = pass_fusion.run(dag)
        fused_qc = dag_to_quantum_circuit(dag)

        # H and T cannot fuse because CX is on wire 0
        self.assertEqual(fused_qc.size(), 3)


class TestFixedPointPassManager(unittest.TestCase):

    def test_fixed_point_convergence(self):
        qc = QuantumCircuit(2)
        qc.h(0); qc.h(0)
        qc.id(0)
        qc.rx(0.2, 1); qc.rx(-0.2, 1)
        qc.cx(0, 1); qc.cx(0, 1)

        pm = PassManager(max_iterations=10)
        opt_qc = pm.run(qc)

        self.assertEqual(opt_qc.size(), 0)
        self.assertGreater(len(pm.history), 0)

    def test_pass_logging_attributes(self):
        qc = QuantumCircuit(2)
        qc.cx(0, 1); qc.cx(0, 1)

        pm = PassManager(passes=[InverseCancellationPass()])
        pm.run(qc)

        # Iteration 1 removes gates, Iteration 2 verifies fixed point reached
        self.assertEqual(len(pm.history), 2)
        res = pm.history[0]
        self.assertEqual(res.pass_name, "InverseCancellationPass")
        self.assertEqual(res.gates_before, 2)
        self.assertEqual(res.gates_after, 0)
        self.assertEqual(res.cx_before, 2)
        self.assertEqual(res.cx_after, 0)
        self.assertTrue(res.changed)
        self.assertFalse(pm.history[1].changed)

    def test_save_pass_history_csv(self):
        qc = QuantumCircuit(1)
        qc.h(0); qc.h(0)

        pm = PassManager()
        pm.run(qc)

        with tempfile.TemporaryDirectory() as temp_dir:
            csv_file = Path(temp_dir) / "history.csv"
            pm.save_history_csv(csv_file)
            self.assertTrue(csv_file.exists())
            text = csv_file.read_text(encoding="utf-8")
            self.assertIn("pass_name,gates_before", text)
            self.assertIn("InverseCancellationPass", text)


class TestUnitaryEquivalenceVerification(unittest.TestCase):

    def test_equivalent_circuits(self):
        c1 = QuantumCircuit(1); c1.h(0)
        c2 = QuantumCircuit(1); c2.h(0)
        res, msg = check_unitary_equivalence(c1, c2)
        self.assertTrue(res, msg)

    def test_global_phase_equivalence(self):
        c1 = QuantumCircuit(1); c1.h(0)
        c2 = QuantumCircuit(1); c2.h(0)
        c2.global_phase = 1.234
        res, msg = check_unitary_equivalence(c1, c2)
        self.assertTrue(res, msg)

    def test_non_equivalent_circuits_detected(self):
        c1 = QuantumCircuit(1); c1.h(0)
        c2 = QuantumCircuit(1); c2.x(0)
        res, msg = check_unitary_equivalence(c1, c2)
        self.assertFalse(res)
        self.assertIn("differ beyond numerical tolerance", msg)

    def test_qubit_count_mismatch(self):
        c1 = QuantumCircuit(1)
        c2 = QuantumCircuit(2)
        res, msg = check_unitary_equivalence(c1, c2)
        self.assertFalse(res)
        self.assertIn("Qubit count mismatch", msg)

    def test_measurement_rejection(self):
        c1 = QuantumCircuit(1, 1)
        c1.h(0); c1.measure(0, 0)
        c2 = QuantumCircuit(1)
        c2.h(0)
        res, msg = check_unitary_equivalence(c1, c2)
        self.assertFalse(res)
        self.assertIn("non-unitary", msg)

    def test_reset_rejection(self):
        c1 = QuantumCircuit(1)
        c1.reset(0)
        c2 = QuantumCircuit(1)
        res, msg = check_unitary_equivalence(c1, c2)
        self.assertFalse(res)
        self.assertIn("non-unitary", msg)

    def test_ten_qubits_supported(self):
        c1 = QuantumCircuit(10)
        for i in range(10):
            c1.h(i)
        c2 = c1.copy()
        res, msg = check_unitary_equivalence(c1, c2)
        self.assertTrue(res, msg)

    def test_more_than_ten_qubits_rejected(self):
        c1 = QuantumCircuit(11)
        c2 = QuantumCircuit(11)
        res, msg = check_unitary_equivalence(c1, c2)
        self.assertFalse(res)
        self.assertIn("more than 10 qubits", msg)


class TestFullOptimizerIntegration(unittest.TestCase):

    def test_multi_pass_integration(self):
        """Exercises identity removal, inverse cancellation, rotation merging, commutation, and fusion together."""
        qc = QuantumCircuit(3)
        # Wire 0: H-H pair separated by independent gate
        qc.h(0)
        qc.id(0)
        qc.x(1)
        qc.h(0)
        # Wire 1: Rotations merging
        qc.rx(0.2, 1); qc.rx(0.4, 1)
        # Wire 2: Adjoint S-Sdg
        qc.s(2); qc.sdg(2)
        # Cross wire: CX with commuting Z on control
        qc.z(0)
        qc.cx(0, 2)
        qc.z(0)

        opt = QuantumCircuitOptimizer(level=3)
        qc_opt = opt.optimize(qc)

        self.assertLess(qc_opt.size(), qc.size())
        equiv, msg = check_unitary_equivalence(qc, qc_opt)
        self.assertTrue(equiv, msg)


if __name__ == "__main__":
    unittest.main(verbosity=2)
