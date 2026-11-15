"""Controlled execution of generated code.

The generated code comes from the compiler (never from user text), and is run
with a minimal ``__builtins__`` table (range, min, len). This keeps execution
predictable; it is not a security sandbox.
"""
from __future__ import annotations

import copy
import math

from compiler import ExecutionError

SAFE_BUILTINS = {"range": range, "min": min, "len": len}


def default_inputs(input_shapes: dict) -> dict:
    """Deterministic sample inputs: input tensors in declaration order are
    filled row-major with consecutive integers starting at 1."""
    counter = [1]

    def fill(shape):
        if len(shape) == 1:
            start = counter[0]
            counter[0] += shape[0]
            return list(range(start, start + shape[0]))
        return [fill(shape[1:]) for _ in range(shape[0])]

    return {name: fill(tuple(shape)) for name, shape in input_shapes.items()}


def _validate(name, value, shape, path=""):
    if not isinstance(value, (list, tuple)):
        raise ExecutionError(f"input '{name}'{path}: expected a list of length {shape[0]}")
    if len(value) != shape[0]:
        raise ExecutionError(f"input '{name}'{path}: expected length {shape[0]} "
                             f"but got {len(value)}")
    if len(shape) == 1:
        for i, v in enumerate(value):
            if isinstance(v, bool) or not isinstance(v, (int, float)):
                raise ExecutionError(f"input '{name}'{path}[{i}]: expected a number, got {v!r}")
            if isinstance(v, float) and not math.isfinite(v):
                raise ExecutionError(f"input '{name}'{path}[{i}]: value must be finite")
        return list(value)
    return [_validate(name, row, shape[1:], f"{path}[{i}]") for i, row in enumerate(value)]


def validate_inputs(input_shapes: dict, inputs: dict) -> dict:
    """Check names, shapes and values; return a clean deep copy."""
    missing = [n for n in input_shapes if n not in inputs]
    if missing:
        raise ExecutionError(f"missing input tensor(s): {', '.join(missing)}")
    extra = [n for n in inputs if n not in input_shapes]
    if extra:
        raise ExecutionError(f"unknown input tensor(s): {', '.join(extra)} "
                             f"(inputs are: {', '.join(input_shapes) or 'none'})")
    return {n: _validate(n, inputs[n], tuple(s)) for n, s in input_shapes.items()}


def _check_output_shape(name, value, shape):
    if not isinstance(value, list) or len(value) != shape[0]:
        raise ExecutionError(f"output '{name}' has the wrong shape (expected {shape})")
    if len(shape) > 1:
        for row in value:
            _check_output_shape(name, row, shape[1:])


def load_program(code: str):
    """Execute generated source in a restricted namespace; return run()."""
    namespace = {"__builtins__": dict(SAFE_BUILTINS), "__name__": "tensor_dsl_generated"}
    try:
        exec(compile(code, "<generated>", "exec"), namespace)
    except Exception as exc:  # noqa: BLE001
        raise ExecutionError(f"generated code failed to load: {exc}") from exc
    run = namespace.get("run")
    if not callable(run):
        raise ExecutionError("generated code does not define run(inputs)")
    return run


def execute(code: str, input_shapes: dict, output_shapes: dict, inputs: dict | None = None) -> dict:
    """Validate inputs, run the generated program and return its outputs."""
    if inputs is None:
        inputs = default_inputs(input_shapes)
    clean = validate_inputs(input_shapes, inputs)
    run = load_program(code)
    try:
        outputs = run(copy.deepcopy(clean))
    except Exception as exc:  # noqa: BLE001
        raise ExecutionError(f"generated code raised {type(exc).__name__}: {exc}") from exc
    if set(outputs) != set(output_shapes):
        raise ExecutionError("generated code returned unexpected output tensors")
    for name, shape in output_shapes.items():
        _check_output_shape(name, outputs[name], tuple(shape))
    return outputs
