"""Loop interchange: reorder loops for unit-stride (row-major) inner access.

Heuristic: the loop variable that is the *last* subscript of the most
accesses becomes innermost (stable sort, ties keep the original order). For
matrix multiplication this turns i,j,k into i,k,j.

Legality (checked before reordering):
  * all loop bounds are constant (rectangular, untiled nest);
  * every tensor written in the nest is accessed with a single subscript
    tuple (so the only dependences are same-iteration or the ``+=``
    accumulation over the reduction loop);
  * the relative order of reduction loops is unchanged, so each output
    element is still accumulated in exactly the same order (bit-identical
    results, even for floating point).
"""
from __future__ import annotations

from compiler.ir import (IRProgram, LoopNest, has_static_bounds, nest_accesses,
                         nest_is_uniform, nest_label)


def preferred_order(nest: LoopNest) -> list:
    scores = {l.var: 0 for l in nest.loops}
    for _, idx, _ in nest_accesses(nest):
        if idx and idx[-1] in scores:
            scores[idx[-1]] += 1
    return sorted(nest.loops, key=lambda l: scores[l.var])


def legal_interchange(nest: LoopNest, new_order: list):
    """new_order is a list of loop variable names. Returns (is_legal, reason)."""
    old = [l.var for l in nest.loops]
    if sorted(old) != sorted(new_order):
        return False, "new order is not a permutation of the loops"
    ok, why = has_static_bounds(nest)
    if not ok:
        return False, why
    ok, why = nest_is_uniform(nest)
    if not ok:
        return False, why
    red = {l.var for l in nest.loops if l.kind == "reduce"}
    if [v for v in old if v in red] != [v for v in new_order if v in red]:
        return False, "would reorder reduction loops"
    return True, ""


def apply(program: IRProgram) -> bool:
    changed = False
    for nest in program.nests:
        old = [l.var for l in nest.loops]
        new_loops = preferred_order(nest)
        new = [l.var for l in new_loops]
        if new == old:
            continue
        ok, reason = legal_interchange(nest, new)
        if ok:
            nest.loops = new_loops
            program.applied.append(
                f"loop interchange: nest '{nest_label(nest)}' loops "
                f"({', '.join(old)}) -> ({', '.join(new)})")
            changed = True
        else:
            program.not_applied.append(
                f"loop interchange: nest '{nest_label(nest)}' not reordered ({reason})")
    if not changed and not any(m.startswith("loop interchange") for m in program.not_applied):
        program.not_applied.append(
            "loop interchange: loop order is already best for every nest")
    return changed
