"""Intermediate representation: loop nests over tensor statements.

An IRProgram is a list of LoopNest objects executed in order. A LoopNest has
an ordered list of Loops (outermost first) and one or more Stmts executed in
the innermost body. A Stmt writes ``target[indices]`` either with ``=`` or,
for reductions, with ``+=`` (the output tensor is zero-initialised).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Union

from compiler.ast_nodes import (BinaryOperation, Number, Program, SumExpression,
                                TensorAccess, expr_to_source, statement_to_source)
from compiler.symbol_table import SymbolTable


@dataclass
class IRConst:
    value: Union[int, float]


@dataclass
class IRLoad:
    tensor: str
    indices: list


@dataclass
class IRBin:
    op: str
    left: object
    right: object


@dataclass
class Loop:
    var: str
    lower: Union[int, str]
    upper: Union[int, str]
    step: int = 1
    kind: str = "parallel"          # "parallel" or "reduce"


@dataclass
class Stmt:
    target: str
    indices: list
    expr: object
    accumulate: bool = False
    source: str = ""


@dataclass
class LoopNest:
    loops: list
    body: list
    tile_size: Union[int, None] = None


@dataclass
class IRTensor:
    name: str
    shape: tuple
    role: str                       # "input", "output" or "temp"


@dataclass
class IRProgram:
    tensors: dict = field(default_factory=dict)
    nests: list = field(default_factory=list)
    source_name: str = "<string>"
    applied: list = field(default_factory=list)
    not_applied: list = field(default_factory=list)

    def input_shapes(self) -> dict:
        return {t.name: t.shape for t in self.tensors.values() if t.role == "input"}

    def output_shapes(self) -> dict:
        return {t.name: t.shape for t in self.tensors.values() if t.role == "output"}


# ---------------------------------------------------------------- helpers
def expr_loads(expr):
    if isinstance(expr, IRLoad):
        yield expr
    elif isinstance(expr, IRBin):
        yield from expr_loads(expr.left)
        yield from expr_loads(expr.right)


def rename_expr(expr, mapping: dict):
    """Return a copy of expr with index variables renamed (simultaneously)."""
    if isinstance(expr, IRLoad):
        return IRLoad(expr.tensor, [mapping.get(v, v) for v in expr.indices])
    if isinstance(expr, IRBin):
        return IRBin(expr.op, rename_expr(expr.left, mapping), rename_expr(expr.right, mapping))
    return IRConst(expr.value)


def stmt_accesses(stmt: Stmt) -> list:
    """List of (tensor, index_tuple, is_write) for one statement."""
    acc = [(stmt.target, tuple(stmt.indices), True)]
    acc += [(ld.tensor, tuple(ld.indices), False) for ld in expr_loads(stmt.expr)]
    return acc


def nest_accesses(nest: LoopNest) -> list:
    acc = []
    for stmt in nest.body:
        acc += stmt_accesses(stmt)
    return acc


def nest_label(nest: LoopNest) -> str:
    seen = []
    for stmt in nest.body:
        if stmt.target not in seen:
            seen.append(stmt.target)
    return ", ".join(seen)


def reduction_vars(nest: LoopNest) -> list:
    return [l.var for l in nest.loops if l.kind == "reduce"]


def has_static_bounds(nest: LoopNest):
    """True when every loop has constant bounds, unit step and is untiled."""
    if nest.tile_size is not None:
        return False, "nest is already tiled"
    for loop in nest.loops:
        if not (isinstance(loop.lower, int) and isinstance(loop.upper, int) and loop.step == 1):
            return False, "loop bounds are not constant"
    return True, ""


def nest_is_uniform(nest: LoopNest):
    """Every tensor written in the nest is accessed with one subscript tuple.

    This guarantees all dependences are either between identical iterations
    (distance zero) or are the ``+=`` accumulation carried by a reduction loop,
    so loop order/tiling cannot change the per-element order of operations.
    """
    accesses = nest_accesses(nest)
    written = {t for t, _, w in accesses if w}
    for tensor in sorted(written):
        tuples = {idx for t, idx, _ in accesses if t == tensor}
        if len(tuples) > 1:
            return False, f"tensor '{tensor}' is accessed with different subscripts"
    return True, ""


# -------------------------------------------------------------- printing
_PREC = {"+": 1, "-": 1, "*": 2}


def access_to_str(tensor, indices, python=False) -> str:
    if python:
        return tensor + "".join(f"[{v}]" for v in indices)
    return f"{tensor}[{', '.join(indices)}]"


def _operand(node, prec, is_right, python):
    text = expr_to_str(node, python)
    if isinstance(node, IRBin):
        q = _PREC[node.op]
        if q < prec or (is_right and q == prec):
            return f"({text})"
    elif isinstance(node, IRConst) and node.value < 0:
        return f"({text})"
    return text


def expr_to_str(expr, python=False) -> str:
    if isinstance(expr, IRConst):
        return repr(expr.value)
    if isinstance(expr, IRLoad):
        return access_to_str(expr.tensor, expr.indices, python)
    p = _PREC[expr.op]
    return (f"{_operand(expr.left, p, False, python)} {expr.op} "
            f"{_operand(expr.right, p, True, python)}")


def format_ir(program: IRProgram) -> str:
    lines = []
    for t in program.tensors.values():
        lines.append(f"tensor {t.name}[{', '.join(map(str, t.shape))}]  ({t.role})")
    for n, nest in enumerate(program.nests):
        lines.append(f"nest {n}:" + (f"  (tile size {nest.tile_size})" if nest.tile_size else ""))
        pad = "  "
        for loop in nest.loops:
            lines.append(f"{pad}for {loop.var} in [{loop.lower}, {loop.upper}) step {loop.step}"
                         f"  <{loop.kind}>")
            pad += "  "
        for stmt in nest.body:
            op = "+=" if stmt.accumulate else "="
            lines.append(f"{pad}{access_to_str(stmt.target, stmt.indices)} {op} "
                         f"{expr_to_str(stmt.expr)}")
    return "\n".join(lines)


# --------------------------------------------------------------- lowering
class _Lowerer:
    def __init__(self, program: Program, symtab: SymbolTable, source_name: str):
        self.program = program
        self.symtab = symtab
        self.ir = IRProgram(source_name=source_name)
        self.temp_count = 0
        for sym in symtab.all():
            role = "output" if symtab.is_assigned(sym.name) else "input"
            self.ir.tensors[sym.name] = IRTensor(sym.name, sym.shape, role)

    def run(self) -> IRProgram:
        for assign in self.program.assignments:
            self._lower_assignment(assign)
        return self.ir

    def _lower_assignment(self, assign):
        target = assign.target
        shape = self.symtab.get(target.name).shape
        indices = list(target.indices)
        source = statement_to_source(assign)
        if isinstance(assign.value, SumExpression):
            self.ir.nests.append(
                self._reduction_nest(target.name, indices, shape, assign.value, source))
            return
        hoisted: list = []
        expr = self._convert(assign.value, indices, shape, hoisted)
        self.ir.nests.extend(hoisted)
        loops = [Loop(v, 0, n) for v, n in zip(indices, shape)]
        self.ir.nests.append(LoopNest(loops, [Stmt(target.name, indices, expr, False, source)]))

    def _reduction_nest(self, name, indices, shape, node, source):
        loops = [Loop(v, 0, n) for v, n in zip(indices, shape)]
        loops.append(Loop(node.var, node.lower, node.upper, 1, "reduce"))
        body = self._convert(node.body, indices, shape, None)
        return LoopNest(loops, [Stmt(name, list(indices), body, True, source)])

    def _convert(self, node, indices, shape, hoisted):
        if isinstance(node, Number):
            return IRConst(node.value)
        if isinstance(node, TensorAccess):
            return IRLoad(node.name, list(node.indices))
        if isinstance(node, BinaryOperation):
            return IRBin(node.op, self._convert(node.left, indices, shape, hoisted),
                         self._convert(node.right, indices, shape, hoisted))
        if isinstance(node, SumExpression):
            # A sum inside a larger expression is computed into a temporary
            # tensor by its own reduction nest, then read back element-wise.
            name = f"_tmp{self.temp_count}"
            self.temp_count += 1
            self.ir.tensors[name] = IRTensor(name, shape, "temp")
            src = f"{name}[{', '.join(indices)}] = {expr_to_source(node)}"
            hoisted.append(self._reduction_nest(name, indices, shape, node, src))
            return IRLoad(name, list(indices))
        raise TypeError(f"cannot lower {node!r}")


def lower(program: Program, symtab: SymbolTable, source_name: str = "<string>") -> IRProgram:
    """Lower a validated AST to loop-nest IR."""
    return _Lowerer(program, symtab, source_name).run()
