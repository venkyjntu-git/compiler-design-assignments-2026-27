/**
 * Three-Address Code (TAC) Generator and Basic Block Partitioner for CompilerVerse
 * Generates linear intermediate representations with mappings to AST nodes and source spans.
 * Partitions instructions into Basic Blocks using classical leader detection.
 */

import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  VarDeclarationNode,
  AssignmentStatementNode,
  PrintStatementNode,
  IfStatementNode,
  WhileStatementNode,
  BlockStatementNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  SourceLocation,
} from './ast';

export type TACOp =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | '='
  | 'neg'
  | 'print'
  | 'label'
  | 'if_false'
  | 'if_true'
  | 'goto';

export interface TACInstruction {
  id: string;
  op: TACOp;
  arg1?: string;
  arg2?: string;
  result?: string;
  astNodeId?: string;
  loc?: SourceLocation;
  text: string;
}

export interface BasicBlock {
  id: string;
  name: string;
  instructions: TACInstruction[];
  predecessors: string[];
  successors: string[];
  isEntry: boolean;
  isExit: boolean;
}

export interface TACResult {
  instructions: TACInstruction[];
  basicBlocks: BasicBlock[];
  tempCount: number;
  labelCount: number;
}

export class TACGenerator {
  private instructions: TACInstruction[] = [];
  private tempCounter: number = 1;
  private labelCounter: number = 1;
  private instrIdCounter: number = 1;

  public generate(program: ProgramNode): TACResult {
    this.instructions = [];
    this.tempCounter = 1;
    this.labelCounter = 1;
    this.instrIdCounter = 1;

    for (const stmt of program.body) {
      this.generateStatement(stmt);
    }

    const basicBlocks = this.partitionBasicBlocks(this.instructions);

    return {
      instructions: this.instructions,
      basicBlocks,
      tempCount: this.tempCounter - 1,
      labelCount: this.labelCounter - 1,
    };
  }

  private generateStatement(stmt: StatementNode): void {
    switch (stmt.type) {
      case 'VarDeclaration': {
        if (stmt.init) {
          const val = this.generateExpression(stmt.init);
          this.emit({
            op: '=',
            arg1: val,
            result: stmt.identifier,
            astNodeId: stmt.id,
            loc: stmt.loc,
            text: `${stmt.identifier} = ${val}`,
          });
        }
        break;
      }

      case 'AssignmentStatement': {
        const val = this.generateExpression(stmt.value);
        this.emit({
          op: '=',
          arg1: val,
          result: stmt.identifier,
          astNodeId: stmt.id,
          loc: stmt.loc,
          text: `${stmt.identifier} = ${val}`,
        });
        break;
      }

      case 'PrintStatement': {
        const val = this.generateExpression(stmt.expression);
        this.emit({
          op: 'print',
          arg1: val,
          astNodeId: stmt.id,
          loc: stmt.loc,
          text: `print ${val}`,
        });
        break;
      }

      case 'IfStatement': {
        const cond = this.generateExpression(stmt.condition);
        const elseLabel = stmt.alternate ? this.newLabel() : null;
        const endLabel = this.newLabel();

        const falseTarget = elseLabel || endLabel;
        this.emit({
          op: 'if_false',
          arg1: cond,
          result: falseTarget,
          astNodeId: stmt.id,
          loc: stmt.condition.loc,
          text: `if_false ${cond} goto ${falseTarget}`,
        });

        // Consequent
        this.generateStatement(stmt.consequent);

        if (stmt.alternate && elseLabel) {
          this.emit({
            op: 'goto',
            result: endLabel,
            astNodeId: stmt.id,
            loc: stmt.loc,
            text: `goto ${endLabel}`,
          });

          this.emit({
            op: 'label',
            result: elseLabel,
            astNodeId: stmt.id,
            loc: stmt.alternate.loc,
            text: `${elseLabel}:`,
          });

          this.generateStatement(stmt.alternate);
        }

        this.emit({
          op: 'label',
          result: endLabel,
          astNodeId: stmt.id,
          loc: stmt.loc,
          text: `${endLabel}:`,
        });
        break;
      }

      case 'WhileStatement': {
        const startLabel = this.newLabel();
        const endLabel = this.newLabel();

        this.emit({
          op: 'label',
          result: startLabel,
          astNodeId: stmt.id,
          loc: stmt.loc,
          text: `${startLabel}:`,
        });

        const cond = this.generateExpression(stmt.condition);

        this.emit({
          op: 'if_false',
          arg1: cond,
          result: endLabel,
          astNodeId: stmt.id,
          loc: stmt.condition.loc,
          text: `if_false ${cond} goto ${endLabel}`,
        });

        this.generateStatement(stmt.body);

        this.emit({
          op: 'goto',
          result: startLabel,
          astNodeId: stmt.id,
          loc: stmt.loc,
          text: `goto ${startLabel}`,
        });

        this.emit({
          op: 'label',
          result: endLabel,
          astNodeId: stmt.id,
          loc: stmt.loc,
          text: `${endLabel}:`,
        });
        break;
      }

      case 'BlockStatement': {
        for (const s of stmt.statements) {
          this.generateStatement(s);
        }
        break;
      }
    }
  }

  private generateExpression(expr: ExpressionNode): string {
    switch (expr.type) {
      case 'IntegerLiteral':
        return expr.value.toString();

      case 'IdentifierLiteral':
        return expr.name;

      case 'UnaryExpression': {
        const arg = this.generateExpression(expr.argument);
        const temp = this.newTemp();
        this.emit({
          op: 'neg',
          arg1: arg,
          result: temp,
          astNodeId: expr.id,
          loc: expr.loc,
          text: `${temp} = - ${arg}`,
        });
        return temp;
      }

      case 'BinaryExpression': {
        const left = this.generateExpression(expr.left);
        const right = this.generateExpression(expr.right);
        const temp = this.newTemp();
        this.emit({
          op: expr.operator,
          arg1: left,
          arg2: right,
          result: temp,
          astNodeId: expr.id,
          loc: expr.loc,
          text: `${temp} = ${left} ${expr.operator} ${right}`,
        });
        return temp;
      }
    }
  }

  private newTemp(): string {
    return `t${this.tempCounter++}`;
  }

  private newLabel(): string {
    return `L${this.labelCounter++}`;
  }

  private emit(instr: Omit<TACInstruction, 'id'>): void {
    this.instructions.push({
      id: `tac_${this.instrIdCounter++}`,
      ...instr,
    });
  }

  /**
   * Classical Basic Block Partitioning via Leader Detection:
   * Rule 1: The first instruction is a leader.
   * Rule 2: Any target of a conditional or unconditional goto (label) is a leader.
   * Rule 3: Any instruction immediately following a conditional or unconditional goto is a leader.
   */
  public partitionBasicBlocks(instructions: TACInstruction[]): BasicBlock[] {
    if (instructions.length === 0) return [];

    const isLeader = new Array<boolean>(instructions.length).fill(false);
    isLeader[0] = true; // Rule 1

    for (let i = 0; i < instructions.length; i++) {
      const instr = instructions[i];

      // Rule 2: Target of a jump (labels)
      if (instr.op === 'label') {
        isLeader[i] = true;
      }

      // Rule 3: Instruction following a jump
      if (instr.op === 'goto' || instr.op === 'if_false' || instr.op === 'if_true') {
        if (i + 1 < instructions.length) {
          isLeader[i + 1] = true;
        }
      }
    }

    // Slice instructions into basic blocks
    const blocks: BasicBlock[] = [];
    let currentBlockInstrs: TACInstruction[] = [];
    let blockIndex = 1;

    for (let i = 0; i < instructions.length; i++) {
      if (isLeader[i] && currentBlockInstrs.length > 0) {
        blocks.push({
          id: `B${blockIndex}`,
          name: `Block ${blockIndex}`,
          instructions: currentBlockInstrs,
          predecessors: [],
          successors: [],
          isEntry: blockIndex === 1,
          isExit: false,
        });
        blockIndex++;
        currentBlockInstrs = [];
      }
      currentBlockInstrs.push(instructions[i]);
    }

    if (currentBlockInstrs.length > 0) {
      blocks.push({
        id: `B${blockIndex}`,
        name: `Block ${blockIndex}`,
        instructions: currentBlockInstrs,
        predecessors: [],
        successors: [],
        isEntry: blockIndex === 1,
        isExit: true,
      });
    }

    // Connect control flow edges (Predecessors & Successors)
    const labelToBlockMap = new Map<string, string>();
    for (const b of blocks) {
      for (const instr of b.instructions) {
        if (instr.op === 'label' && instr.result) {
          labelToBlockMap.set(instr.result, b.id);
        }
      }
    }

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const lastInstr = b.instructions[b.instructions.length - 1];

      if (!lastInstr) continue;

      if (lastInstr.op === 'goto') {
        const targetBlock = labelToBlockMap.get(lastInstr.result || '');
        if (targetBlock && !b.successors.includes(targetBlock)) {
          b.successors.push(targetBlock);
        }
      } else if (lastInstr.op === 'if_false' || lastInstr.op === 'if_true') {
        // Branch target
        const branchTarget = labelToBlockMap.get(lastInstr.result || '');
        if (branchTarget && !b.successors.includes(branchTarget)) {
          b.successors.push(branchTarget);
        }
        // Fall-through target
        if (i + 1 < blocks.length) {
          const fallthrough = blocks[i + 1].id;
          if (!b.successors.includes(fallthrough)) {
            b.successors.push(fallthrough);
          }
        }
      } else {
        // Normal fall-through
        if (i + 1 < blocks.length) {
          const fallthrough = blocks[i + 1].id;
          if (!b.successors.includes(fallthrough)) {
            b.successors.push(fallthrough);
          }
        } else {
          b.isExit = true;
        }
      }
    }

    // Populate predecessors from successors
    for (const b of blocks) {
      for (const succId of b.successors) {
        const target = blocks.find((blk) => blk.id === succId);
        if (target && !target.predecessors.includes(b.id)) {
          target.predecessors.push(b.id);
        }
      }
    }

    return blocks;
  }
}

export function generateTAC(program: ProgramNode): TACResult {
  const generator = new TACGenerator();
  return generator.generate(program);
}
