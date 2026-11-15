# TensorDSLCompiler

A small compiler, written in pure Python, that turns tensor expressions such as `C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)` into optimized, readable Python loop nests and runs them.

## Team
- T.Hima Bindu, 24VV1A0561
- Y.Syamala Sudha, 24VV1A0563
- Y.Kavya, 24VV1A0564
- Problem: P08 - Tensor Expression DSL Compiled to Optimized Loop Nests
- Course: Compiler Design, 2026-27

## Problem statement
Numerical code is usually written as tensor (array) expressions, but a machine can only execute them as loops over individual elements. Writing those loops by hand is slow and error-prone, and the loop order and structure decide how well the code uses memory. This project defines a small tensor-expression language (DSL) and a complete compiler for it. The compiler checks shapes, lowers each expression to a loop-nest intermediate representation (IR), applies four classic loop optimizations only when they are legal, and generates Python code with nested `for` loops. It shows every compiler stage end to end on a problem small enough to inspect by hand.

## Background theory
The compiler follows the standard front-end / middle-end / back-end pipeline:

| Phase | Concept | Where |
|-------|---------|-------|
| Lexical analysis | Turn characters into tokens (`TENSOR`, `IDENT`, `NUMBER`, `+`, ...) | `compiler/lexer.py` |
| Syntax analysis | Recursive-descent parser for an LL grammar; builds the AST | `compiler/parser.py` |
| Semantic analysis | Symbol table, rank/shape/index checks | `compiler/semantic.py` |
| Intermediate code | Loop-nest IR (`Loop`, `Stmt`, `LoopNest`) | `compiler/ir.py` |
| Optimization | Constant folding, loop fusion, loop interchange, loop tiling | `optimizations/` |
| Code generation | Emit Python source | `compiler/codegen.py` |

**Worked example: matrix multiplication** (`examples/matrix_multiply.dsl`)

```
tensor A[2, 3]
tensor B[3, 2]
tensor C[2, 2]
C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)
```

1. **Lexer** splits each line into tokens, for example `tensor A [ 2 , 3 ]` becomes `TENSOR IDENT LBRACKET NUMBER COMMA NUMBER RBRACKET NEWLINE`.
2. **Parser** builds the AST:
   ```
   Assignment
     target: TensorAccess C[i, j]
     value: SumExpression var=k range=[0, 3)
              BinaryOperation '*'
                TensorAccess A[i, k]
                TensorAccess B[k, j]
   ```
3. **Semantic analysis** checks that `A`, `B`, `C` are declared, each access has as many indices as the tensor's rank, and `k in [0, 3)` fits the dimensions it indexes (A's columns and B's rows are both 3).
4. **IR lowering** creates a loop nest over the target's indices `i, j` plus a reduction loop `k` (the `sum`), with `+=`:
   ```
   for i in [0, 2)  <parallel>
     for j in [0, 2)  <parallel>
       for k in [0, 3)  <reduce>
         C[i, j] += A[i, k] * B[k, j]
   ```
5. **Optimizer** applies loop interchange: for row-major Python lists the variable that is the last subscript in most accesses (`j`) should be innermost, so `(i, j, k)` becomes `(i, k, j)`. The order of the reduction loop is unchanged, so results are bit-identical.
6. **Code generator** emits:
   ```python
   for i in range(2):
       for k in range(3):
           for j in range(2):
               C[i][j] += A[i][k] * B[k][j]
   ```
7. **Runtime** runs it with default inputs `A=[[1,2,3],[4,5,6]]`, `B=[[7,8],[9,10],[11,12]]` and returns `C=[[58, 64], [139, 154]]` (check: `1*7 + 2*9 + 3*11 = 58`).

## Features
- [x] Lexer with line/column error messages
- [x] Recursive-descent parser, AST and symbol table
- [x] Semantic analysis: declarations, ranks, shapes, index variables, `sum` bounds
- [x] Loop-nest IR (sums inside larger expressions use compiler temporaries)
- [x] Constant folding
- [x] Loop fusion
- [x] Loop interchange
- [x] Loop tiling (with correct partial last tile)
- [x] Each optimization applied only when legal; the output reports what was applied and what was not, and why
- [x] Code generator that writes readable Python into `generated/`
- [x] Runtime executor with input validation
- [x] CLI to inspect AST, IR and generated code
- [x] 89 unit and integration tests, benchmark script, docs
- [x] Standard library only, no dependencies

Supported language: tensors of rank 1, 2 and 3; positive int/float constants; `+`, `-`, `*` (element-wise); scalar multiplication; `sum(...)` for matrix multiplication and matrix-vector products; parentheses and correct precedence.

## Architecture

```
DSL text -> Lexer -> Parser -> AST -> Semantic analysis -> IR -> Optimizer -> Code generator -> Runtime
              |         |       |          |                |        |              |              |
          Token list  AST   Program   SymbolTable       IRProgram  optimized    Python source   output
                                                         of LoopNests  IR        in generated/    tensors
```

```
submissions/P08/
  main.py  requirements.txt  README.md
  compiler/       lexer, parser, ast_nodes, semantic, symbol_table, ir, optimizer, codegen
  optimizations/  constant_folding, loop_fusion, loop_interchange, loop_tiling
  runtime/        executor
  examples/       six .dsl programs
  generated/      generated Python code is written here
  tests/          six test modules
  benchmarks/     benchmark.py
  docs/           grammar.md, architecture.md, optimizations.md
```

Key data structures:
- **Token** (kind, text, line, col, value)
- **AST**: `Program`, `TensorDeclaration`, `Assignment`, `BinaryOperation`, `Number`, `TensorAccess`, `SumExpression`
- **SymbolTable**: name, shape, rank, declaration line, assigned or not
- **IR**: `Loop(var, lower, upper, step, kind)`, `Stmt(target, indices, expr, accumulate)`, `LoopNest(loops, body, tile_size)`, `IRProgram(tensors, nests, applied, not_applied)`

Details: `docs/architecture.md`, `docs/grammar.md`, `docs/optimizations.md`.

## Installation
Requires Python 3.11 or later. No third-party packages are needed.

```bash
cd submissions/P08
python -m venv .venv                # optional
source .venv/bin/activate           # Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt     # installs nothing; the file only documents this
```

## Usage

```bash
python main.py examples/addition.dsl
python main.py examples/matrix_multiply.dsl --show-ast --show-ir --show-code
python main.py examples/matrix_multiply.dsl --tile 2 --show-code
python main.py examples/matrix_multiply.dsl --no-opt
python main.py examples/matrix_multiply.dsl --input "A=[[1,0,0],[0,1,0]]" --input "B=[[1,2],[3,4],[5,6]]"
```

| Option | Meaning |
|--------|---------|
| `--tile N` | tile size (default 16); tiles loops whose extent is greater than N |
| `--no-opt` | disable all optimization passes |
| `--disable PASS` | disable one pass: `folding`, `fusion`, `interchange`, `tiling` (repeatable) |
| `--run` | execute the program (execution is already the default) |
| `--compile-only` | compile and save code but do not execute |
| `--show-code` / `--show-ast` / `--show-ir` | print generated code / AST / optimized IR |
| `--input NAME=JSON` | supply an input tensor (repeatable) |
| `--inputs-file FILE` | JSON object of input tensors |
| `--out-dir DIR` | where to save generated code (default `generated/`) |

Default inputs are deterministic: tensors that are never assigned are filled row-major with 1, 2, 3, ...

Example output for `python main.py examples/matrix_multiply.dsl`:

```
Compiled examples/matrix_multiply.dsl -> generated/matrix_multiply.py
Optimizations applied: loop interchange: nest 'C' loops (i, j, k) -> (i, k, j)
Inputs:
  A = [[1, 2, 3], [4, 5, 6]]
  B = [[7, 8], [9, 10], [11, 12]]
Outputs:
  C = [[58, 64], [139, 154]]
```

Generated programs also run on their own: `python generated/matrix_multiply.py`.

Python API:

```python
from main import compile_program, run_compiled
compiled = compile_program(open("examples/addition.dsl").read(), "examples/addition.dsl")
print(run_compiled(compiled))   # {'C': [[6, 8], [10, 12]]}
```

## Examples and results

| Example | DSL statement | Inputs | Output |
|---------|---------------|--------|--------|
| addition | `C[i, j] = A[i, j] + B[i, j]` | A=[[1,2],[3,4]], B=[[5,6],[7,8]] | C=[[6,8],[10,12]] |
| subtraction | `C[i, j] = A[i, j] - B[i, j]` | same | C=[[-4,-4],[-4,-4]] |
| multiplication (element-wise) | `C[i, j] = A[i, j] * B[i, j]` | same | C=[[5,12],[21,32]] |
| scalar | `B[i, j] = A[i, j] * 3` | A=[[1,2],[3,4]] | B=[[3,6],[9,12]] |
| matrix_multiply | `C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)` | A=[[1,2,3],[4,5,6]], B=[[7,8],[9,10],[11,12]] | C=[[58,64],[139,154]] |
| complex_expression | `C[i, j] = A[i, j] + 2 * B[i, j] - D[i, j]` | A, B as above, D=[[9,10],[11,12]] | C=[[2,4],[6,8]] |

**Tiling example** (`--tile 2` on the 2x3 by 3x2 product): the `k` loop (extent 3) is tiled; the last tile has one iteration.

```python
for _t_k in range(0, 3, 2):
    for i in range(2):
        for k in range(_t_k, min(_t_k + 2, 3)):
            for j in range(2):
                C[i][j] += A[i][k] * B[k][j]
```

**Benchmark** (`python benchmarks/benchmark.py`; random integers in [-9, 9], seed 0, best of 3 runs; every configuration produced results identical to the unoptimized baseline). Times are one run on the development machine and vary between runs.

| Workload | Dimensions | Configuration | Compile ms | Exec ms | vs no-opt |
|----------|-----------|---------------|-----------:|--------:|----------:|
| matrix multiply | 48x48 @ 48x48 | no optimization | 0.37 | 5.92 | 1.00x |
| matrix multiply | 48x48 @ 48x48 | opt, no tiling | 0.44 | 7.21 | 0.82x |
| matrix multiply | 48x48 @ 48x48 | opt, tile=16 | 0.32 | 8.12 | 0.73x |
| matrix multiply | 48x48 @ 48x48 | opt, tile=32 | 0.34 | 7.99 | 0.74x |
| element-wise expr | 200x200 | no optimization | 0.34 | 3.34 | 1.00x |
| element-wise expr | 200x200 | opt, no tiling | 0.39 | 2.84 | 1.18x |
| element-wise expr | 200x200 | opt, tile=16 | 0.39 | 3.39 | 0.99x |
| element-wise expr | 200x200 | opt, tile=32 | 0.43 | 3.67 | 0.91x |
| two-stage chain (fusion) | 200x200 | no optimization | 0.35 | 2.93 | 1.00x |
| two-stage chain (fusion) | 200x200 | opt, no tiling | 0.42 | 2.50 | 1.17x |
| two-stage chain (fusion) | 200x200 | opt, tile=16 | 0.42 | 2.84 | 1.03x |
| two-stage chain (fusion) | 200x200 | opt, tile=32 | 0.41 | 2.58 | 1.14x |

(`vs no-opt` = unoptimized time / this time; above 1 is faster.) Interchange and tiling are designed to improve cache use, which Python lists do not benefit from, so they give no speed-up or are slightly slower here. Fusion gives a small gain on the chain. The value of these passes is correct loop-nest transformation, not guaranteed speed.

There is no external reference tool in this project; correctness is checked against the unoptimized compiled output and against hand-computed results in the tests.

## Testing

```bash
python -m unittest discover -s tests -v
```

(`python -m pytest tests` also works if pytest is installed.) 89 tests, no internet needed.

| Module | Tests | Covers |
|--------|------:|--------|
| `test_lexer.py` | 10 | tokens, comments, invalid characters, malformed numbers |
| `test_parser.py` | 16 | declarations, precedence, `sum`, syntax errors |
| `test_semantic.py` | 14 | undeclared names, rank/shape/index/bounds errors |
| `test_codegen.py` | 9 | generated code structure and parentheses |
| `test_optimizer.py` | 25 | each pass applied and refused correctly, results unchanged |
| `test_integration.py` | 15 | full pipeline on all examples and CLI-level behavior |

## Limitations and future work
- Ranks 1-3 only; no broadcasting; no division, unary minus or exponentiation
- Each tensor is assigned once; no in-place updates; no nested sums
- Index expressions are plain variables (no `i+1`, no constant indices)
- Constant folding does not reassociate (`A*2*3` is not folded)
- Fusion needs identical iteration spaces and no reduction loops
- Interchange and tiling use a conservative uniform-access rule, not a full dependence analysis
- Generated code uses Python lists, so optimizations do not guarantee speed-ups
- The executor restricts builtins but is not a security sandbox
- One statement per line; no line continuation

Future work: a C or NumPy back end where tiling and interchange can show real speed-ups, general dependence analysis, loop unrolling, nested sums, and broadcasting.

## Credits and references
- Aho, Lam, Sethi, Ullman, *Compilers: Principles, Techniques, and Tools* (2nd ed.): lexical analysis, syntax analysis, intermediate code, machine-independent optimization, and loop transformations for locality (tiling, interchange)
- Python standard library only (`unittest`, `argparse`, `json`)
- AI assistance: the project code, tests, benchmark and documentation were developed with help from Claude (Anthropic); all code was run and tested before submission
