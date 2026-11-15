"""Constant folding: evaluate constant-only sub-expressions at compile time.

Only exact sub-trees whose two operands are both constants are folded, so the
evaluation order of the original expression is never changed (``A * 2 * 3`` is
(A*2)*3 and is intentionally NOT folded because that would reassociate).
Results that are not finite are left unfolded.
"""
from __future__ import annotations

import math

from compiler.ir import IRBin, IRConst, IRProgram


def _compute(op, a, b):
    if op == "+":
        return a + b
    if op == "-":
        return a - b
    return a * b


def fold_expr(expr):
    """Return (new_expr, number_of_folds)."""
    if not isinstance(expr, IRBin):
        return expr, 0
    left, n1 = fold_expr(expr.left)
    right, n2 = fold_expr(expr.right)
    if isinstance(left, IRConst) and isinstance(right, IRConst):
        try:
            value = _compute(expr.op, left.value, right.value)
        except OverflowError:
            value = None
        if value is not None and (isinstance(value, int) or math.isfinite(value)):
            return IRConst(value), n1 + n2 + 1
    return IRBin(expr.op, left, right), n1 + n2


def apply(program: IRProgram) -> bool:
    total = 0
    for nest in program.nests:
        for stmt in nest.body:
            stmt.expr, count = fold_expr(stmt.expr)
            total += count
    if total:
        program.applied.append(
            f"constant folding: {total} constant-only expression(s) evaluated at compile time")
        return True
    program.not_applied.append("constant folding: no constant-only sub-expressions found")
    return False
