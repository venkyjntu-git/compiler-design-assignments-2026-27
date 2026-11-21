/**
 * Code Optimizer for CompilerVerse
 * Performs local basic-block level and loop-safe optimizations:
 * - Constant Folding
 * - Constant Propagation
 * - Algebraic Simplification
 * - Common Subexpression Elimination (CSE)
 * - Copy Propagation
 * - Dead Code Elimination (DCE)
 *
 * Respects control flow and logs only genuine transformations.
 */

import { TACInstruction, BasicBlock, TACOp, TACGenerator } from './tac';

export interface OptimizationLogEntry {
  pass: string;
  instructionId: string;
  before: string;
  after: string;
  explanation: string;
}

export interface OptimizerResult {
  originalInstructions: TACInstruction[];
  optimizedInstructions: TACInstruction[];
  transformations: OptimizationLogEntry[];
  countBefore: number;
  countAfter: number;
  reductionPercentage: number;
  optimizedBasicBlocks: BasicBlock[];
}

export class CodeOptimizer {
  private transformations: OptimizationLogEntry[] = [];
  private tacGen = new TACGenerator();

  public optimize(instructions: TACInstruction[]): OptimizerResult {
    this.transformations = [];
    const countBefore = instructions.length;

    // Deep copy original instructions to avoid mutating input
    let current = instructions.map((i) => ({ ...i }));

    // Run iterative optimization passes until fixed point or max 5 passes
    let passCount = 0;
    let modified = true;

    while (modified && passCount < 5) {
      passCount++;
      const prevLength = current.length;
      const prevText = current.map((i) => i.text).join(';');

      // Pass 1: Algebraic Simplification
      current = this.algebraicSimplification(current);

      // Pass 2: Constant Folding
      current = this.constantFolding(current);

      // Pass 3: Constant and Copy Propagation (within safe basic blocks)
      current = this.constantAndCopyPropagation(current);

      // Pass 4: Common Subexpression Elimination (within basic blocks)
      current = this.commonSubexpressionElimination(current);

      // Pass 5: Dead Code Elimination
      current = this.deadCodeElimination(current);

      const newText = current.map((i) => i.text).join(';');
      modified = prevText !== newText || prevLength !== current.length;
    }

    const countAfter = current.length;
    const reductionPercentage =
      countBefore > 0
        ? Math.round(((countBefore - countAfter) / countBefore) * 100)
        : 0;

    const optimizedBasicBlocks = this.tacGen.partitionBasicBlocks(current);

    return {
      originalInstructions: instructions,
      optimizedInstructions: current,
      transformations: this.transformations,
      countBefore,
      countAfter,
      reductionPercentage,
      optimizedBasicBlocks,
    };
  }

  /**
   * Algebraic Simplification:
   * x * 1 -> x, 1 * x -> x
   * x * 0 -> 0, 0 * x -> 0
   * x + 0 -> x, 0 + x -> x
   * x - 0 -> x
   * x / 1 -> x
   */
  private algebraicSimplification(instructions: TACInstruction[]): TACInstruction[] {
    const result: TACInstruction[] = [];

    for (const instr of instructions) {
      const { op, arg1, arg2, result: dest } = instr;

      if (!dest || !arg1 || !arg2) {
        result.push(instr);
        continue;
      }

      const isArg1Num = this.isNumber(arg1);
      const isArg2Num = this.isNumber(arg2);
      const num1 = isArg1Num ? parseInt(arg1, 10) : null;
      const num2 = isArg2Num ? parseInt(arg2, 10) : null;

      let simplified: { op: TACOp; arg1: string; arg2?: string; explanation: string } | null = null;

      // Addition with 0
      if (op === '+') {
        if (num1 === 0 && !isArg2Num) {
          simplified = { op: '=', arg1: arg2, explanation: `Identity property of addition: 0 + ${arg2} = ${arg2}` };
        } else if (num2 === 0 && !isArg1Num) {
          simplified = { op: '=', arg1, explanation: `Identity property of addition: ${arg1} + 0 = ${arg1}` };
        }
      }

      // Subtraction with 0
      if (op === '-') {
        if (num2 === 0 && !isArg1Num) {
          simplified = { op: '=', arg1, explanation: `Identity property of subtraction: ${arg1} - 0 = ${arg1}` };
        }
      }

      // Multiplication by 0 or 1
      if (op === '*') {
        if (num1 === 0 || num2 === 0) {
          simplified = { op: '=', arg1: '0', explanation: `Zero product property: operand * 0 = 0` };
        } else if (num1 === 1 && !isArg2Num) {
          simplified = { op: '=', arg1: arg2, explanation: `Multiplicative identity: 1 * ${arg2} = ${arg2}` };
        } else if (num2 === 1 && !isArg1Num) {
          simplified = { op: '=', arg1, explanation: `Multiplicative identity: ${arg1} * 1 = ${arg1}` };
        }
      }

      // Division by 1
      if (op === '/' && num2 === 1 && !isArg1Num) {
        simplified = { op: '=', arg1, explanation: `Division identity: ${arg1} / 1 = ${arg1}` };
      }

      if (simplified) {
        const oldText = instr.text;
        const newInstr: TACInstruction = {
          ...instr,
          op: simplified.op,
          arg1: simplified.arg1,
          arg2: undefined,
          text: `${dest} = ${simplified.arg1}`,
        };
        this.transformations.push({
          pass: 'Algebraic Simplification',
          instructionId: instr.id,
          before: oldText,
          after: newInstr.text,
          explanation: simplified.explanation,
        });
        result.push(newInstr);
      } else {
        result.push(instr);
      }
    }

    return result;
  }

  /**
   * Constant Folding:
   * Evaluate arithmetic when both operands are constants at compile time.
   */
  private constantFolding(instructions: TACInstruction[]): TACInstruction[] {
    const result: TACInstruction[] = [];

    for (const instr of instructions) {
      const { op, arg1, arg2, result: dest } = instr;

      if (!dest || !arg1) {
        result.push(instr);
        continue;
      }

      // Unary negation of number
      if (op === 'neg' && this.isNumber(arg1)) {
        const val = -parseInt(arg1, 10);
        const oldText = instr.text;
        const newInstr: TACInstruction = {
          ...instr,
          op: '=',
          arg1: val.toString(),
          arg2: undefined,
          text: `${dest} = ${val}`,
        };
        this.transformations.push({
          pass: 'Constant Folding',
          instructionId: instr.id,
          before: oldText,
          after: newInstr.text,
          explanation: `Computed compile-time constant: -(${arg1}) = ${val}`,
        });
        result.push(newInstr);
        continue;
      }

      // Binary operations with two numeric constants
      if (arg2 && this.isNumber(arg1) && this.isNumber(arg2)) {
        const v1 = parseInt(arg1, 10);
        const v2 = parseInt(arg2, 10);
        let val: number | null = null;

        switch (op) {
          case '+': val = v1 + v2; break;
          case '-': val = v1 - v2; break;
          case '*': val = v1 * v2; break;
          case '/': val = v2 !== 0 ? Math.floor(v1 / v2) : null; break;
          case '%': val = v2 !== 0 ? v1 % v2 : null; break;
          case '==': val = v1 === v2 ? 1 : 0; break;
          case '!=': val = v1 !== v2 ? 1 : 0; break;
          case '<': val = v1 < v2 ? 1 : 0; break;
          case '<=': val = v1 <= v2 ? 1 : 0; break;
          case '>': val = v1 > v2 ? 1 : 0; break;
          case '>=': val = v1 >= v2 ? 1 : 0; break;
        }

        if (val !== null) {
          const oldText = instr.text;
          const newInstr: TACInstruction = {
            ...instr,
            op: '=',
            arg1: val.toString(),
            arg2: undefined,
            text: `${dest} = ${val}`,
          };
          this.transformations.push({
            pass: 'Constant Folding',
            instructionId: instr.id,
            before: oldText,
            after: newInstr.text,
            explanation: `Computed constant expression: ${v1} ${op} ${v2} = ${val}`,
          });
          result.push(newInstr);
          continue;
        }
      }

      result.push(instr);
    }

    return result;
  }

  /**
   * Constant and Copy Propagation:
   * Propagates constant literals and direct variable copies within basic blocks.
   * Resets at labels or branch boundaries to ensure safety across loops/joins.
   */
  private constantAndCopyPropagation(instructions: TACInstruction[]): TACInstruction[] {
    const result: TACInstruction[] = [];
    let constMap = new Map<string, string>(); // var -> constant value or copy var

    for (const instr of instructions) {
      // Basic block boundary check: flush propagation map at labels or jumps
      if (instr.op === 'label' || instr.op === 'goto' || instr.op === 'if_false' || instr.op === 'if_true') {
        constMap.clear();
        result.push(instr);
        continue;
      }

      let updatedArg1 = instr.arg1;
      let updatedArg2 = instr.arg2;
      let changed = false;

      // Propagate into arg1
      if (updatedArg1 && constMap.has(updatedArg1)) {
        const replacement = constMap.get(updatedArg1)!;
        this.transformations.push({
          pass: this.isNumber(replacement) ? 'Constant Propagation' : 'Copy Propagation',
          instructionId: instr.id,
          before: instr.text,
          after: instr.text.replace(updatedArg1, replacement),
          explanation: `Replaced variable '${updatedArg1}' with its known value '${replacement}'`,
        });
        updatedArg1 = replacement;
        changed = true;
      }

      // Propagate into arg2
      if (updatedArg2 && constMap.has(updatedArg2)) {
        const replacement = constMap.get(updatedArg2)!;
        this.transformations.push({
          pass: this.isNumber(replacement) ? 'Constant Propagation' : 'Copy Propagation',
          instructionId: instr.id,
          before: instr.text,
          after: instr.text.replace(updatedArg2, replacement),
          explanation: `Replaced variable '${updatedArg2}' with its known value '${replacement}'`,
        });
        updatedArg2 = replacement;
        changed = true;
      }

      let currentInstr = instr;
      if (changed) {
        let newText = '';
        if (instr.op === '=') {
          newText = `${instr.result} = ${updatedArg1}`;
        } else if (instr.op === 'print') {
          newText = `print ${updatedArg1}`;
        } else if (instr.op === 'neg') {
          newText = `${instr.result} = - ${updatedArg1}`;
        } else if (instr.arg2) {
          newText = `${instr.result} = ${updatedArg1} ${instr.op} ${updatedArg2}`;
        } else {
          newText = `${instr.result || ''} = ${updatedArg1 || ''}`;
        }

        currentInstr = {
          ...instr,
          arg1: updatedArg1,
          arg2: updatedArg2,
          text: newText,
        };
      }

      // Update definition in constMap
      if (currentInstr.result) {
        const dest = currentInstr.result;

        // If dest was previously mapped to something or used as a value, invalidate it
        for (const [k, v] of Array.from(constMap.entries())) {
          if (v === dest) {
            constMap.delete(k);
          }
        }

        if (currentInstr.op === '=' && currentInstr.arg1 && !currentInstr.arg2) {
          // Direct copy or constant assignment (e.g. t1 = 5 or t2 = t1)
          constMap.set(dest, currentInstr.arg1);
        } else {
          constMap.delete(dest);
        }
      }

      result.push(currentInstr);
    }

    return result;
  }

  /**
   * Common Subexpression Elimination (CSE):
   * Within each basic block, if an expression (arg1 op arg2) was previously computed
   * and neither operand has changed, reuse the earlier temporary.
   */
  private commonSubexpressionElimination(instructions: TACInstruction[]): TACInstruction[] {
    const result: TACInstruction[] = [];
    const exprMap = new Map<string, string>(); // "arg1 op arg2" -> temp

    for (const instr of instructions) {
      if (instr.op === 'label' || instr.op === 'goto' || instr.op === 'if_false' || instr.op === 'if_true') {
        exprMap.clear();
        result.push(instr);
        continue;
      }

      const { op, arg1, arg2, result: dest } = instr;

      if (dest && arg1 && arg2 && (op === '+' || op === '-' || op === '*' || op === '/' || op === '%')) {
        const key = `${arg1} ${op} ${arg2}`;
        if (exprMap.has(key)) {
          const existingTemp = exprMap.get(key)!;
          const oldText = instr.text;
          const newInstr: TACInstruction = {
            ...instr,
            op: '=',
            arg1: existingTemp,
            arg2: undefined,
            text: `${dest} = ${existingTemp}`,
          };
          this.transformations.push({
            pass: 'Common Subexpression Elimination',
            instructionId: instr.id,
            before: oldText,
            after: newInstr.text,
            explanation: `Reused previously evaluated subexpression '${key}' stored in '${existingTemp}'`,
          });
          result.push(newInstr);
          continue;
        } else {
          exprMap.set(key, dest);
        }
      }

      // If dest is modified, remove any cached expressions involving dest
      if (dest) {
        for (const [key] of Array.from(exprMap.entries())) {
          if (key.startsWith(`${dest} `) || key.endsWith(` ${dest}`)) {
            exprMap.delete(key);
          }
        }
      }

      result.push(instr);
    }

    return result;
  }

  /**
   * Dead Code Elimination (DCE):
   * Removes temporary variable assignments whose results are never read.
   * Never removes print statements, branch instructions, or labels.
   */
  private deadCodeElimination(instructions: TACInstruction[]): TACInstruction[] {
    // Count uses of each temporary variable
    const useCounts = new Map<string, number>();

    for (const instr of instructions) {
      if (instr.arg1 && !this.isNumber(instr.arg1)) {
        useCounts.set(instr.arg1, (useCounts.get(instr.arg1) || 0) + 1);
      }
      if (instr.arg2 && !this.isNumber(instr.arg2)) {
        useCounts.set(instr.arg2, (useCounts.get(instr.arg2) || 0) + 1);
      }
    }

    const result: TACInstruction[] = [];

    for (const instr of instructions) {
      // Only eliminate temporaries (t1, t2...) whose use count is 0
      // Never eliminate user program variables, prints, labels, or jumps
      if (
        instr.result &&
        instr.result.startsWith('t') &&
        instr.op !== 'print' &&
        instr.op !== 'label' &&
        instr.op !== 'goto' &&
        instr.op !== 'if_false' &&
        instr.op !== 'if_true'
      ) {
        const uses = useCounts.get(instr.result) || 0;
        if (uses === 0) {
          this.transformations.push({
            pass: 'Dead Code Elimination',
            instructionId: instr.id,
            before: instr.text,
            after: '(removed)',
            explanation: `Eliminated unused temporary '${instr.result}' having zero references`,
          });
          continue; // Skip appending to result
        }
      }

      result.push(instr);
    }

    return result;
  }

  private isNumber(val: string): boolean {
    return /^-?\d+$/.test(val.trim());
  }
}

export function optimizeTAC(instructions: TACInstruction[]): OptimizerResult {
  const optimizer = new CodeOptimizer();
  return optimizer.optimize(instructions);
}
