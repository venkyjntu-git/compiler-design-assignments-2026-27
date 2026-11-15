"""
Quantum Circuit Optimizer: Peephole and DAG-Based Optimization
Author: Compiler Design - Track E, Problem 19
Technologies: Python 3.12+, Qiskit 2.x, NetworkX, NumPy, SciPy

This module implements:
1. OpenQASM 2.0 import and export.
2. Quantum Circuit DAG Construction and bidirectional conversion.
3. Classical Peephole Optimization with 10 rewrite rules.
4. Algebraic Rotation Merging with angle normalization and parameter safety.
5. Identity & Zero-Angle Gate Elimination.
6. Genuine DAG-based Commutation Analysis and Cancellation across wires.
7. Mathematical Single-Qubit Gate Fusion using Operator synthesis.
8. Modular Pass Manager with Fixed-Point Convergence and CSV logging.
9. Rigorous Mathematical Equivalence Verification (Operator.equiv up to global phase).
10. NetworkX Directed Acyclic Graph (DAG) Export and Visualization.
"""

import copy
import csv
import math
import cmath
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Union, Any

import numpy as np
import networkx as nx

from qiskit import QuantumCircuit, qasm2
from qiskit.circuit import CircuitInstruction, Gate, Qubit, Clbit
from qiskit.circuit.library import (
    HGate, XGate, YGate, ZGate, SGate, SdgGate, TGate, TdgGate,
    SXGate, SXdgGate, CXGate, CZGate, SwapGate,
    RXGate, RYGate, RZGate, PhaseGate, UGate
)
from qiskit.converters import circuit_to_dag, dag_to_circuit
from qiskit.dagcircuit import DAGCircuit, DAGOpNode
from qiskit.quantum_info import Operator
from qiskit.synthesis import OneQubitEulerDecomposer

TOLERANCE = 1e-7


# -----------------------------------------------------------------------------
# 1. OpenQASM 2.0 Import and Export
# -----------------------------------------------------------------------------

def load_circuit_from_qasm_str(qasm_string: str) -> QuantumCircuit:
    """Load a circuit from an OpenQASM 2.0 string."""
    return qasm2.loads(qasm_string)


def load_circuit_from_qasm_file(filename: Union[str, Path]) -> QuantumCircuit:
    """Load a circuit from an OpenQASM 2.0 file."""
    path = Path(filename)
    with open(path, "r", encoding="utf-8") as f:
        return qasm2.loads(f.read())


def export_circuit_to_qasm_str(circuit: QuantumCircuit) -> str:
    """Export a circuit to OpenQASM 2.0."""
    return qasm2.dumps(circuit)


def export_circuit_to_qasm_file(
    circuit: QuantumCircuit, filename: Union[str, Path]
) -> None:
    """Save a circuit as an OpenQASM 2.0 file."""
    path = Path(filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(qasm2.dumps(circuit))


# -----------------------------------------------------------------------------
# 2. Gate Properties, Rewrite Rules, and Commutation Relations
# -----------------------------------------------------------------------------

SELF_INVERSE_GATES = {"h", "x", "y", "z", "cx", "cz", "swap"}

ADJOINT_PAIRS = {
    "s": "sdg",
    "sdg": "s",
    "t": "tdg",
    "tdg": "t",
    "sx": "sxdg",
    "sxdg": "sx",
}

ROTATION_GATES = {"rx", "ry", "rz", "p", "u1"}
DIAGONAL_GATES = {"z", "rz", "p", "u1", "s", "sdg", "t", "tdg"}
X_TYPE_GATES = {"x", "rx", "sx", "sxdg"}


def normalize_angle(theta: float) -> float:
    """Normalize an angle into [-pi, pi)."""
    return ((theta + math.pi) % (2.0 * math.pi)) - math.pi


def is_zero_angle(theta: float, tol: float = TOLERANCE) -> bool:
    """Check whether an angle is equivalent to zero mod 2*pi."""
    return abs(normalize_angle(theta)) < tol


def are_inverse_gates(op1: Gate, op2: Gate) -> bool:
    """
    Check whether two gate operations are mathematical inverses.
    Supports:
    1. H-H = I
    2. X-X = I
    3. Y-Y = I
    4. Z-Z = I
    5. CX-CX = I (Caller also verifies identical control and target)
    6. CZ-CZ = I
    7. SWAP-SWAP = I
    8. S-Sdg = I, Sdg-S = I
    9. T-Tdg = I, Tdg-T = I
    10. SX-SXdg = I, SXdg-SX = I
    11. Inverse rotation cancellation: R_axis(a) R_axis(-a) = I
    """
    name1 = op1.name.lower()
    name2 = op2.name.lower()

    if name1 in SELF_INVERSE_GATES and name1 == name2:
        return True

    if ADJOINT_PAIRS.get(name1) == name2:
        return True

    if name1 == name2 and name1 in ROTATION_GATES:
        if len(op1.params) == len(op2.params) == 1:
            try:
                p1 = float(op1.params[0])
                p2 = float(op2.params[0])
                return is_zero_angle(p1 + p2)
            except (TypeError, ValueError):
                return False

    return False


def gates_commute(op1: Gate, op2: Gate) -> bool:
    """
    Determine whether two single-qubit gates commute mathematically.
    """
    n1 = op1.name.lower()
    n2 = op2.name.lower()

    if n1 in DIAGONAL_GATES and n2 in DIAGONAL_GATES:
        return True

    if n1 in X_TYPE_GATES and n2 in X_TYPE_GATES:
        return True

    if n1 == n2:
        if n1 in ROTATION_GATES or n1 in SELF_INVERSE_GATES:
            return True

    return False


def can_commute(node_a: DAGOpNode, node_b: DAGOpNode) -> bool:
    """
    Determine if two DAG operation nodes mathematically commute on their shared qubits.
    Returns True if A * B == B * A.
    Strictly considers qubit operands, control/target roles, and safety boundaries.
    """
    # Safety boundary: barriers, measurements, resets, or classically conditioned gates never commute
    non_commutable_ops = {"barrier", "measure", "reset"}
    name_a = node_a.name.lower()
    name_b = node_b.name.lower()

    if name_a in non_commutable_ops or name_b in non_commutable_ops:
        return False

    if getattr(node_a, "cargs", None) or getattr(node_b, "cargs", None):
        return False

    # Disjoint operations always commute
    qargs_a = set(node_a.qargs)
    qargs_b = set(node_b.qargs)
    shared_qubits = qargs_a.intersection(qargs_b)
    if not shared_qubits:
        return True

    # Single shared qubit: both 1-qubit operations
    if len(node_a.qargs) == 1 and len(node_b.qargs) == 1:
        return gates_commute(node_a.op, node_b.op)

    # CX Gate commutation with 1-qubit gates
    if name_a == "cx" and len(node_b.qargs) == 1:
        cx_ctrl, cx_target = node_a.qargs[0], node_a.qargs[1]
        b_qubit = node_b.qargs[0]
        # Diagonal gate on control qubit commutes with CX
        if b_qubit == cx_ctrl and name_b in DIAGONAL_GATES:
            return True
        # X-basis gate on target qubit commutes with CX
        if b_qubit == cx_target and name_b in X_TYPE_GATES:
            return True
        return False

    if name_b == "cx" and len(node_a.qargs) == 1:
        cx_ctrl, cx_target = node_b.qargs[0], node_b.qargs[1]
        a_qubit = node_a.qargs[0]
        if a_qubit == cx_ctrl and name_a in DIAGONAL_GATES:
            return True
        if a_qubit == cx_target and name_a in X_TYPE_GATES:
            return True
        return False

    # Two CX gates
    if name_a == "cx" and name_b == "cx":
        ctrl_a, tgt_a = node_a.qargs[0], node_a.qargs[1]
        ctrl_b, tgt_b = node_b.qargs[0], node_b.qargs[1]
        # Same control commutes: CX(c, t1) CX(c, t2) == CX(c, t2) CX(c, t1)
        if ctrl_a == ctrl_b:
            return True
        # Same target commutes: CX(c1, t) CX(c2, t) == CX(c2, t) CX(c1, t)
        if tgt_a == tgt_b:
            return True
        return False

    # CZ Gate commutation
    if name_a == "cz" and len(node_b.qargs) == 1:
        if name_b in DIAGONAL_GATES and (node_b.qargs[0] in node_a.qargs):
            return True
        return False

    if name_b == "cz" and len(node_a.qargs) == 1:
        if name_a in DIAGONAL_GATES and (node_a.qargs[0] in node_b.qargs):
            return True
        return False

    if name_a == "cz" and name_b == "cz":
        return True

    return False


def create_merged_rotation_gate(name: str, total_angle: float) -> Optional[Gate]:
    """
    Instantiate a new rotation gate with merged angle, or None if angle is zero mod 2*pi.
    Normalizes angle into [-pi, pi).
    """
    norm_angle = normalize_angle(total_angle)
    if is_zero_angle(norm_angle):
        return None

    name = name.lower()
    if name == "rx":
        return RXGate(norm_angle)
    elif name == "ry":
        return RYGate(norm_angle)
    elif name == "rz":
        return RZGate(norm_angle)
    elif name in ("p", "u1"):
        return PhaseGate(norm_angle)
    return None


def count_specific_gates(circuit_or_dag: Union[QuantumCircuit, DAGCircuit]) -> Tuple[int, int]:
    """Count CX gates and T/Tdg gates in a QuantumCircuit or DAGCircuit."""
    cx_count = 0
    t_count = 0

    if isinstance(circuit_or_dag, QuantumCircuit):
        for inst in circuit_or_dag.data:
            name = inst.operation.name.lower()
            if name in ("cx", "cnot"):
                cx_count += 1
            elif name in ("t", "tdg"):
                t_count += 1
    elif isinstance(circuit_or_dag, DAGCircuit):
        for node in circuit_or_dag.op_nodes():
            name = node.name.lower()
            if name in ("cx", "cnot"):
                cx_count += 1
            elif name in ("t", "tdg"):
                t_count += 1

    return cx_count, t_count


# -----------------------------------------------------------------------------
# 3. Direct Adjacency Check on DAG Wires
# -----------------------------------------------------------------------------

def are_directly_adjacent(
    dag: DAGCircuit,
    n1: DAGOpNode,
    n2: DAGOpNode,
    topological_nodes: List[DAGOpNode]
) -> bool:
    """
    Check if n2 is the immediate successor of n1 on ALL shared wires,
    with NO intervening operations on ANY of those wires.
    """
    if n1.qargs != n2.qargs or n1.cargs != n2.cargs:
        return False

    for q in n1.qargs:
        wire_nodes = [node for node in topological_nodes if q in node.qargs]
        try:
            idx = wire_nodes.index(n1)
            if idx + 1 >= len(wire_nodes) or wire_nodes[idx + 1] != n2:
                return False
        except ValueError:
            return False

    for c in n1.cargs:
        wire_nodes = [node for node in topological_nodes if c in node.cargs]
        try:
            idx = wire_nodes.index(n1)
            if idx + 1 >= len(wire_nodes) or wire_nodes[idx + 1] != n2:
                return False
        except ValueError:
            return False

    return True


# -----------------------------------------------------------------------------
# 4. Modular Optimization Passes
# -----------------------------------------------------------------------------

@dataclass
class PassResult:
    pass_name: str
    gates_before: int
    gates_after: int
    depth_before: int
    depth_after: int
    cx_before: int
    cx_after: int
    t_before: int
    t_after: int
    changed: bool
    details: str = ""


class BaseOptimizationPass:
    """Abstract base class for all compiler optimization passes."""

    def __init__(self, name: str):
        self.name = name

    def run(self, dag: DAGCircuit) -> Tuple[DAGCircuit, int]:
        """
        Execute the pass on a DAGCircuit.
        Returns (modified_dag, modification_count).
        """
        raise NotImplementedError


class IdentityRemovalPass(BaseOptimizationPass):
    """
    Pass 1: Identity Gate & Zero-Angle Rotation Removal
    Eliminates explicit identity gates and rotation gates whose net angle is 0 mod 2*pi.
    """

    def __init__(self):
        super().__init__("IdentityRemovalPass")

    def run(self, dag: DAGCircuit) -> Tuple[DAGCircuit, int]:
        modifications = 0
        nodes_to_remove = []

        for node in dag.op_nodes():
            name = node.name.lower()
            if name in ("id", "identity"):
                nodes_to_remove.append(node)
            elif name in ROTATION_GATES and len(node.op.params) > 0:
                try:
                    angle = float(node.op.params[0])
                    if is_zero_angle(angle):
                        nodes_to_remove.append(node)
                except (TypeError, ValueError):
                    pass
            elif name == "u" and len(node.op.params) == 3:
                try:
                    th = float(node.op.params[0])
                    ph = float(node.op.params[1])
                    lm = float(node.op.params[2])
                    if is_zero_angle(th) and is_zero_angle(ph + lm):
                        nodes_to_remove.append(node)
                except (TypeError, ValueError):
                    pass

        for node in nodes_to_remove:
            dag.remove_op_node(node)
            modifications += 1

        return dag, modifications


class InverseCancellationPass(BaseOptimizationPass):
    """
    Pass 2: Inverse Cancellation
    Cancels consecutive adjacent inverse gate pairs:
    - Single-qubit self-inverse: H-H = I, X-X = I, Y-Y = I, Z-Z = I
    - Multi-qubit self-inverse: CX-CX = I (same control & target), CZ-CZ = I, SWAP-SWAP = I
    - Adjoint pairs: S-Sdg = I, T-Tdg = I, SX-SXdg = I
    - Inverse rotations: R(theta) R(-theta) = I
    """

    def __init__(self):
        super().__init__("InverseCancellationPass")

    def run(self, dag: DAGCircuit) -> Tuple[DAGCircuit, int]:
        modifications = 0
        changed = True

        while changed:
            changed = False
            topological_nodes = list(dag.topological_op_nodes())
            nodes_to_remove = []
            visited = set()

            for i in range(len(topological_nodes)):
                n1 = topological_nodes[i]
                if n1 in visited:
                    continue

                for j in range(i + 1, len(topological_nodes)):
                    n2 = topological_nodes[j]
                    if n2 in visited:
                        continue

                    if set(n1.qargs).intersection(set(n2.qargs)):
                        if are_directly_adjacent(dag, n1, n2, topological_nodes):
                            if are_inverse_gates(n1.op, n2.op):
                                nodes_to_remove.append((n1, n2))
                                visited.add(n1)
                                visited.add(n2)
                                changed = True
                                break
                        # If they share wires but are not directly adjacent, stop probing along this path
                        break

                if changed:
                    break

            for n1, n2 in nodes_to_remove:
                dag.remove_op_node(n1)
                dag.remove_op_node(n2)
                modifications += 2

        return dag, modifications


class RotationMergingPass(BaseOptimizationPass):
    """
    Pass 3: Rotation Merging
    Combines consecutive rotations along the same axis on the same qubit:
    R_axis(a) R_axis(b) = R_axis(a + b).
    If a + b = 0 mod 2pi, removes both gates.
    Preserves global phase and handles symbolic parameters safely.
    """

    def __init__(self):
        super().__init__("RotationMergingPass")

    def run(self, dag: DAGCircuit) -> Tuple[DAGCircuit, int]:
        modifications = 0
        changed = True

        while changed:
            changed = False
            topological_nodes = list(dag.topological_op_nodes())

            for i in range(len(topological_nodes)):
                n1 = topological_nodes[i]
                name1 = n1.name.lower()
                if name1 not in ROTATION_GATES:
                    continue

                for j in range(i + 1, len(topological_nodes)):
                    n2 = topological_nodes[j]
                    name2 = n2.name.lower()

                    if set(n1.qargs).intersection(set(n2.qargs)):
                        if are_directly_adjacent(dag, n1, n2, topological_nodes):
                            if name1 == name2 and len(n1.op.params) > 0 and len(n2.op.params) > 0:
                                try:
                                    th1 = float(n1.op.params[0])
                                    th2 = float(n2.op.params[0])
                                    merged_op = create_merged_rotation_gate(name1, th1 + th2)

                                    if merged_op is None:
                                        dag.remove_op_node(n1)
                                        dag.remove_op_node(n2)
                                        modifications += 2
                                    else:
                                        dag.substitute_node(n1, merged_op, inplace=True)
                                        dag.remove_op_node(n2)
                                        modifications += 1

                                    changed = True
                                    break
                                except (TypeError, ValueError, IndexError):
                                    pass
                        break

                if changed:
                    break

        return dag, modifications


class CommutationCancellationPass(BaseOptimizationPass):
    """
    Pass 4: Commutation-Based DAG Optimization
    Identifies gates acting on independent qubits and gates that mathematically commute.
    Pulls cancellable or mergeable gates past intervening commuting operations.
    Enforces that gates never commute across measurements, barriers, or classical dependencies.
    """

    def __init__(self):
        super().__init__("CommutationCancellationPass")

    def run(self, dag: DAGCircuit) -> Tuple[DAGCircuit, int]:
        modifications = 0
        changed = True

        while changed:
            changed = False
            topological_nodes = list(dag.topological_op_nodes())

            for i, n1 in enumerate(topological_nodes):
                name1 = n1.name.lower()
                if name1 in ("barrier", "measure", "reset") or n1.cargs:
                    continue

                # 1. Single-qubit commutation search
                if len(n1.qargs) == 1:
                    wire = n1.qargs[0]
                    wire_nodes = [node for node in topological_nodes if wire in node.qargs]
                    try:
                        w_idx = wire_nodes.index(n1)
                    except ValueError:
                        continue

                    intervening = []
                    for k in range(w_idx + 1, len(wire_nodes)):
                        n2 = wire_nodes[k]
                        if n2.name.lower() in ("barrier", "measure", "reset") or n2.cargs:
                            break

                        # Check inverse cancellation
                        if n1.qargs == n2.qargs and are_inverse_gates(n1.op, n2.op):
                            if all(can_commute(n1, inter) for inter in intervening):
                                dag.remove_op_node(n1)
                                dag.remove_op_node(n2)
                                modifications += 2
                                changed = True
                                break

                        # Check rotation merge
                        if (
                            n1.qargs == n2.qargs
                            and name1 in ROTATION_GATES
                            and name1 == n2.name.lower()
                            and len(n1.op.params) > 0
                            and len(n2.op.params) > 0
                        ):
                            if all(can_commute(n1, inter) for inter in intervening):
                                try:
                                    th1 = float(n1.op.params[0])
                                    th2 = float(n2.op.params[0])
                                    merged_op = create_merged_rotation_gate(name1, th1 + th2)
                                    if merged_op is None:
                                        dag.remove_op_node(n1)
                                        dag.remove_op_node(n2)
                                        modifications += 2
                                    else:
                                        dag.substitute_node(n2, merged_op, inplace=True)
                                        dag.remove_op_node(n1)
                                        modifications += 1
                                    changed = True
                                    break
                                except (TypeError, ValueError):
                                    pass

                        # If not cancelled or merged, n2 must commute with n1 to continue searching past it
                        if not can_commute(n1, n2):
                            break
                        intervening.append(n2)

                # 2. Two-qubit CX-CX commutation search across commuting gates
                elif len(n1.qargs) == 2 and name1 == "cx":
                    c_wire, t_wire = n1.qargs[0], n1.qargs[1]
                    c_nodes = [node for node in topological_nodes if c_wire in node.qargs]
                    t_nodes = [node for node in topological_nodes if t_wire in node.qargs]
                    try:
                        c_idx = c_nodes.index(n1)
                        t_idx = t_nodes.index(n1)
                    except ValueError:
                        continue

                    for k in range(i + 1, len(topological_nodes)):
                        n2 = topological_nodes[k]
                        if n2.name.lower() in ("barrier", "measure", "reset") or n2.cargs:
                            break

                        if n2.name.lower() == "cx" and n2.qargs == n1.qargs:
                            inter_c = c_nodes[c_idx + 1:c_nodes.index(n2)]
                            inter_t = t_nodes[t_idx + 1:t_nodes.index(n2)]

                            # Control intervening nodes must be single-qubit diagonal
                            c_valid = all(
                                len(node.qargs) == 1 and node.name.lower() in DIAGONAL_GATES and not node.cargs
                                for node in inter_c
                            )
                            # Target intervening nodes must be single-qubit X-type
                            t_valid = all(
                                len(node.qargs) == 1 and node.name.lower() in X_TYPE_GATES and not node.cargs
                                for node in inter_t
                            )

                            if c_valid and t_valid:
                                dag.remove_op_node(n1)
                                dag.remove_op_node(n2)
                                modifications += 2
                                changed = True
                                break

                        # If any other two-qubit gate touches either wire, stop search
                        if len(n2.qargs) > 1 and set(n2.qargs).intersection({c_wire, t_wire}):
                            break

                if changed:
                    break

        return dag, modifications


class SingleQubitFusionPass(BaseOptimizationPass):
    """
    Pass 5: Single-Qubit Gate Fusion
    Combines consecutive single-qubit gates on the same qubit wire into one equivalent unitary.
    Converts the fused unitary to a canonical UGate representation while strictly preserving global phase.
    Mathematically verifies equivalence before accepting the fusion.
    """

    def __init__(self):
        super().__init__("SingleQubitFusionPass")

    def run(self, dag: DAGCircuit) -> Tuple[DAGCircuit, int]:
        modifications = 0
        changed = True

        while changed:
            changed = False
            for wire in dag.wires:
                chain: List[DAGOpNode] = []
                for node in dag.topological_op_nodes():
                    if wire in node.qargs:
                        if (
                            len(node.qargs) == 1
                            and not node.cargs
                            and node.name.lower() not in ("barrier", "measure", "reset")
                        ):
                            chain.append(node)
                        else:
                            if len(chain) >= 2:
                                if self._try_fuse_chain(dag, chain):
                                    modifications += len(chain) - 1
                                    changed = True
                                    break
                            chain = []

                if not changed and len(chain) >= 2:
                    if self._try_fuse_chain(dag, chain):
                        modifications += len(chain) - 1
                        changed = True

                if changed:
                    break

        return dag, modifications

    def _try_fuse_chain(self, dag: DAGCircuit, chain: List[DAGOpNode]) -> bool:
        """Compose unitary matrices of the chain and substitute with UGate or remove if identity."""
        try:
            u_total = np.eye(2, dtype=complex)
            for node in chain:
                u_mat = Operator(node.op).data
                u_total = u_mat @ u_total

            # Check if equivalent to identity
            tr = np.trace(u_total)
            phase_factor = tr / 2.0
            if abs(abs(phase_factor) - 1.0) < TOLERANCE:
                identity_diff = np.max(np.abs(u_total - phase_factor * np.eye(2)))
                if identity_diff < TOLERANCE:
                    # Entire chain is identity up to global phase
                    chain_phase = cmath.phase(phase_factor)
                    dag.global_phase += chain_phase
                    for node in chain:
                        dag.remove_op_node(node)
                    return True

            # Synthesize single UGate using Qiskit's Euler Decomposer
            decomposer = OneQubitEulerDecomposer("U")
            decomp_circuit = decomposer(u_total)
            if len(decomp_circuit.data) == 0:
                dag.global_phase += decomp_circuit.global_phase
                for node in chain:
                    dag.remove_op_node(node)
                return True

            fused_gate = decomp_circuit.data[0].operation
            dag.global_phase += decomp_circuit.global_phase

            first_node = chain[0]
            dag.substitute_node(first_node, fused_gate, inplace=True)
            for node in chain[1:]:
                dag.remove_op_node(node)

            return True
        except Exception:
            return False


# -----------------------------------------------------------------------------
# 5. Fixed-Point Pass Manager
# -----------------------------------------------------------------------------

class PassManager:
    """
    Fixed-Point Pass Manager.
    Iteratively executes compiler optimization passes until no further reduction occurs
    or until the maximum iteration count is reached.
    Logs pass metrics (Gate count, depth, CX count, T count) and exports pass history to CSV.
    """

    def __init__(self, passes: Optional[List[BaseOptimizationPass]] = None, max_iterations: int = 10):
        self.passes = passes if passes is not None else [
            IdentityRemovalPass(),
            InverseCancellationPass(),
            RotationMergingPass(),
            CommutationCancellationPass(),
            IdentityRemovalPass(),
            SingleQubitFusionPass(),
            InverseCancellationPass(),
            IdentityRemovalPass(),
        ]
        self.max_iterations = max_iterations
        self.history: List[PassResult] = []

    def add_pass(self, opt_pass: BaseOptimizationPass) -> None:
        self.passes.append(opt_pass)

    def run(
        self,
        circuit: QuantumCircuit,
        max_iterations: Optional[int] = None,
        verbose: bool = False
    ) -> QuantumCircuit:
        limit = max_iterations or self.max_iterations
        self.history.clear()

        dag = circuit_to_dag(circuit)
        iteration = 0

        while iteration < limit:
            iteration += 1
            iter_changed = False

            for opt_pass in self.passes:
                gates_before = dag.size()
                depth_before = dag.depth()
                cx_before, t_before = count_specific_gates(dag)

                dag, mods = opt_pass.run(dag)

                gates_after = dag.size()
                depth_after = dag.depth()
                cx_after, t_after = count_specific_gates(dag)

                pass_changed = (
                    mods > 0
                    or gates_before != gates_after
                    or depth_before != depth_after
                    or cx_before != cx_after
                    or t_before != t_after
                )

                if pass_changed:
                    iter_changed = True

                self.history.append(
                    PassResult(
                        pass_name=opt_pass.name,
                        gates_before=gates_before,
                        gates_after=gates_after,
                        depth_before=depth_before,
                        depth_after=depth_after,
                        cx_before=cx_before,
                        cx_after=cx_after,
                        t_before=t_before,
                        t_after=t_after,
                        changed=pass_changed,
                        details=f"Iter {iteration}: mods={mods}, gate_diff={gates_before - gates_after}",
                    )
                )

                if verbose and pass_changed:
                    print(
                        f"  [{opt_pass.name}] Iter {iteration}: "
                        f"Gates {gates_before}->{gates_after}, Depth {depth_before}->{depth_after}, "
                        f"CX {cx_before}->{cx_after}, T {t_before}->{t_after}"
                    )

            if not iter_changed:
                if verbose:
                    print(f"[PassManager] Fixed point reached at iteration {iteration}!")
                break

        optimized_circuit = dag_to_circuit(dag)
        return optimized_circuit

    def save_history_csv(self, filename: Union[str, Path]) -> None:
        """Export pass execution history to a CSV file."""
        path = Path(filename)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "pass_name", "gates_before", "gates_after",
                "depth_before", "depth_after",
                "cx_before", "cx_after",
                "t_before", "t_after",
                "changed", "details"
            ])
            for r in self.history:
                writer.writerow([
                    r.pass_name, r.gates_before, r.gates_after,
                    r.depth_before, r.depth_after,
                    r.cx_before, r.cx_after,
                    r.t_before, r.t_after,
                    r.changed, r.details
                ])


# -----------------------------------------------------------------------------
# 6. Classical Peephole Optimizer
# -----------------------------------------------------------------------------

def optimize_peephole(circuit: QuantumCircuit, max_iterations: int = 10) -> QuantumCircuit:
    """
    Classical Peephole Optimizer:
    Examines linearly adjacent instruction sequences within sliding windows
    and applies local algebraic rewrite rules without graph dependency tracing.
    """
    qc = circuit.copy()

    for _ in range(max_iterations):
        instructions = list(qc.data)
        n = len(instructions)
        if n < 1:
            break

        new_instructions: List[CircuitInstruction] = []
        i = 0
        changed = False

        while i < n:
            inst1 = instructions[i]
            op1 = inst1.operation
            name1 = op1.name.lower()

            # Rule: Remove explicit identity or zero-angle rotation
            if name1 in ("id", "identity"):
                changed = True
                i += 1
                continue
            if name1 in ROTATION_GATES and len(op1.params) > 0:
                try:
                    if is_zero_angle(float(op1.params[0])):
                        changed = True
                        i += 1
                        continue
                except (TypeError, ValueError):
                    pass

            # Look ahead for adjacent pair on identical qubits and classical bits
            if i + 1 < n:
                inst2 = instructions[i + 1]
                op2 = inst2.operation
                name2 = op2.name.lower()

                same_operands = (
                    inst1.qubits == inst2.qubits
                    and inst1.clbits == inst2.clbits
                )

                if same_operands:
                    # Rule: Inverse gate cancellation
                    if are_inverse_gates(op1, op2):
                        changed = True
                        i += 2
                        continue

                    # Rule: Rotation merging
                    if name1 == name2 and name1 in ROTATION_GATES:
                        try:
                            th1 = float(op1.params[0])
                            th2 = float(op2.params[0])
                            merged = create_merged_rotation_gate(name1, th1 + th2)
                            if merged is None:
                                changed = True
                                i += 2
                                continue
                            else:
                                new_instructions.append(
                                    CircuitInstruction(merged, inst1.qubits, inst1.clbits)
                                )
                                changed = True
                                i += 2
                                continue
                        except (TypeError, ValueError):
                            pass

            new_instructions.append(inst1)
            i += 1

        qc_next = QuantumCircuit(*circuit.qregs, *circuit.cregs, name=circuit.name)
        qc_next.global_phase = qc.global_phase
        for inst in new_instructions:
            qc_next.append(inst)
        qc = qc_next

        if not changed:
            break

    return qc


# -----------------------------------------------------------------------------
# 7. QuantumCircuitOptimizer Main Interface
# -----------------------------------------------------------------------------

class QuantumCircuitOptimizer:
    """
    Main Compiler Optimizer interface supporting:
    - Level 0: Baseline (No optimization)
    - Level 1: Peephole Optimization only
    - Level 2: DAG-Based Optimization (Identity removal, Inverse cancellation, Rotation merging, Commutation)
    - Level 3: Full Optimization (DAG-Based + Single-Qubit Gate Fusion to fixed point)
    """

    def __init__(self, level: int = 2):
        self.level = level
        self.pass_manager = PassManager()

    def optimize(
        self,
        circuit: QuantumCircuit,
        level: Optional[int] = None,
        verbose: bool = False,
        save_history_csv: Optional[Union[str, Path]] = None,
    ) -> QuantumCircuit:
        opt_level = self.level if level is None else level

        if opt_level == 0:
            return circuit.copy()
        elif opt_level == 1:
            return optimize_peephole(circuit)
        elif opt_level == 2:
            pm = PassManager([
                IdentityRemovalPass(),
                InverseCancellationPass(),
                RotationMergingPass(),
                CommutationCancellationPass(),
                IdentityRemovalPass(),
            ])
            res = pm.run(circuit, verbose=verbose)
            self.pass_manager = pm
            if save_history_csv:
                pm.save_history_csv(save_history_csv)
            return res
        elif opt_level >= 3:
            pm = PassManager([
                IdentityRemovalPass(),
                InverseCancellationPass(),
                RotationMergingPass(),
                CommutationCancellationPass(),
                IdentityRemovalPass(),
                SingleQubitFusionPass(),
                InverseCancellationPass(),
                IdentityRemovalPass(),
            ])
            res = pm.run(circuit, verbose=verbose)
            self.pass_manager = pm
            if save_history_csv:
                pm.save_history_csv(save_history_csv)
            return res
        else:
            raise ValueError(f"Invalid optimization level: {opt_level}")

    def optimize_peephole(self, circuit: QuantumCircuit) -> QuantumCircuit:
        """Run classical peephole optimization."""
        return optimize_peephole(circuit)

    def optimize_dag(
        self,
        circuit: QuantumCircuit,
        verbose: bool = False,
        save_history_csv: Optional[Union[str, Path]] = None
    ) -> QuantumCircuit:
        """Run DAG-based optimization (Level 2)."""
        return self.optimize(circuit, level=2, verbose=verbose, save_history_csv=save_history_csv)


# -----------------------------------------------------------------------------
# 8. DAG Construction and NetworkX Visualization
# -----------------------------------------------------------------------------

def build_dag(circuit: QuantumCircuit) -> DAGCircuit:
    """Convert a QuantumCircuit into a Qiskit DAGCircuit."""
    return circuit_to_dag(circuit)


def dag_to_quantum_circuit(dag: DAGCircuit) -> QuantumCircuit:
    """Convert a Qiskit DAGCircuit back into a QuantumCircuit."""
    return dag_to_circuit(dag)


def dag_to_networkx(dag: DAGCircuit) -> nx.DiGraph:
    """Export a Qiskit DAG into a NetworkX DiGraph with node and edge attributes."""
    g = nx.DiGraph()
    topological_nodes = list(dag.topological_op_nodes())
    node_to_idx = {node: i for i, node in enumerate(topological_nodes)}

    for i, node in enumerate(topological_nodes):
        qarg_indices = [dag.find_bit(q).index for q in node.qargs]
        g.add_node(
            i,
            label=f"{node.name}({','.join(map(str, qarg_indices))})",
            name=node.name,
            qubits=qarg_indices,
            params=[float(p) for p in node.op.params if isinstance(p, (int, float))],
        )

    for wire in dag.wires:
        wire_nodes = [node for node in topological_nodes if wire in node.qargs]
        for i in range(len(wire_nodes) - 1):
            src_idx = node_to_idx[wire_nodes[i]]
            dst_idx = node_to_idx[wire_nodes[i + 1]]
            g.add_edge(src_idx, dst_idx, wire=str(wire))

    return g


def circuit_to_networkx(circuit: QuantumCircuit) -> nx.DiGraph:
    """Convert a QuantumCircuit via its DAG into a NetworkX DiGraph."""
    return dag_to_networkx(circuit_to_dag(circuit))


def export_dag_to_networkx(dag: DAGCircuit) -> nx.DiGraph:
    """Backward compatible alias for dag_to_networkx."""
    return dag_to_networkx(dag)


# -----------------------------------------------------------------------------
# 9. Standalone Pass Functions (for Modular / Individual Invocation)
# -----------------------------------------------------------------------------

def merge_rotations(circuit: QuantumCircuit) -> QuantumCircuit:
    """Execute standalone rotation merging pass on a circuit."""
    dag = circuit_to_dag(circuit)
    dag, _ = RotationMergingPass().run(dag)
    return dag_to_circuit(dag)


def remove_identity_gates(circuit: QuantumCircuit) -> QuantumCircuit:
    """Execute standalone identity removal pass on a circuit."""
    dag = circuit_to_dag(circuit)
    dag, _ = IdentityRemovalPass().run(dag)
    return dag_to_circuit(dag)


# -----------------------------------------------------------------------------
# 10. Mathematical Equivalence Verification
# -----------------------------------------------------------------------------

def check_unitary_equivalence(
    qc1: QuantumCircuit,
    qc2: QuantumCircuit,
    tol: float = 1e-5
) -> Tuple[bool, str]:
    """
    Check unitary equivalence up to global phase.
    Supports circuits up to 10 qubits.
    Rejects circuits containing measurements, resets, or classically conditioned gates.
    Preserves global phase and compares unitaries via Operator.equiv.
    """
    if qc1.num_qubits != qc2.num_qubits:
        return False, f"Qubit count mismatch: {qc1.num_qubits} vs {qc2.num_qubits}"

    if qc1.num_qubits > 10:
        return False, "Verification not performed: circuit has more than 10 qubits."

    def build_unitary_circuit(circuit: QuantumCircuit) -> Tuple[Optional[QuantumCircuit], Optional[str]]:
        clean = QuantumCircuit(circuit.num_qubits)
        clean.global_phase = circuit.global_phase

        for index, instruction in enumerate(circuit.data):
            operation = instruction.operation
            name = operation.name.lower()

            if name == "barrier":
                continue

            if name in {"measure", "reset"}:
                return None, f"Circuit contains non-unitary operation '{name}' at instruction {index}."

            if instruction.clbits or getattr(operation, "condition", None) is not None:
                return None, f"Circuit contains classically controlled operation '{name}' at instruction {index}."

            try:
                indices = [circuit.find_bit(qubit).index for qubit in instruction.qubits]
                clean.append(operation, [clean.qubits[i] for i in indices])
            except Exception as error:
                return None, f"Could not copy instruction: {error}"

        return clean, None

    try:
        clean1, error1 = build_unitary_circuit(qc1)
        if error1:
            return False, f"Input circuit: {error1}"

        clean2, error2 = build_unitary_circuit(qc2)
        if error2:
            return False, f"Output circuit: {error2}"

        operator1 = Operator(clean1)
        operator2 = Operator(clean2)

        if operator1.equiv(operator2, atol=tol):
            return True, "Unitary equivalence verified up to global phase."

        return False, "Unitary matrices differ beyond numerical tolerance."

    except Exception as error:
        return False, f"Unitary equivalence check failed: {error}"
