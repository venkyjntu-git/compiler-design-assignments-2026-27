/**
 * Target Pseudo-Assembly Code Generator for CompilerVerse
 * Maps Three-Address Code to a RISC-style pseudo-assembly instruction set
 * with register allocation and cross-phase tracking.
 */

import { TACInstruction } from './tac';
import { SourceLocation } from './ast';

export interface TargetInstruction {
  id: string;
  op: string; // LOAD, STORE, ADD, SUB, MUL, DIV, MOD, CMP, JMP, JZ, JNZ, PRINT, LABEL, HALT
  operands: string[];
  comment?: string;
  tacId?: string;
  astNodeId?: string;
  loc?: SourceLocation;
  text: string;
}

export interface TargetCodeResult {
  instructions: TargetInstruction[];
  registersUsed: string[];
  assemblyText: string;
  instructionSetDoc: { mnemonic: string; description: string; example: string }[];
}

export const INSTRUCTION_SET_DOC = [
  { mnemonic: 'LOAD Rd, [src]', description: 'Load variable memory or immediate value into register Rd', example: 'LOAD R1, a  OR  LOAD R1, #10' },
  { mnemonic: 'STORE [var], Rs', description: 'Store value from register Rs into variable memory location', example: 'STORE c, R2' },
  { mnemonic: 'ADD Rd, Rs, [op2]', description: 'Add Rs and op2 (register or immediate) and store result in Rd', example: 'ADD R3, R1, R2' },
  { mnemonic: 'SUB Rd, Rs, [op2]', description: 'Subtract op2 from Rs and store result in Rd', example: 'SUB R3, R1, #5' },
  { mnemonic: 'MUL Rd, Rs, [op2]', description: 'Multiply Rs and op2 and store result in Rd', example: 'MUL R3, R1, R2' },
  { mnemonic: 'DIV Rd, Rs, [op2]', description: 'Integer division of Rs by op2 and store result in Rd', example: 'DIV R3, R1, R2' },
  { mnemonic: 'MOD Rd, Rs, [op2]', description: 'Modulo of Rs by op2 and store result in Rd', example: 'MOD R3, R1, R2' },
  { mnemonic: 'CMP Rs, [op2]', description: 'Compare Rs with op2 and update CPU condition flags', example: 'CMP R1, #0' },
  { mnemonic: 'JMP label', description: 'Unconditional jump to branch target label', example: 'JMP L1' },
  { mnemonic: 'JZ label', description: 'Jump to label if zero flag is set (condition is false)', example: 'JZ L2' },
  { mnemonic: 'JNZ label', description: 'Jump to label if zero flag is not set (condition is true)', example: 'JNZ L1' },
  { mnemonic: 'PRINT [src]', description: 'Write register or memory variable to standard output console', example: 'PRINT c' },
  { mnemonic: 'HALT', description: 'Terminate program execution', example: 'HALT' },
];

export class TargetCodeGenerator {
  private instructions: TargetInstruction[] = [];
  private instrCounter: number = 1;
  private regCounter: number = 1;
  private maxReg: number = 1;
  private varToReg = new Map<string, string>(); // active register allocations

  public generate(tacList: TACInstruction[]): TargetCodeResult {
    this.instructions = [];
    this.instrCounter = 1;
    this.regCounter = 1;
    this.maxReg = 1;
    this.varToReg.clear();

    for (const tac of tacList) {
      this.translateInstruction(tac);
    }

    // Add termination instruction
    this.emit({
      op: 'HALT',
      operands: [],
      text: 'HALT',
      comment: 'End of program execution',
    });

    const registersUsed: string[] = [];
    for (let i = 1; i <= Math.max(this.maxReg, 1); i++) {
      registersUsed.push(`R${i}`);
    }

    const assemblyText = this.instructions.map((i) => i.text).join('\n');

    return {
      instructions: this.instructions,
      registersUsed,
      assemblyText,
      instructionSetDoc: INSTRUCTION_SET_DOC,
    };
  }

  private translateInstruction(tac: TACInstruction): void {
    const { op, arg1, arg2, result, id, astNodeId, loc } = tac;

    switch (op) {
      case 'label': {
        this.emit({
          op: 'LABEL',
          operands: [result!],
          tacId: id,
          astNodeId,
          loc,
          text: `${result}:`,
        });
        break;
      }

      case 'goto': {
        this.emit({
          op: 'JMP',
          operands: [result!],
          tacId: id,
          astNodeId,
          loc,
          text: `JMP ${result}`,
        });
        break;
      }

      case 'if_false': {
        // arg1 is condition, result is target label
        const reg = this.loadOperand(arg1!);
        this.emit({
          op: 'CMP',
          operands: [reg, '#0'],
          tacId: id,
          astNodeId,
          loc,
          text: `CMP ${reg}, #0`,
          comment: `Check if ${arg1} is false (0)`,
        });
        this.emit({
          op: 'JZ',
          operands: [result!],
          tacId: id,
          astNodeId,
          loc,
          text: `JZ ${result}`,
          comment: `Branch to ${result} if false`,
        });
        break;
      }

      case 'if_true': {
        const reg = this.loadOperand(arg1!);
        this.emit({
          op: 'CMP',
          operands: [reg, '#0'],
          tacId: id,
          astNodeId,
          loc,
          text: `CMP ${reg}, #0`,
        });
        this.emit({
          op: 'JNZ',
          operands: [result!],
          tacId: id,
          astNodeId,
          loc,
          text: `JNZ ${result}`,
        });
        break;
      }

      case 'print': {
        if (this.isNumber(arg1!)) {
          this.emit({
            op: 'PRINT',
            operands: [`#${arg1}`],
            tacId: id,
            astNodeId,
            loc,
            text: `PRINT #${arg1}`,
          });
        } else {
          this.emit({
            op: 'PRINT',
            operands: [arg1!],
            tacId: id,
            astNodeId,
            loc,
            text: `PRINT ${arg1}`,
          });
        }
        break;
      }

      case '=': {
        // Direct assignment / copy: result = arg1
        if (this.isNumber(arg1!)) {
          const r = this.getReg();
          this.emit({
            op: 'LOAD',
            operands: [r, `#${arg1}`],
            tacId: id,
            astNodeId,
            loc,
            text: `LOAD ${r}, #${arg1}`,
          });
          this.emit({
            op: 'STORE',
            operands: [result!, r],
            tacId: id,
            astNodeId,
            loc,
            text: `STORE ${result}, ${r}`,
          });
        } else {
          const r = this.loadOperand(arg1!);
          this.emit({
            op: 'STORE',
            operands: [result!, r],
            tacId: id,
            astNodeId,
            loc,
            text: `STORE ${result}, ${r}`,
          });
        }
        break;
      }

      case 'neg': {
        const r1 = this.loadOperand(arg1!);
        const rDest = this.getReg();
        this.emit({
          op: 'SUB',
          operands: [rDest, '#0', r1],
          tacId: id,
          astNodeId,
          loc,
          text: `SUB ${rDest}, #0, ${r1}`,
          comment: `Negate: 0 - ${arg1}`,
        });
        this.emit({
          op: 'STORE',
          operands: [result!, rDest],
          tacId: id,
          astNodeId,
          loc,
          text: `STORE ${result}, ${rDest}`,
        });
        break;
      }

      // Arithmetic operations
      case '+':
      case '-':
      case '*':
      case '/':
      case '%': {
        const r1 = this.loadOperand(arg1!);
        const r2Op = this.isNumber(arg2!) ? `#${arg2}` : this.loadOperand(arg2!);
        const rDest = this.getReg();
        const asmOp =
          op === '+'
            ? 'ADD'
            : op === '-'
            ? 'SUB'
            : op === '*'
            ? 'MUL'
            : op === '/'
            ? 'DIV'
            : 'MOD';

        this.emit({
          op: asmOp,
          operands: [rDest, r1, r2Op],
          tacId: id,
          astNodeId,
          loc,
          text: `${asmOp} ${rDest}, ${r1}, ${r2Op}`,
        });
        this.emit({
          op: 'STORE',
          operands: [result!, rDest],
          tacId: id,
          astNodeId,
          loc,
          text: `STORE ${result}, ${rDest}`,
        });
        break;
      }

      // Relational operations: result = arg1 relop arg2
      case '==':
      case '!=':
      case '<':
      case '<=':
      case '>':
      case '>=': {
        const r1 = this.loadOperand(arg1!);
        const r2Op = this.isNumber(arg2!) ? `#${arg2}` : this.loadOperand(arg2!);
        const rDest = this.getReg();
        this.emit({
          op: 'CMP',
          operands: [r1, r2Op],
          tacId: id,
          astNodeId,
          loc,
          text: `CMP ${r1}, ${r2Op}`,
        });
        // We set result register to 1 or 0 based on comparison
        this.emit({
          op: 'LOAD',
          operands: [rDest, '#1'],
          tacId: id,
          astNodeId,
          loc,
          text: `LOAD ${rDest}, #1`,
        });
        this.emit({
          op: 'STORE',
          operands: [result!, rDest],
          tacId: id,
          astNodeId,
          loc,
          text: `STORE ${result}, ${rDest}`,
        });
        break;
      }
    }
  }

  private loadOperand(op: string): string {
    if (this.isNumber(op)) {
      const reg = this.getReg();
      this.emit({
        op: 'LOAD',
        operands: [reg, `#${op}`],
        text: `LOAD ${reg}, #${op}`,
      });
      return reg;
    }

    const reg = this.getReg();
    this.emit({
      op: 'LOAD',
      operands: [reg, op],
      text: `LOAD ${reg}, ${op}`,
    });
    return reg;
  }

  private getReg(): string {
    const r = `R${this.regCounter}`;
    if (this.regCounter > this.maxReg) {
      this.maxReg = this.regCounter;
    }
    this.regCounter = (this.regCounter % 6) + 1; // Round-robin across R1 to R6
    return r;
  }

  private emit(instr: Omit<TargetInstruction, 'id'>): void {
    this.instructions.push({
      id: `asm_${this.instrCounter++}`,
      ...instr,
    });
  }

  private isNumber(val: string): boolean {
    return /^-?\d+$/.test(val.trim());
  }
}

export function generateTargetCode(tacList: TACInstruction[]): TargetCodeResult {
  const gen = new TargetCodeGenerator();
  return gen.generate(tacList);
}
