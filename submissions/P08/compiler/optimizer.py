"""Optimization controller: runs the passes from the optimizations package."""
from __future__ import annotations

import copy
from dataclasses import dataclass

from compiler import OptimizationError
from compiler.ir import IRProgram
from optimizations import constant_folding, loop_fusion, loop_interchange, loop_tiling


@dataclass
class OptimizerConfig:
    enabled: bool = True
    tile_size: int = 16
    constant_folding: bool = True
    loop_fusion: bool = True
    loop_interchange: bool = True
    loop_tiling: bool = True


def optimize(program: IRProgram, config: OptimizerConfig | None = None) -> IRProgram:
    """Return an optimized deep copy of program (the input is not modified)."""
    config = config or OptimizerConfig()
    result = copy.deepcopy(program)
    result.applied = []
    result.not_applied = []
    if not config.enabled:
        result.not_applied.append("all optimization passes are disabled")
        return result
    if isinstance(config.tile_size, bool) or not isinstance(config.tile_size, int) \
            or config.tile_size < 1:
        raise OptimizationError("tile size must be a positive integer")
    steps = [
        ("constant folding", config.constant_folding, constant_folding.apply),
        ("loop fusion", config.loop_fusion, loop_fusion.apply),
        ("loop interchange", config.loop_interchange, loop_interchange.apply),
        ("loop tiling", config.loop_tiling,
         lambda p: loop_tiling.apply(p, config.tile_size)),
    ]
    for name, enabled, run in steps:
        if enabled:
            run(result)
        else:
            result.not_applied.append(f"{name}: disabled by configuration")
    return result
