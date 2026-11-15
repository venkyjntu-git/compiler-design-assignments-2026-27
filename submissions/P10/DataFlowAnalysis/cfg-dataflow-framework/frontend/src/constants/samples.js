export const DEFAULT_SAMPLES = [
  {
    id: "simple_assignments",
    title: "1. Simple Assignments (Program A)",
    description: "Sequential assignments without branching. Tests linear basic block generation.",
    code: `a = 10;
b = 20;
c = a + b;
d = c * 2;`
  },
  {
    id: "if_else_statements",
    title: "2. If-Else Statements (Program B)",
    description: "Conditional split into two branches and reconvergence at a merge point.",
    code: `x = 10;

if (x > 5) {
    y = x + 1;
} else {
    y = x - 1;
}

z = y * 2;`
  },
  {
    id: "while_loop",
    title: "3. While Loop (Program C)",
    description: "Natural loop with condition, loop body, back-edge, and post-loop exit.",
    code: `i = 0;
sum = 0;

while (i < 5) {
    sum = sum + i;
    i = i + 1;
}

result = sum;`
  },
  {
    id: "nested_conditions",
    title: "4. Nested Conditions (Program D)",
    description: "Nested if-else statements testing multi-level branching and cascaded joins.",
    code: `x = 10;
y = 0;

if (x > 0) {
    if (x > 5) {
        y = x * 2;
    } else {
        y = x + 2;
    }
} else {
    y = 0;
}

result = y;`
  },
  {
    id: "repeated_variable_assignments",
    title: "5. Repeated Variable Assignments",
    description: "Variable defined multiple times, demonstrating KILL sets in Reaching Definitions.",
    code: `int x = 1;
int y = 2;
x = x + 10;

if (x > 5) {
    x = 20;
    y = x + 1;
} else {
    x = 30;
}

x = x + y;
return x;`
  },
  {
    id: "arithmetic_expressions",
    title: "6. Arithmetic Expressions & Parentheses",
    description: "Complex arithmetic subexpressions demonstrating Available Expressions.",
    code: `int a = 4;
int b = 7;
int x = (a + b) * 2;
int y = 0;

if (x > 20) {
    y = (a + b) * 2;
} else {
    y = a + b;
}

int z = (a + b) * 2;
return x + y + z;`
  },
  {
    id: "combined_branch_and_loop",
    title: "7. Combined Branches & Loop",
    description: "While loop containing conditional if-else logic inside the loop body.",
    code: `int i = 1;
int sum = 0;

while (i <= 6) {
    if (i % 2 == 0) {
        sum = sum + i;
    } else {
        sum = sum + 1;
    }
    i = i + 1;
}

return sum;`
  }
];
