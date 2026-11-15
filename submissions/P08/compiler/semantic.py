"""Semantic analysis: declarations, indices, shapes and summations.

Rules enforced (see docs/grammar.md for the language definition):
* tensors must be declared (rank 1..3, positive dims) before use;
* every tensor is assigned at most once, and is read only after assignment;
* the target's indices define the loop variables; element-wise operands must
  have exactly the same extent in each indexed dimension (no broadcasting);
* summation variables must be new, used in the body, have a non-empty range
  that fits inside every dimension they index, and sums cannot be nested.
"""
from __future__ import annotations

import keyword

from compiler import SemanticError
from compiler.ast_nodes import (Assignment, BinaryOperation, Number, Program,
                                SumExpression, TensorAccess, TensorDeclaration,
                                expr_to_source)
from compiler.symbol_table import SymbolTable

MAX_RANK = 3
RESERVED_NAMES = frozenset(keyword.kwlist) | {
    "min", "range", "len", "run", "inputs", "outputs", "print", "list", "dict",
    "tuple", "int", "float", "json",
}


def indices_used(node) -> set:
    if isinstance(node, TensorAccess):
        return set(node.indices)
    if isinstance(node, BinaryOperation):
        return indices_used(node.left) | indices_used(node.right)
    if isinstance(node, SumExpression):
        return indices_used(node.body)
    return set()


class SemanticAnalyzer:
    def __init__(self, program: Program):
        self.program = program
        self.symtab = SymbolTable()
        self.assigned_names = {a.target.name for a in program.assignments}
        self.index_names: set = set()

    def analyze(self) -> SymbolTable:
        if not self.program.assignments:
            raise SemanticError("program contains no assignment statements")
        for stmt in self.program.statements:
            if isinstance(stmt, TensorDeclaration):
                self._declare(stmt)
            else:
                self._assign(stmt)
        return self.symtab

    def _error(self, message, node):
        raise SemanticError(message, getattr(node, "line", None) or None,
                            getattr(node, "col", None) or None)

    def _check_name(self, name, what, node):
        if name.startswith("_"):
            self._error(f"{what} name '{name}' is reserved: names starting with "
                        "'_' are used by the compiler", node)
        if name in RESERVED_NAMES:
            self._error(f"{what} name '{name}' is reserved (Python keyword or a "
                        "name used by generated code)", node)

    def _declare(self, decl: TensorDeclaration):
        self._check_name(decl.name, "tensor", decl)
        if decl.name in self.index_names:
            self._error(f"tensor name '{decl.name}' clashes with an index variable "
                        "used earlier", decl)
        if len(decl.shape) > MAX_RANK:
            self._error(f"tensor '{decl.name}' has rank {len(decl.shape)}; only ranks "
                        f"1 to {MAX_RANK} are supported", decl)
        for dim in decl.shape:
            if dim < 1:
                self._error(f"tensor '{decl.name}' has non-positive dimension {dim}", decl)
        self.symtab.declare(decl.name, decl.shape, decl.line, decl.col)

    def _check_index_name(self, name, node):
        self._check_name(name, "index", node)
        if name in self.symtab:
            self._error(f"index variable '{name}' clashes with the tensor of the same name", node)
        self.index_names.add(name)

    def _assign(self, assign: Assignment):
        target = assign.target
        sym = self.symtab.lookup(target.name)
        if sym is None:
            self._error(f"tensor '{target.name}' is not declared", target)
        if self.symtab.is_assigned(target.name):
            self._error(f"tensor '{target.name}' is already assigned on line "
                        f"{self.symtab.assigned_line(target.name)} (each tensor may be "
                        "assigned only once)", target)
        if len(target.indices) != sym.rank:
            self._error(f"tensor '{target.name}' has rank {sym.rank} but the assignment "
                        f"target uses {len(target.indices)} index(es)", target)
        free: dict = {}
        for dim, var in enumerate(target.indices):
            self._check_index_name(var, target)
            if var in free:
                self._error(f"duplicate index '{var}' in assignment target "
                            f"{expr_to_source(target)}", target)
            free[var] = sym.shape[dim]
        self._check_expr(assign.value, free, {}, target.name)
        self.symtab.mark_assigned(target.name, assign.line)

    def _check_expr(self, node, free, sums, target):
        if isinstance(node, Number):
            return
        if isinstance(node, TensorAccess):
            self._check_access(node, free, sums, target)
        elif isinstance(node, BinaryOperation):
            self._check_expr(node.left, free, sums, target)
            self._check_expr(node.right, free, sums, target)
        elif isinstance(node, SumExpression):
            self._check_sum(node, free, sums, target)
        else:
            self._error(f"unsupported expression: {node!r}", node)

    def _check_sum(self, node, free, sums, target):
        if sums:
            self._error("nested summation is not supported", node)
        var = node.var
        self._check_index_name(var, node)
        if var in free:
            self._error(f"summation variable '{var}' shadows an index of the "
                        "assignment target", node)
        if node.upper <= node.lower:
            self._error(f"summation range [{node.lower}, {node.upper}) is empty", node)
        if var not in indices_used(node.body):
            self._error(f"summation variable '{var}' is not used in the summation body", node)
        self._check_expr(node.body, free, {var: (node.lower, node.upper)}, target)

    def _check_access(self, node, free, sums, target):
        src = expr_to_source(node)
        sym = self.symtab.lookup(node.name)
        if sym is None:
            self._error(f"tensor '{node.name}' is not declared (used in {src})", node)
        if node.name == target:
            self._error(f"tensor '{node.name}' appears on both sides of its own "
                        "assignment; in-place updates are not supported", node)
        if node.name in self.assigned_names and not self.symtab.is_assigned(node.name):
            self._error(f"tensor '{node.name}' is read before it is assigned", node)
        if len(node.indices) != sym.rank:
            self._error(f"tensor '{node.name}' has rank {sym.rank} but is accessed with "
                        f"{len(node.indices)} index(es) in {src}", node)
        for dim, var in enumerate(node.indices):
            size = sym.shape[dim]
            if var in free:
                if size != free[var]:
                    self._error(
                        f"shape mismatch in {src}: dimension {dim} of '{node.name}' has "
                        f"size {size} but index '{var}' ranges over {free[var]} values "
                        "(operands must have identical shapes; broadcasting is not "
                        "supported)", node)
            elif var in sums:
                lo, hi = sums[var]
                if hi > size:
                    self._error(
                        f"summation range [{lo}, {hi}) of '{var}' exceeds dimension {dim} "
                        f"of '{node.name}' (size {size}) in {src}", node)
            else:
                self._error(f"undefined index '{var}' in {src}: an index must be one of "
                            "the target's indices or a summation variable", node)


def analyze(program: Program) -> SymbolTable:
    """Validate a program and return its symbol table."""
    return SemanticAnalyzer(program).analyze()
