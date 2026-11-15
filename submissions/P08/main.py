"""TensorDSLCompiler command-line interface.

Public API: compile_program(), run_compiled(), DSLCompileError.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from compiler import DSLCompileError, ExecutionError
from compiler.ast_nodes import format_ast
from compiler.codegen import CompiledProgram, generate_code, save_code
from compiler.ir import format_ir, lower
from compiler.optimizer import OptimizerConfig, optimize
from compiler.parser import parse
from compiler.semantic import analyze
from runtime.executor import default_inputs, execute

PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "generated"

__all__ = ["compile_program", "run_compiled", "DSLCompileError", "main"]


def compile_program(source: str, source_name: str = "<string>",
                    config: OptimizerConfig | None = None,
                    output_dir=None, save: bool = True) -> CompiledProgram:
    """Compile DSL text to Python code (saved under generated/ by default)."""
    config = config or OptimizerConfig()
    try:
        ast = parse(source)
        symtab = analyze(ast)
        ir = lower(ast, symtab, source_name)
        optimized_ir = optimize(ir, config)
        code = generate_code(optimized_ir, source_name, config.enabled)
    except DSLCompileError as exc:
        if exc.filename is None and source_name != "<string>":
            exc.filename = source_name
        raise
    path = None
    if save:
        stem = re.sub(r"\.[^.]*$", "", Path(source_name).name) if source_name != "<string>" else "program"
        if not config.enabled:
            stem += "_noopt"
        path = save_code(code, output_dir or DEFAULT_OUTPUT_DIR, stem)
    return CompiledProgram(
        source_name=source_name, code=code, ir=optimized_ir,
        input_shapes=optimized_ir.input_shapes(), output_shapes=optimized_ir.output_shapes(),
        optimized=config.enabled, ast=ast, ir_unoptimized=ir, generated_path=path)


def run_compiled(compiled: CompiledProgram, inputs: dict | None = None) -> dict:
    """Execute a compiled program. Missing inputs default to sample data."""
    return execute(compiled.code, compiled.input_shapes, compiled.output_shapes, inputs)


def _resolve_inputs(compiled, input_args, inputs_file) -> dict:
    inputs = default_inputs(compiled.input_shapes)
    overrides = {}
    if inputs_file:
        try:
            data = json.loads(Path(inputs_file).read_text(encoding="utf-8-sig"))
        except (OSError, ValueError) as exc:
            raise ExecutionError(f"cannot read inputs file '{inputs_file}': {exc}")
        if not isinstance(data, dict):
            raise ExecutionError("inputs file must contain a JSON object {name: tensor}")
        overrides.update(data)
    for item in input_args or []:
        name, sep, raw = item.partition("=")
        if not sep:
            raise ExecutionError(f"--input expects NAME=JSON, got '{item}'")
        try:
            overrides[name.strip()] = json.loads(raw)
        except ValueError as exc:
            raise ExecutionError(f"--input {name.strip()}: invalid JSON ({exc})")
    unknown = [n for n in overrides if n not in compiled.input_shapes]
    if unknown:
        raise ExecutionError(f"unknown input tensor(s): {', '.join(unknown)} "
                             f"(inputs are: {', '.join(compiled.input_shapes) or 'none'})")
    inputs.update(overrides)
    return inputs


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="main.py", description="Compile a tensor-expression DSL file to Python loop nests "
        "and run it. By default inputs are sample data: input tensors, in declaration "
        "order, are filled row-major with 1, 2, 3, ...")
    p.add_argument("source", help="path to a .dsl file")
    p.add_argument("--tile", type=int, default=16, metavar="N", help="tile size (default 16)")
    p.add_argument("--no-opt", action="store_true", help="disable all optimization passes")
    p.add_argument("--disable", action="append", default=[],
                   choices=["folding", "fusion", "interchange", "tiling"],
                   help="disable one optimization pass (repeatable)")
    p.add_argument("--run", action="store_true",
                   help="execute the compiled program (this is the default)")
    p.add_argument("--compile-only", action="store_true", help="compile but do not execute")
    p.add_argument("--show-code", action="store_true", help="print the generated Python code")
    p.add_argument("--show-ast", action="store_true", help="print the AST")
    p.add_argument("--show-ir", action="store_true", help="print the optimized IR")
    p.add_argument("--input", action="append", default=[], metavar="NAME=JSON",
                   help='supply an input tensor, e.g. --input "A=[[1,2],[3,4]]" (repeatable)')
    p.add_argument("--inputs-file", metavar="FILE", help="JSON file {name: tensor}")
    p.add_argument("--out-dir", metavar="DIR", help="where to save generated code (default generated/)")
    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    if args.run and args.compile_only:
        print("error: --run and --compile-only cannot be combined", file=sys.stderr)
        return 2
    try:
        source = Path(args.source).read_text(encoding="utf-8-sig")
    except OSError as exc:
        print(f"error: cannot read '{args.source}': {exc.strerror}", file=sys.stderr)
        return 1
    off = set(args.disable)
    config = OptimizerConfig(
        enabled=not args.no_opt, tile_size=args.tile,
        constant_folding="folding" not in off, loop_fusion="fusion" not in off,
        loop_interchange="interchange" not in off, loop_tiling="tiling" not in off)
    try:
        compiled = compile_program(source, args.source, config, output_dir=args.out_dir)
        print(f"Compiled {args.source} -> {compiled.generated_path}")
        print("Optimizations applied: " + ("; ".join(compiled.applied) if compiled.applied else "none"))
        if args.show_ast:
            print("\n--- AST ---\n" + format_ast(compiled.ast))
        if args.show_ir:
            print("\n--- IR (after optimization) ---\n" + format_ir(compiled.ir))
        if args.show_code:
            print("\n--- Generated code ---\n" + compiled.code)
        if args.compile_only:
            return 0
        inputs = _resolve_inputs(compiled, args.input, args.inputs_file)
        outputs = run_compiled(compiled, inputs)
    except DSLCompileError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print("\nInputs:")
    for name, value in inputs.items():
        print(f"  {name} = {json.dumps(value)}")
    print("Outputs:")
    for name, value in outputs.items():
        print(f"  {name} = {json.dumps(value)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
