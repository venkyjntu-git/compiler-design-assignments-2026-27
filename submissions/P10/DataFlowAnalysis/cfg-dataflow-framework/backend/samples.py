from typing import List
from models import SampleProgram

SAMPLE_PROGRAMS: List[SampleProgram] = [
    SampleProgram(
        id="while_loop",
        title="While Loop (Sum 1 to 10)",
        description="A standard while loop accumulating sum from 1 to 10. Demonstrates natural loops, back edges, and loop-carried reaching definitions.",
        code="""# Initialize variables
i = 1
sum = 0
L_LOOP:
if i > 10 goto L_END
sum = sum + i
i = i + 1
goto L_LOOP
L_END:
return sum"""
    ),
    SampleProgram(
        id="if_else_diamond",
        title="If-Else Diamond Branching",
        description="Classic control-flow split and reconvergence. Demonstrates merge points, union/intersection dataflow confluence.",
        code="""# Diamond control flow
x = a + b
y = 10
if x > 0 goto L_THEN
y = y + 1
z = a + b
goto L_JOIN
L_THEN:
y = y - 1
z = 20
L_JOIN:
res = y + z
return res"""
    ),
    SampleProgram(
        id="euclid_gcd",
        title="Euclidean GCD Algorithm (TAC)",
        description="Calculates greatest common divisor using modulo and while loop with conditional testing.",
        code="""a = 48
b = 18
L_WHILE:
if b == 0 goto L_DONE
t = b
b = a % b
a = t
goto L_WHILE
L_DONE:
return a"""
    ),
    SampleProgram(
        id="optimizations_demo",
        title="CSE & Dead Code Optimization Demo",
        description="Contains identical subexpressions (a * b) and dead assignments (unused variables) to test compiler diagnostics.",
        code="""# Demonstrates Common Subexpression Elimination and Dead Assignment
a = 5
b = 10
dead1 = 999
t1 = a * b
x = t1 + 4
dead2 = a + b
t2 = a * b
y = t2 - 2
ans = x + y
return ans"""
    ),
    SampleProgram(
        id="nested_loops",
        title="Nested Loops with Break",
        description="Two levels of loops with conditional early break. Demonstrates multi-level CFG topology and complex reaching defs.",
        code="""i = 0
count = 0
L_OUTER:
if i >= 5 goto L_EXIT
j = 0
L_INNER:
if j >= 3 goto L_NEXT_OUTER
count = count + 1
if count == 7 goto L_EXIT
j = j + 1
goto L_INNER
L_NEXT_OUTER:
i = i + 1
goto L_OUTER
L_EXIT:
return count"""
    )
]
