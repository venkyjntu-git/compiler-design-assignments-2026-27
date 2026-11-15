# Architecture

```
DSL text -> Lexer -> Parser -> AST -> Semantic analysis -> IR -> Optimization -> Code generation -> Runtime
```

| Stage | File | Output |
|-------|------|--------|
| Lexer | `compiler/lexer.py` | list of `Token` (kind, text, line, col, value) |
| Parser | `compiler/parser.py` | `Program` AST (`compiler/ast_nodes.py`) |
| Semantic analysis | `compiler/semantic.py`, `compiler/symbol_table.py` | validated program + `SymbolTable` |
| IR lowering | `compiler/ir.py` | `IRProgram` of `LoopNest`s |
| Optimization | `compiler/optimizer.py` + `optimizations/` | optimized copy of the IR |
| Code generation | `compiler/codegen.py` | Python source text, saved in `generated/` |
| Runtime | `runtime/executor.py` | output tensors |

`main.py` wires the stages together (`compile_program`, `run_compiled`).
All errors derive from `DSLCompileError` (defined in `compiler/__init__.py`
so no module imports another just to reach an exception class).

## AST

`Program(statements)`, `TensorDeclaration(name, shape)`,
`Assignment(target, value)`, `BinaryOperation(op, left, right)`,
`Number(value)`, `TensorAccess(name, indices)`,
`SumExpression(body, var, lower, upper)`. Line/column are stored on nodes for
error messages but ignored by `==`.

## Semantic analysis

Walks statements in order, filling the symbol table (name, shape, rank,
declaration line, assigned or not) and checking the rules in `docs/grammar.md`.
Messages include line/column and the offending expression.

## Intermediate representation

* `Loop(var, lower, upper, step, kind)` - `kind` is `parallel` or `reduce`.
* `Stmt(target, indices, expr, accumulate)` - `=` or `+=`.
* `LoopNest(loops, body, tile_size)` - perfectly nested loops around one or
  more statements.
* `IRProgram(tensors, nests, applied, not_applied)`.

Lowering rules: an assignment becomes a nest over the target's indices. A
top-level `sum(...)` adds a reduction loop and uses `+=` (outputs start at 0).
A sum inside a bigger expression is first computed into a compiler temporary
`_tmpN` (its own nest) and then read element-wise. `python main.py FILE
--show-ir` prints the IR.

## Optimization controller

`optimize(ir, OptimizerConfig)` deep-copies the IR and runs, in order:
constant folding, loop fusion, loop interchange, loop tiling. Each pass records
what it did in `applied` and why it did nothing in `not_applied`; the
generated file header and the CLI report exactly these lists. With
`enabled=False` nothing runs.

## Code generation

Each nest becomes nested `for` loops over `range(...)`. Outputs and temporaries
are allocated as zero-filled nested lists, inputs are read from the `inputs`
dict, and `run(inputs)` returns a dict of output tensors. The header comment
names the source DSL file and the applied optimizations. Expressions are
printed with the minimal parentheses that preserve the original evaluation
tree (e.g. `A - (B - D)` keeps its parentheses). Every generated file also
runs standalone (`python generated/addition.py`) using the default sample
inputs.

## Runtime

`runtime/executor.py` validates the input names, shapes and values (finite
numbers, no booleans), runs the generated code with a minimal `__builtins__`
(`range`, `min`, `len`) on a deep copy of the inputs, and checks the output
shapes. This gives predictable execution of compiler-produced code; it is not
a security sandbox.

## Default inputs

Input tensors in declaration order are filled row-major with 1, 2, 3, ...
(so `A=[[1,2],[3,4]]`, `B=[[5,6],[7,8]]` for the addition example). Override
with `--input NAME=JSON` or `--inputs-file`.
