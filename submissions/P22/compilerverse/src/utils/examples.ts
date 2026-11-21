/**
 * Curated Example Programs for CompilerVerse
 * Each program is validated against our mini-language grammar.
 */

export interface ExampleProgram {
  id: string;
  title: string;
  description: string;
  code: string;
  expectedBehavior: string;
}

export const EXAMPLE_PROGRAMS: ExampleProgram[] = [
  {
    id: 'example-a',
    title: 'Example A: Arithmetic & Precedence',
    description: 'Basic variable declarations with multiplication taking precedence over addition.',
    code: `int a = 10;
int b = 20;
int c = a + b * 2;
print(c);`,
    expectedBehavior: 'Computes b * 2 = 40, then a + 40 = 50, stores in c, and prints 50.',
  },
  {
    id: 'example-b',
    title: 'Example B: Nested Expressions & Reassignment',
    description: 'Multiple expressions showing intermediate variable propagation.',
    code: `int x = 10 + 20 * 2;
int y = x + 5;
print(y);`,
    expectedBehavior: 'Computes x = 50, then y = 55, and prints 55. Optimizer folds 10 + 40.',
  },
  {
    id: 'example-c',
    title: 'Example C: While Loop Accumulation',
    description: 'Iterative control-flow with loop condition and counter update.',
    code: `int i = 0;
int sum = 0;

while (i < 5) {
    sum = sum + i;
    i = i + 1;
}

print(sum);`,
    expectedBehavior: 'Partitions code into multiple basic blocks and loops to compute 0+1+2+3+4 = 10.',
  },
  {
    id: 'example-d',
    title: 'Example D: Conditional If Statement',
    description: 'Relational comparison (>) with conditional branch and basic block jump.',
    code: `int age = 20;
if (age > 18) {
    print(age);
}`,
    expectedBehavior: 'Evaluates age > 18. Since true, executes the print block.',
  },
  {
    id: 'example-e',
    title: 'Example E: Optimization Showcase',
    description: 'Specially crafted to demonstrate Constant Folding, Algebraic Simplification (x * 1, x + 0), and Copy Propagation.',
    code: `int p = 5 + 15;
int q = p * 1;
int r = q + 0;
int dead = 999;
print(r);`,
    expectedBehavior: 'Folds 5+15=20, simplifies p*1 to p, q+0 to q, eliminates unused variable dead.',
  },
  {
    id: 'example-f',
    title: 'Example F: Semantic Error Demo',
    description: 'Demonstrates compiler diagnostics when duplicate declaration and undeclared variables occur.',
    code: `int a = 10;
int a = 20;
int z = undeclaredVar + 5;
print(z);`,
    expectedBehavior: 'Compiler halts at Semantic Analysis phase reporting duplicate declaration and undeclared identifier.',
  },
];
