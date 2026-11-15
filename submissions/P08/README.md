# TensorDSLCompiler

A small compiler, written in pure Python (3.11+), for a tensor-expression DSL.
It parses programs such as

```
tensor A[2, 3]
tensor B[3, 2]
tensor C[2, 2]
C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)
```

validates shapes, builds an AST and a loop-nest IR, optimizes the loop nests,
generates readable Python with nested `for` loops, saves it in `generated/`
and executes it.

## Features

* Lexer and recursive-descent parser with line/column error messages
* AST, symbol table and semantic analysis (declarations, ranks, shapes, indices, sum bounds)
* Loop-nest IR; sums nested in larger expressions use compiler temporaries
* Optimizations: constant folding, loop fusion, loop interchange, loop tiling (each applied only when legal; the output reports exactly what was applied)
* Code generator with comments naming the source file and applied optimizations
* Controlled runtime executor with input validation
* 89 unit/integration tests, a benchmark, and documentation
* Standard library only - no dependencies

Supported: rank 1, 2 and 3 tensors; positive numeric constants (int or float);
`+`, `-`, `*`; scalar multiplication; element-wise operations; summation
(`sum`) for matrix multiplication and matrix-vector products; combined
expressions with correct precedence. Everything else is rejected with an error.

## Folder structure

```
TensorDSLCompiler/
  main.py  requirements.txt  README.md  .gitignore
  compiler/       lexer, parser, ast_nodes, semantic, symbol_table, ir, optimizer, codegen
  optimizations/  constant_folding, loop_fusion, loop_interchange, loop_tiling
  runtime/        executor
  examples/       six .dsl programs
  generated/      generated Python code is written here
  tests/          six test modules
  benchmarks/     benchmark.py
  docs/           grammar.md, architecture.md, optimizations.md
```

## Installation (Windows PowerShell / VS Code)

Python 3.11 or later is required (check with `py --version`).

```powershell
cd TensorDSLCompiler
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1      # if blocked: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
pip install -r requirements.txt   # nothing is actually required; the file only documents this
```

In VS Code: open the folder, choose the `.venv` interpreter
(Ctrl+Shift+P -> "Python: Select Interpreter"). A virtual environment is
optional; `py main.py ...` works without it. Replace `python` with `py` if
`python` is not on your PATH.

## Usage

```powershell
python main.py examples/addition.dsl
python main.py examples/subtraction.dsl
python main.py examples/multiplication.dsl
python main.py examples/scalar.dsl
python main.py examples/matrix_multiply.dsl
python main.py examples/complex_expression.dsl
python main.py examples/matrix_multiply.dsl --tile 2 --show-code
```

### CLI options

| Option | Meaning |
|--------|---------|
| `--tile N` | tile size (default 16); tiles loops whose extent is greater than N |
| `--no-opt` | disable all optimization passes (generated file gets a `_noopt` suffix) |
| `--disable PASS` | disable one pass: `folding`, `fusion`, `interchange`, `tiling` (repeatable) |
| `--run` | execute the program. Execution is the **default**; this flag is accepted for clarity |
| `--compile-only` | compile and save code but do not execute |
| `--show-code` / `--show-ast` / `--show-ir` | print generated code / AST / optimized IR |
| `--input NAME=JSON` | supply an input tensor, e.g. `--input "A=[[1,2],[3,4]]"` (repeatable) |
| `--inputs-file FILE` | JSON object `{"A": [[...]], ...}` of input tensors |
| `--out-dir DIR` | where to save generated code (default `generated/`) |

**Default inputs** are deterministic: input tensors (those never assigned), in
declaration order, are filled row-major with 1, 2, 3, ... Tensors you do not
supply keep these defaults.

Generated programs also run on their own: `python generated/addition.py`.

### Python API

```python
from main import compile_program, run_compiled, DSLCompileError
compiled = compile_program(open("examples/addition.dsl").read(), "examples/addition.dsl")
print(run_compiled(compiled))            # {'C': [[6, 8], [10, 12]]}
```

## Example inputs and expected outputs (default inputs)

| Example | Inputs | Output |
|---------|--------|--------|
| addition | A=[[1,2],[3,4]], B=[[5,6],[7,8]] | C=[[6,8],[10,12]] |
| subtraction | same | C=[[-4,-4],[-4,-4]] |
| multiplication (element-wise) | same | C=[[5,12],[21,32]] |
| scalar (`A*3`) | A=[[1,2],[3,4]] | B=[[3,6],[9,12]] |
| matrix_multiply | A=[[1,2,3],[4,5,6]], B=[[7,8],[9,10],[11,12]] | C=[[58,64],[139,154]] |
| complex_expression (`A+2*B-D`) | A=[[1,2],[3,4]], B=[[5,6],[7,8]], D=[[9,10],[11,12]] | C=[[2,4],[6,8]] |

## Testing

```powershell
python -m unittest discover -s tests -v
```

(`python -m pytest tests` also works if pytest is installed.) No internet
connection is needed.

## Benchmark

```powershell
python benchmarks/benchmark.py            # optional: --size 64 --ew-size 300 --repeats 5
```

Compares no optimization vs optimization with/without tiling and with tile
sizes 16 and 32 for matrix multiplication, an element-wise expression and a
fusible two-statement chain. Results are checked against the unoptimized
baseline first; compile time and execution time are reported separately.
Timings are real measurements: in pure Python, interchange and tiling often
make no difference or are slower.

## Known limitations

* Ranks 1-3 only; no broadcasting; no division, unary minus or exponentiation.
* Each tensor is assigned once; no in-place updates; no nested sums.
* Index expressions are plain variables (no `i+1`, no constant indices).
* Constant folding does not reassociate (`A*2*3` is not folded).
* Fusion needs identical iteration spaces and no reduction loops.
* Interchange/tiling are checked by a conservative uniform-access rule rather than a general dependence analysis.
* Generated code uses Python lists, so optimizations do not guarantee speed-ups.
* The executor restricts builtins but is not a security sandbox.
* One statement per line; no line continuation.

See `docs/` for the grammar, architecture and optimization details.
