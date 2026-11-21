/**
 * Semantic Analyzer for CompilerVerse
 * Performs declaration checking, scope analysis, type validation,
 * duplicate identification, and expression integrity checks.
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
  IdentifierLiteralNode,
  IntegerLiteralNode,
  SourceLocation,
} from './ast';
import { SymbolEntry, SymbolTableManager } from './symbolTable';

export interface SemanticError {
  message: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

export interface SemanticWarning {
  message: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

export interface SemanticResult {
  symbolTable: SymbolEntry[];
  errors: SemanticError[];
  warnings: SemanticWarning[];
}

export class SemanticAnalyzer {
  private symMgr: SymbolTableManager;
  private errors: SemanticError[] = [];
  private warnings: SemanticWarning[] = [];

  constructor() {
    this.symMgr = new SymbolTableManager();
  }

  public analyze(program: ProgramNode): SemanticResult {
    this.errors = [];
    this.warnings = [];
    this.symMgr = new SymbolTableManager();

    for (const stmt of program.body) {
      this.analyzeStatement(stmt);
    }

    return {
      symbolTable: this.symMgr.getAllEntries(),
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private analyzeStatement(stmt: StatementNode): void {
    switch (stmt.type) {
      case 'VarDeclaration':
        this.analyzeVarDeclaration(stmt);
        break;
      case 'AssignmentStatement':
        this.analyzeAssignment(stmt);
        break;
      case 'PrintStatement':
        this.analyzePrint(stmt);
        break;
      case 'IfStatement':
        this.analyzeIf(stmt);
        break;
      case 'WhileStatement':
        this.analyzeWhile(stmt);
        break;
      case 'BlockStatement':
        this.analyzeBlock(stmt);
        break;
    }
  }

  private analyzeVarDeclaration(decl: VarDeclarationNode): void {
    let initVal: number | string | null = null;
    let isInitialized = false;

    if (decl.init) {
      this.analyzeExpression(decl.init);
      isInitialized = true;
      if (decl.init.type === 'IntegerLiteral') {
        initVal = decl.init.value;
      }
    }

    const res = this.symMgr.defineSymbol(
      decl.identifier,
      'int',
      decl.loc,
      initVal,
      isInitialized
    );

    if (!res.success) {
      this.errors.push({
        message: `Duplicate declaration: variable '${decl.identifier}' is already declared in current scope '${this.symMgr.getCurrentScope().name}'`,
        line: decl.loc.line,
        column: decl.loc.column,
        start: decl.loc.start,
        end: decl.loc.end,
      });
    }
  }

  private analyzeAssignment(stmt: AssignmentStatementNode): void {
    const symbol = this.symMgr.resolveSymbol(stmt.identifier);
    if (!symbol) {
      this.errors.push({
        message: `Undeclared variable: '${stmt.identifier}' must be declared before assignment`,
        line: stmt.loc.line,
        column: stmt.loc.column,
        start: stmt.loc.start,
        end: stmt.loc.end,
      });
    } else {
      symbol.isInitialized = true;
      this.symMgr.recordReference(stmt.identifier, stmt.loc);
    }

    this.analyzeExpression(stmt.value);
  }

  private analyzePrint(stmt: PrintStatementNode): void {
    this.analyzeExpression(stmt.expression);
  }

  private analyzeIf(stmt: IfStatementNode): void {
    this.analyzeExpression(stmt.condition);
    this.analyzeStatement(stmt.consequent);
    if (stmt.alternate) {
      this.analyzeStatement(stmt.alternate);
    }
  }

  private analyzeWhile(stmt: WhileStatementNode): void {
    this.analyzeExpression(stmt.condition);
    this.analyzeStatement(stmt.body);
  }

  private analyzeBlock(stmt: BlockStatementNode): void {
    this.symMgr.enterScope();
    for (const s of stmt.statements) {
      this.analyzeStatement(s);
    }
    this.symMgr.exitScope();
  }

  private analyzeExpression(expr: ExpressionNode): void {
    switch (expr.type) {
      case 'IntegerLiteral':
        break;

      case 'IdentifierLiteral': {
        const symbol = this.symMgr.resolveSymbol(expr.name);
        if (!symbol) {
          this.errors.push({
            message: `Undeclared variable: '${expr.name}' is referenced before declaration`,
            line: expr.loc.line,
            column: expr.loc.column,
            start: expr.loc.start,
            end: expr.loc.end,
          });
        } else {
          this.symMgr.recordReference(expr.name, expr.loc);
          if (!symbol.isInitialized) {
            this.warnings.push({
              message: `Variable '${expr.name}' might be used before being initialized`,
              line: expr.loc.line,
              column: expr.loc.column,
              start: expr.loc.start,
              end: expr.loc.end,
            });
          }
        }
        break;
      }

      case 'UnaryExpression':
        this.analyzeExpression(expr.argument);
        break;

      case 'BinaryExpression': {
        this.analyzeExpression(expr.left);
        this.analyzeExpression(expr.right);

        // Division by zero check
        if (expr.operator === '/' || expr.operator === '%') {
          if (expr.right.type === 'IntegerLiteral' && expr.right.value === 0) {
            this.errors.push({
              message: `Semantic Error: Division or modulo by zero detected in expression`,
              line: expr.right.loc.line,
              column: expr.right.loc.column,
              start: expr.right.loc.start,
              end: expr.right.loc.end,
            });
          }
        }
        break;
      }
    }
  }
}

export function analyzeSemantics(program: ProgramNode): SemanticResult {
  const analyzer = new SemanticAnalyzer();
  return analyzer.analyze(program);
}
