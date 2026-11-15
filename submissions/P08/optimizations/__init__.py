"""Optimization passes operating on the loop-nest IR.

Every pass exposes ``apply(program, ...)``. A pass mutates the (already
copied) IRProgram, appends a description to ``program.applied`` only when it
really changed something, and records why it did nothing in
``program.not_applied`` otherwise.
"""
PASS_NAMES = ("constant_folding", "loop_fusion", "loop_interchange", "loop_tiling")
