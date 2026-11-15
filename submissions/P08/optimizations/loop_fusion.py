"""Loop fusion: merge adjacent element-wise loop nests when it is legal.

Two adjacent nests A then B are fused only if
  * neither contains a reduction loop, both are untiled with constant bounds;
  * they have the same number of loops with identical bounds (B's loop
    variables are renamed positionally to A's);
  * every pair of accesses to the same tensor where at least one is a write
    uses the *same* subscript tuple. The write subscript is the full loop
    tuple, so the two accesses touch the same element only in the same
    iteration, and A's statements run before B's within that iteration -
    exactly the order of the unfused program.
Anything else is left unchanged.
"""
from __future__ import annotations

from compiler.ir import (IRProgram, LoopNest, Stmt, has_static_bounds, nest_accesses,
                         nest_label, rename_expr)


def _simple_parallel(nest: LoopNest):
    ok, why = has_static_bounds(nest)
    if not ok:
        return False, why
    if any(l.kind != "parallel" for l in nest.loops):
        return False, "nest contains a reduction loop"
    loop_vars = [l.var for l in nest.loops]
    for stmt in nest.body:
        if stmt.accumulate or list(stmt.indices) != loop_vars:
            return False, "statement does not write the full iteration space"
    return True, ""


def _renamed(nest: LoopNest, mapping: dict) -> list:
    return [Stmt(s.target, [mapping.get(v, v) for v in s.indices],
                 rename_expr(s.expr, mapping), s.accumulate, s.source) for s in nest.body]


def can_fuse(a: LoopNest, b: LoopNest):
    """Return (is_legal, reason)."""
    for nest in (a, b):
        ok, why = _simple_parallel(nest)
        if not ok:
            return False, why
    if len(a.loops) != len(b.loops):
        return False, "loop nests have different depths"
    for la, lb in zip(a.loops, b.loops):
        if (la.lower, la.upper) != (lb.lower, lb.upper):
            return False, "iteration spaces differ"
    mapping = {lb.var: la.var for la, lb in zip(a.loops, b.loops)}
    b_stmts = _renamed(b, mapping)
    a_acc = nest_accesses(a)
    b_acc = nest_accesses(LoopNest(a.loops, b_stmts))
    for ta, ia, wa in a_acc:
        for tb, ib, wb in b_acc:
            if ta == tb and (wa or wb) and ia != ib:
                return False, (f"data dependence on '{ta}' with different subscripts "
                               f"{list(ia)} vs {list(ib)}")
    return True, ""


def fuse(a: LoopNest, b: LoopNest) -> LoopNest:
    mapping = {lb.var: la.var for la, lb in zip(a.loops, b.loops)}
    return LoopNest(list(a.loops), list(a.body) + _renamed(b, mapping))


def apply(program: IRProgram) -> bool:
    if len(program.nests) < 2:
        program.not_applied.append("loop fusion: only one loop nest, nothing to fuse")
        return False
    result = [program.nests[0]]
    changed = False
    for nest in program.nests[1:]:
        ok, reason = can_fuse(result[-1], nest)
        if ok:
            program.applied.append(
                f"loop fusion: nests for '{nest_label(result[-1])}' and "
                f"'{nest_label(nest)}' fused into one loop nest")
            result[-1] = fuse(result[-1], nest)
            changed = True
        else:
            program.not_applied.append(
                f"loop fusion: '{nest_label(result[-1])}' and '{nest_label(nest)}' "
                f"not fused ({reason})")
            result.append(nest)
    program.nests = result
    return changed
