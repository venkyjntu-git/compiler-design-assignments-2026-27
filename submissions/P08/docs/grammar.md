# DSL Grammar

This document describes the language exactly as implemented by
`compiler/lexer.py` and `compiler/parser.py`.

## Lexical rules

| Token | Pattern |
|-------|---------|
| `TENSOR`, `SUM` | keywords `tensor`, `sum` |
| `IDENT` | `[A-Za-z_][A-Za-z0-9_]*` (not a keyword) |
| `NUMBER` | `[0-9]+` (integer) or `[0-9]+.[0-9]+` / exponent forms such as `1e3` (float) |
| operators / punctuation | `+ - * = [ ] ( ) ,` |
| `NEWLINE` | end of a line - every statement is exactly one line |
| comments | `#` to the end of the line |
| whitespace | spaces, tabs (ignored) |

Lexical errors (with line and column): invalid characters, unsupported
operators (`/ % ^ & | < > ! ~ @`), malformed numbers (`3.`, `12abc`, `1.2.3`),
numbers that are too large. Numbers have no sign: write `0 - x` style
subtraction instead of `-x` (unary minus is a syntax error).

## Syntax (EBNF)

```
program     = { statement NEWLINE } ;
statement   = declaration | assignment ;
declaration = "tensor" IDENT "[" INT { "," INT } "]" ;
assignment  = access "=" expr ;
access      = IDENT "[" IDENT { "," IDENT } "]" ;
expr        = term { ( "+" | "-" ) term } ;          (* left associative *)
term        = factor { "*" factor } ;                (* left associative *)
factor      = NUMBER | access | sum | "(" expr ")" ;
sum         = "sum" "(" expr "," IDENT "," INT "," INT ")" ;
```

`INT` is a non-negative integer literal (tensor dimensions must be >= 1).

Precedence, highest first: parentheses, `*`, then `+` and `-`.
`A + 2 * B - D` parses as `(A + (2 * B)) - D`.

## Declarations

`tensor A[2, 3]` declares a tensor of rank 2 with shape 2x3. Ranks 1 to 3 are
supported. Tensors that are never assigned are **inputs**; assigned tensors
are **outputs**.

## Indexed assignments

`C[i, j] = expr` computes `C[i][j]` for every `i` in `[0, 2)` and `j` in
`[0, 2)` (the extents come from the declared shape of `C`). Index positions
must be variable names (no constants, no arithmetic on indices).

## Summation

`sum(body, k, lo, hi)` adds `body` for `k = lo, lo+1, ..., hi-1`
(upper bound exclusive). Matrix multiplication:

```
C[i, j] = sum(A[i, k] * B[k, j], k, 0, 3)
```

## Semantic rules

* Tensors are declared before use; names are unique; rank 1 to 3.
* Each tensor is assigned at most once, is never read before its assignment
  and never appears on both sides of its own assignment.
* The index count of every access equals the tensor's rank.
* Element-wise operands need identical extents in every indexed dimension
  (no broadcasting). Every index must be a target index or a summation
  variable.
* Summation variables are new names, appear in the body, have a non-empty
  range `[lo, hi)` with `hi` no larger than every dimension they index, and
  sums cannot be nested (a sum may appear anywhere else in an expression,
  e.g. `2 * sum(...) + D[i, j]`).
* Names starting with `_`, Python keywords and a few generated-code names
  (`min`, `range`, `len`, `run`, `inputs`, ...) are reserved.
* An index variable may not have the same name as a tensor.

## Not supported (rejected with an error)

Division, unary minus, exponentiation, scalar variables, constant indices,
index arithmetic, ranks above 3, broadcasting, in-place updates, nested sums,
reassigning a tensor.
