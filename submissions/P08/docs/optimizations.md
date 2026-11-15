# Optimizations

Passes run in this order: constant folding, loop fusion, loop interchange,
loop tiling. A pass is reported as *applied* only if it changed the IR;
otherwise the reason appears under *not applied*. `--no-opt` disables all
passes; `--disable folding|fusion|interchange|tiling` disables one.

## Constant folding (`optimizations/constant_folding.py`)

Evaluates an operation whose two operands are both constants.

```
B[i] = 2 * 3 * A[i] + (5 - 3)      ->      B[i] = 6 * A[i] + 2
```

Limitations: no reassociation, so `A[i] * 2 * 3` (which is `(A[i]*2)*3`) is left
alone - reassociating could change floating-point rounding. Folds that would
produce an infinite value are skipped.

## Loop fusion (`optimizations/loop_fusion.py`)

```
for i, j: T[i][j] = A[i][j] + B[i][j]      for i, j:
for p, q: E[p][q] = T[p][q] * 2        ->      T[i][j] = A[i][j] + B[i][j]
                                               E[i][j] = T[i][j] * 2
```

Adjacent nests are fused only when all of these hold: no reduction loops,
constant bounds, same depth and identical iteration spaces (the second nest's
variables are renamed to the first's), and every conflicting access pair
(same tensor, at least one write) uses the identical subscript tuple. Then both
touch the same element only in the same iteration, where the first statement
still runs first - the original order. Not fused: transposed reads such as
`E[i,j] = T[j,i] + 1`, different shapes, reduction nests (a matrix product
followed by an element-wise step stays two nests).

## Loop interchange (`optimizations/loop_interchange.py`)

Heuristic for row-major Python lists: the loop variable that is the last
subscript of the most accesses becomes innermost (ties keep the original
order). Matrix multiplication `i, j, k` becomes `i, k, j` (inner loop walks
`B[k][j]` and `C[i][j]` contiguously). Element-wise nests are usually already
in order and are left unchanged.

Legality is checked first: constant bounds, one subscript tuple per written
tensor, and unchanged order of reduction loops - so each element is
accumulated in the same order and results are bit-identical.

## Loop tiling (`optimizations/loop_tiling.py`)

```
for v in range(lo, hi):                for _t_v in range(lo, hi, T):
    ...                          ->        for v in range(_t_v, min(_t_v + T, hi)):
                                               ...
```

Tile loops go outermost, point loops innermost. The `min(...)` handles a
final partial tile when `T` does not divide the extent (e.g. extent 7, T=3 ->
tiles of 3, 3, 1). Only loops with extent greater than `T` are tiled; a nest
where no loop is larger than `T` is left unchanged (the default `--tile 16`
therefore leaves all six small examples untiled; `--tile 2` tiles the `k`
loop of the 2x3 by 3x2 example, whose last tile has one iteration).
Requires constant bounds, uniform accesses and at most one reduction loop.

## Performance honesty

Python's interpreter dominates the cost of these loops, so interchange and
tiling frequently do **not** make the generated code faster, and can be slower
on small inputs - there is no cache benefit for Python lists at these sizes.
`benchmarks/benchmark.py` reports measured times and checks correctness first.
The optimizations are about correct loop-nest transformation, not guaranteed
speed-ups.
