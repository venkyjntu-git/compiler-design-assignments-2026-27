"""Loop tiling (blocking) with correct handling of partial final tiles.

A loop ``for v in range(lo, hi)`` whose extent exceeds the tile size T becomes
    for _t_v in range(lo, hi, T):
        for v in range(_t_v, min(_t_v + T, hi)):
All tile loops are placed outermost (original relative order), followed by the
point loops. ``min`` makes the last tile shorter when T does not divide the
extent. Loops with extent <= T are left alone.

Legality: constant bounds, untiled, uniform accesses and at most one reduction
loop, so each element is still accumulated in the same order.
"""
from __future__ import annotations

from compiler.ir import (IRProgram, Loop, has_static_bounds, nest_is_uniform,
                         nest_label, reduction_vars)


def tiling_is_legal(nest):
    ok, why = has_static_bounds(nest)
    if not ok:
        return False, why
    ok, why = nest_is_uniform(nest)
    if not ok:
        return False, why
    if len(reduction_vars(nest)) > 1:
        return False, "more than one reduction loop"
    return True, ""


def apply(program: IRProgram, tile_size: int) -> bool:
    changed = False
    for nest in program.nests:
        label = nest_label(nest)
        ok, why = tiling_is_legal(nest)
        if not ok:
            program.not_applied.append(f"loop tiling: nest '{label}' not tiled ({why})")
            continue
        eligible = {l.var for l in nest.loops if l.upper - l.lower > tile_size}
        if not eligible:
            program.not_applied.append(
                f"loop tiling: nest '{label}' not tiled (no loop extent exceeds "
                f"tile size {tile_size})")
            continue
        tile_loops, point_loops = [], []
        for loop in nest.loops:
            if loop.var in eligible:
                tv = f"_t_{loop.var}"
                tile_loops.append(Loop(tv, loop.lower, loop.upper, tile_size, loop.kind))
                point_loops.append(Loop(loop.var, tv,
                                        f"min({tv} + {tile_size}, {loop.upper})", 1, loop.kind))
            else:
                point_loops.append(loop)
        nest.loops = tile_loops + point_loops
        nest.tile_size = tile_size
        names = ", ".join(l.var for l in nest.loops if l.var in eligible)
        program.applied.append(
            f"loop tiling: nest '{label}' tiled with tile size {tile_size} on loop(s) {names}")
        changed = True
    return changed
