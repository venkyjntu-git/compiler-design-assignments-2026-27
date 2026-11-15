"""AST node classes for the Tensor Expression DSL.

Positions (line/col) are stored for error reporting but ignored by ``==`` so
trees can be compared structurally in tests.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Union


def _pos():
    return field(default=0, compare=False, repr=False)


@dataclass
class Number:
    value: Union[int, float]
    line: int = _pos()
    col: int = _pos()


@dataclass
class TensorAccess:
    name: str
    indices: list
    line: int = _pos()
    col: int = _pos()


@dataclass
class BinaryOperation:
    op: str
    left: object
    right: object
    line: int = _pos()
    col: int = _pos()


@dataclass
class SumExpression:
    """sum(body, var, lower, upper): sum of body for var in [lower, upper)."""
    body: object
    var: str
    lower: int
    upper: int
    line: int = _pos()
    col: int = _pos()


@dataclass
class TensorDeclaration:
    name: str
    shape: list
    line: int = _pos()
    col: int = _pos()


@dataclass
class Assignment:
    target: TensorAccess
    value: object
    line: int = _pos()
    col: int = _pos()


@dataclass
class Program:
    statements: list = field(default_factory=list)

    @property
    def declarations(self):
        return [s for s in self.statements if isinstance(s, TensorDeclaration)]

    @property
    def assignments(self):
        return [s for s in self.statements if isinstance(s, Assignment)]


_PREC = {"+": 1, "-": 1, "*": 2}


def expr_to_source(node) -> str:
    """Render an expression back to DSL text (tree structure preserved)."""
    if isinstance(node, Number):
        return repr(node.value)
    if isinstance(node, TensorAccess):
        return f"{node.name}[{', '.join(node.indices)}]"
    if isinstance(node, SumExpression):
        return (f"sum({expr_to_source(node.body)}, {node.var}, "
                f"{node.lower}, {node.upper})")
    if isinstance(node, BinaryOperation):
        p = _PREC[node.op]
        left = expr_to_source(node.left)
        right = expr_to_source(node.right)
        if isinstance(node.left, BinaryOperation) and _PREC[node.left.op] < p:
            left = f"({left})"
        if isinstance(node.right, BinaryOperation) and _PREC[node.right.op] <= p:
            right = f"({right})"
        return f"{left} {node.op} {right}"
    raise TypeError(f"unknown expression node: {node!r}")


def statement_to_source(node) -> str:
    if isinstance(node, TensorDeclaration):
        return f"tensor {node.name}[{', '.join(str(d) for d in node.shape)}]"
    return f"{expr_to_source(node.target)} = {expr_to_source(node.value)}"


def format_ast(node, indent: int = 0) -> str:
    """Return an indented, human-readable dump of an AST."""
    pad = "  " * indent
    if isinstance(node, Program):
        return "\n".join([f"{pad}Program"] + [format_ast(s, indent + 1) for s in node.statements])
    if isinstance(node, TensorDeclaration):
        return f"{pad}TensorDeclaration {statement_to_source(node)[7:]}"
    if isinstance(node, Assignment):
        return "\n".join([
            f"{pad}Assignment",
            f"{pad}  target: TensorAccess {expr_to_source(node.target)}",
            f"{pad}  value:",
            format_ast(node.value, indent + 2),
        ])
    if isinstance(node, Number):
        return f"{pad}Number {node.value!r}"
    if isinstance(node, TensorAccess):
        return f"{pad}TensorAccess {expr_to_source(node)}"
    if isinstance(node, BinaryOperation):
        return "\n".join([f"{pad}BinaryOperation '{node.op}'",
                          format_ast(node.left, indent + 1),
                          format_ast(node.right, indent + 1)])
    if isinstance(node, SumExpression):
        return "\n".join([f"{pad}SumExpression var={node.var} range=[{node.lower}, {node.upper})",
                          format_ast(node.body, indent + 1)])
    raise TypeError(f"unknown node: {node!r}")
