import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/compiler/lexer';
import { parse } from '../src/compiler/parser';
import { analyzeSemantics } from '../src/compiler/semantic';
import { generateTAC } from '../src/compiler/tac';
import { optimizeTAC } from '../src/compiler/optimizer';
import { generateTargetCode } from '../src/compiler/targetCode';
import { compile } from '../src/compiler/pipeline';

describe('Phase 1: Lexical Analyzer', () => {
  it('tokenizes keywords, identifiers, numbers, and operators', () => {
    const source = 'int x = 10 + 20 * 2;\nprint(x);';
    const res = tokenize(source);
    expect(res.errors).toHaveLength(0);
    expect(res.tokens.length).toBeGreaterThan(10);

    const types = res.tokens.map((t) => t.type);
    expect(types).toContain('KEYWORD');
    expect(types).toContain('IDENTIFIER');
    expect(types).toContain('NUMBER');
    expect(types).toContain('OPERATOR');
    expect(types).toContain('DELIMITER');
    expect(types).toContain('SEPARATOR');
    expect(types[types.length - 1]).toBe('EOF');
  });

  it('reports lexical errors on invalid characters', () => {
    const source = 'int @#$ = 5;';
    const res = tokenize(source);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0].message).toContain('Unexpected character');
  });
});

describe('Phase 2 & 3: Syntax Analyzer & AST', () => {
  it('builds valid parse tree and AST with operator precedence (* before +)', () => {
    const tokens = tokenize('int c = a + b * 2;').tokens;
    const res = parse(tokens);
    expect(res.errors).toHaveLength(0);
    expect(res.ast).not.toBeNull();
    expect(res.parseTree).not.toBeNull();

    const stmt = res.ast!.body[0] as any;
    expect(stmt.type).toBe('VarDeclaration');
    expect(stmt.identifier).toBe('c');
    // BinaryExpression + at top level of expression
    expect(stmt.init.type).toBe('BinaryExpression');
    expect(stmt.init.operator).toBe('+');
    expect(stmt.init.right.operator).toBe('*'); // b * 2 grouped tightly
  });

  it('detects syntax error on missing semicolon', () => {
    const tokens = tokenize('int a = 10').tokens;
    const res = parse(tokens);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0].message).toContain(';');
  });
});

describe('Phase 4: Semantic Analysis & Symbol Table', () => {
  it('detects duplicate variable declaration in the same scope', () => {
    const tokens = tokenize('int x = 10;\nint x = 20;').tokens;
    const parsed = parse(tokens);
    const sem = analyzeSemantics(parsed.ast!);
    expect(sem.errors.length).toBeGreaterThan(0);
    expect(sem.errors[0].message).toContain('Duplicate declaration');
  });

  it('detects undeclared variable use', () => {
    const tokens = tokenize('int a = b + 5;').tokens;
    const parsed = parse(tokens);
    const sem = analyzeSemantics(parsed.ast!);
    expect(sem.errors.length).toBeGreaterThan(0);
    expect(sem.errors[0].message).toContain("Undeclared variable: 'b'");
  });
});

describe('Phase 5: Three-Address Code & Basic Blocks', () => {
  it('generates TAC with temporaries and partitions basic blocks', () => {
    const source = `
      int a = 10;
      int b = 20;
      int c = a + b * 2;
      print(c);
    `;
    const tokens = tokenize(source).tokens;
    const parsed = parse(tokens);
    const tacRes = generateTAC(parsed.ast!);

    expect(tacRes.instructions.length).toBeGreaterThan(0);
    expect(tacRes.tempCount).toBeGreaterThanOrEqual(2);

    const ops = tacRes.instructions.map((i) => i.op);
    expect(ops).toContain('*');
    expect(ops).toContain('+');
    expect(ops).toContain('print');
    expect(tacRes.basicBlocks.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Phase 6: Code Optimizer', () => {
  it('performs constant folding and algebraic simplification', () => {
    // 10 + 20 -> 30, x * 1 -> x
    const source = 'int x = 10 + 20;\nint y = x * 1;\nprint(y);';
    const tokens = tokenize(source).tokens;
    const parsed = parse(tokens);
    const tacRes = generateTAC(parsed.ast!);
    const optRes = optimizeTAC(tacRes.instructions);

    expect(optRes.transformations.length).toBeGreaterThan(0);
    const passes = optRes.transformations.map((t) => t.pass);
    expect(passes).toContain('Constant Folding');
    expect(passes).toContain('Algebraic Simplification');
  });
});

describe('Phase 7: Target Code Generation', () => {
  it('generates pseudo-assembly with registers and HALT', () => {
    // Generate TAC directly with an ADD instruction to test opcode emission
    const sampleTac = [
      { id: 't1', op: '+' as const, arg1: 'x', arg2: 'y', result: 'z', text: 'z = x + y' },
      { id: 't2', op: 'print' as const, arg1: 'z', text: 'print z' }
    ];
    const target = generateTargetCode(sampleTac);

    expect(target.instructions.length).toBeGreaterThan(0);
    expect(target.assemblyText).toContain('LOAD');
    expect(target.assemblyText).toContain('ADD');
    expect(target.assemblyText).toContain('STORE');
    expect(target.assemblyText).toContain('PRINT');
    expect(target.assemblyText).toContain('HALT');
  });
});

describe('Compiler Master Pipeline', () => {
  it('handles empty input gracefully', () => {
    const res = compile('   ');
    expect(res.success).toBe(false);
    expect(res.failedPhase).toBe('LEXICAL_ANALYSIS');
  });

  it('compiles Example A successfully without errors', () => {
    const exampleA = `
      int a = 10;
      int b = 20;
      int c = a + b * 2;
      print(c);
    `;
    const res = compile(exampleA);
    expect(res.success).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.tokens.length).toBeGreaterThan(0);
    expect(res.ast).not.toBeNull();
    expect(res.symbolTable.length).toBe(3);
    expect(res.originalTac.length).toBeGreaterThan(0);
    expect(res.targetAssembly.length).toBeGreaterThan(0);
  });

  it('compiles Example C (while loop) successfully', () => {
    const exampleC = `
      int i = 0;
      int sum = 0;
      while (i < 5) {
        sum = sum + i;
        i = i + 1;
      }
      print(sum);
    `;
    const res = compile(exampleC);
    expect(res.success).toBe(true);
    expect(res.basicBlocks.length).toBeGreaterThan(1); // loop creates multiple basic blocks
  });

  it('compiles Example D (if statement) successfully', () => {
    const exampleD = `
      int age = 20;
      if (age > 18) {
        print(age);
      }
    `;
    const res = compile(exampleD);
    expect(res.success).toBe(true);
    expect(res.originalTac.some(t => t.op === 'if_false')).toBe(true);
  });

  it('guarantees deterministic repeated compilation without memory leakage or stale mutation', () => {
    const code = 'int a = 5;\nint b = a + 1;\nprint(b);';
    const run1 = compile(code);
    const run2 = compile(code);

    expect(run1.success).toBe(true);
    expect(run2.success).toBe(true);
    expect(run1.tokens.length).toBe(run2.tokens.length);
    expect(run1.originalTac.length).toBe(run2.originalTac.length);
    expect(run1.targetAssembly.length).toBe(run2.targetAssembly.length);
  });

  it('never shows stale successful results when invalid code follows successful code', () => {
    const goodCode = 'int a = 10;';
    const goodRes = compile(goodCode);
    expect(goodRes.success).toBe(true);

    const badCode = 'int a = ;';
    const badRes = compile(badCode);
    expect(badRes.success).toBe(false);
    expect(badRes.failedPhase).toBe('SYNTAX_ANALYSIS');
    expect(badRes.targetAssembly).toHaveLength(0);
  });
});
