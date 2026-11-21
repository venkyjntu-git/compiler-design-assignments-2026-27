/**
 * Syntax Analyzer (Parser) for CompilerVerse
 * Generates both a Concrete Parse Tree (CST) and an Abstract Syntax Tree (AST).
 * Records a detailed parsing trace and catches syntax errors with precise source spans.
 */

import { Token, TokenType } from './lexer';
import {
  ASTNode,
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
  BinaryOperator,
  SourceLocation,
} from './ast';

export interface ParseTreeNode {
  id: string;
  name: string;
  isTerminal: boolean;
  token?: Token;
  rule?: string;
  children: ParseTreeNode[];
}

export interface ParsingTraceEntry {
  step: number;
  action: string;
  lookahead: string;
  line: number;
  column: number;
}

export interface SyntaxError {
  message: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

export interface ParserResult {
  ast: ProgramNode | null;
  parseTree: ParseTreeNode | null;
  trace: ParsingTraceEntry[];
  errors: SyntaxError[];
}

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private trace: ParsingTraceEntry[] = [];
  private errors: SyntaxError[] = [];
  private parseNodeIdCounter: number = 1;
  private astNodeIdCounter: number = 1;
  private traceStepCounter: number = 1;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): ParserResult {
    this.current = 0;
    this.trace = [];
    this.errors = [];
    this.parseNodeIdCounter = 1;
    this.astNodeIdCounter = 1;
    this.traceStepCounter = 1;

    try {
      const { ast, cst } = this.parseProgram();

      // Check if there are leftover tokens before EOF
      if (!this.isAtEnd()) {
        const tok = this.peek();
        this.addError(`Unexpected token '${tok.value}' after program completion`, tok);
      }

      return {
        ast,
        parseTree: cst,
        trace: this.trace,
        errors: this.errors,
      };
    } catch (e: any) {
      return {
        ast: null,
        parseTree: null,
        trace: this.trace,
        errors: this.errors.length > 0 ? this.errors : [{
          message: e.message || 'Fatal syntax error',
          line: 1,
          column: 1,
          start: 0,
          end: 0,
        }],
      };
    }
  }

  private parseProgram(): { ast: ProgramNode; cst: ParseTreeNode } {
    this.logTrace('Enter Program', 'Program -> StatementList');
    const cstChildren: ParseTreeNode[] = [];
    const astStatements: StatementNode[] = [];

    const startTok = this.peek();

    while (!this.isAtEnd()) {
      try {
        const stmt = this.parseStatement();
        if (stmt) {
          astStatements.push(stmt.ast);
          cstChildren.push(stmt.cst);
        } else {
          break;
        }
      } catch (err: any) {
        this.synchronize();
      }
    }

    const endTok = this.previous() || startTok;

    const ast: ProgramNode = {
      id: this.nextAstId(),
      type: 'Program',
      body: astStatements,
      loc: {
        line: startTok.line,
        column: startTok.column,
        start: startTok.start,
        end: endTok.end,
      },
    };

    const cst: ParseTreeNode = {
      id: this.nextParseId(),
      name: 'Program',
      isTerminal: false,
      rule: 'Program -> StatementList',
      children: cstChildren,
    };

    this.logTrace('Exit Program', 'Completed parsing Program');
    return { ast, cst };
  }

  private parseStatement(): { ast: StatementNode; cst: ParseTreeNode } | null {
    if (this.isAtEnd()) return null;

    const tok = this.peek();

    if (tok.type === 'KEYWORD' && tok.value === 'int') {
      return this.parseVarDeclaration();
    }
    if (tok.type === 'KEYWORD' && tok.value === 'print') {
      return this.parsePrintStatement();
    }
    if (tok.type === 'KEYWORD' && tok.value === 'if') {
      return this.parseIfStatement();
    }
    if (tok.type === 'KEYWORD' && tok.value === 'while') {
      return this.parseWhileStatement();
    }
    if (tok.type === 'DELIMITER' && tok.value === '{') {
      return this.parseBlockStatement();
    }
    if (tok.type === 'IDENTIFIER') {
      return this.parseAssignmentStatement();
    }

    this.addError(`Unexpected token '${tok.value}' (${tok.type}) at beginning of statement`, tok);
    this.advance();
    return null;
  }

  private parseVarDeclaration(): { ast: VarDeclarationNode; cst: ParseTreeNode } {
    this.logTrace('Enter VarDeclaration', 'VarDeclaration -> "int" ID ("=" Expr)? ";"');
    const startTok = this.consume('KEYWORD', 'Expected "int"', 'int');
    const idTok = this.consume('IDENTIFIER', 'Expected identifier after "int"');

    let initAst: ExpressionNode | null = null;
    const cstChildren: ParseTreeNode[] = [
      this.createTerminalNode(startTok),
      this.createTerminalNode(idTok),
    ];

    if (this.match('OPERATOR', '=')) {
      const eqTok = this.previous();
      cstChildren.push(this.createTerminalNode(eqTok));
      const expr = this.parseExpression();
      initAst = expr.ast;
      cstChildren.push(expr.cst);
    }

    const semiTok = this.consume('SEPARATOR', 'Expected ";" after variable declaration', ';');
    cstChildren.push(this.createTerminalNode(semiTok));

    const ast: VarDeclarationNode = {
      id: this.nextAstId(),
      type: 'VarDeclaration',
      varType: 'int',
      identifier: idTok.value,
      init: initAst,
      loc: {
        line: startTok.line,
        column: startTok.column,
        start: startTok.start,
        end: semiTok.end,
      },
    };

    const cst: ParseTreeNode = {
      id: this.nextParseId(),
      name: 'VarDeclaration',
      isTerminal: false,
      rule: 'VarDeclaration -> "int" ID ("=" Expr)? ";"',
      children: cstChildren,
    };

    return { ast, cst };
  }

  private parseAssignmentStatement(): { ast: AssignmentStatementNode; cst: ParseTreeNode } {
    this.logTrace('Enter Assignment', 'Assignment -> ID "=" Expr ";"');
    const idTok = this.consume('IDENTIFIER', 'Expected identifier in assignment');
    const eqTok = this.consume('OPERATOR', 'Expected "=" in assignment', '=');
    const expr = this.parseExpression();
    const semiTok = this.consume('SEPARATOR', 'Expected ";" after assignment', ';');

    const cstChildren: ParseTreeNode[] = [
      this.createTerminalNode(idTok),
      this.createTerminalNode(eqTok),
      expr.cst,
      this.createTerminalNode(semiTok),
    ];

    const ast: AssignmentStatementNode = {
      id: this.nextAstId(),
      type: 'AssignmentStatement',
      identifier: idTok.value,
      value: expr.ast,
      loc: {
        line: idTok.line,
        column: idTok.column,
        start: idTok.start,
        end: semiTok.end,
      },
    };

    const cst: ParseTreeNode = {
      id: this.nextParseId(),
      name: 'AssignmentStatement',
      isTerminal: false,
      rule: 'Assignment -> ID "=" Expr ";"',
      children: cstChildren,
    };

    return { ast, cst };
  }

  private parsePrintStatement(): { ast: PrintStatementNode; cst: ParseTreeNode } {
    this.logTrace('Enter PrintStatement', 'PrintStatement -> "print" "(" Expr ")" ";"');
    const printTok = this.consume('KEYWORD', 'Expected "print"', 'print');
    const lparenTok = this.consume('DELIMITER', 'Expected "(" after "print"', '(');
    const expr = this.parseExpression();
    const rparenTok = this.consume('DELIMITER', 'Expected ")" after expression in print statement', ')');
    const semiTok = this.consume('SEPARATOR', 'Expected ";" after print statement', ';');

    const cstChildren: ParseTreeNode[] = [
      this.createTerminalNode(printTok),
      this.createTerminalNode(lparenTok),
      expr.cst,
      this.createTerminalNode(rparenTok),
      this.createTerminalNode(semiTok),
    ];

    const ast: PrintStatementNode = {
      id: this.nextAstId(),
      type: 'PrintStatement',
      expression: expr.ast,
      loc: {
        line: printTok.line,
        column: printTok.column,
        start: printTok.start,
        end: semiTok.end,
      },
    };

    const cst: ParseTreeNode = {
      id: this.nextParseId(),
      name: 'PrintStatement',
      isTerminal: false,
      rule: 'PrintStatement -> "print" "(" Expr ")" ";"',
      children: cstChildren,
    };

    return { ast, cst };
  }

  private parseIfStatement(): { ast: IfStatementNode; cst: ParseTreeNode } {
    this.logTrace('Enter IfStatement', 'IfStatement -> "if" "(" Expr ")" Stmt ("else" Stmt)?');
    const ifTok = this.consume('KEYWORD', 'Expected "if"', 'if');
    const lparenTok = this.consume('DELIMITER', 'Expected "(" after "if"', '(');
    const condition = this.parseExpression();
    const rparenTok = this.consume('DELIMITER', 'Expected ")" after if condition', ')');

    const consequent = this.parseStatement();
    if (!consequent) {
      throw new Error('Expected statement inside if branch');
    }

    const cstChildren: ParseTreeNode[] = [
      this.createTerminalNode(ifTok),
      this.createTerminalNode(lparenTok),
      condition.cst,
      this.createTerminalNode(rparenTok),
      consequent.cst,
    ];

    let alternateAst: StatementNode | null = null;
    let endTok = this.previous();

    if (this.match('KEYWORD', 'else')) {
      const elseTok = this.previous();
      cstChildren.push(this.createTerminalNode(elseTok));
      const alt = this.parseStatement();
      if (!alt) {
        throw new Error('Expected statement inside else branch');
      }
      alternateAst = alt.ast;
      cstChildren.push(alt.cst);
      endTok = this.previous();
    }

    const ast: IfStatementNode = {
      id: this.nextAstId(),
      type: 'IfStatement',
      condition: condition.ast,
      consequent: consequent.ast,
      alternate: alternateAst,
      loc: {
        line: ifTok.line,
        column: ifTok.column,
        start: ifTok.start,
        end: endTok.end,
      },
    };

    const cst: ParseTreeNode = {
      id: this.nextParseId(),
      name: 'IfStatement',
      isTerminal: false,
      rule: 'IfStatement -> "if" "(" Expr ")" Stmt ("else" Stmt)?',
      children: cstChildren,
    };

    return { ast, cst };
  }

  private parseWhileStatement(): { ast: WhileStatementNode; cst: ParseTreeNode } {
    this.logTrace('Enter WhileStatement', 'WhileStatement -> "while" "(" Expr ")" Stmt');
    const whileTok = this.consume('KEYWORD', 'Expected "while"', 'while');
    const lparenTok = this.consume('DELIMITER', 'Expected "(" after "while"', '(');
    const condition = this.parseExpression();
    const rparenTok = this.consume('DELIMITER', 'Expected ")" after while condition', ')');

    const body = this.parseStatement();
    if (!body) {
      throw new Error('Expected statement inside while body');
    }

    const cstChildren: ParseTreeNode[] = [
      this.createTerminalNode(whileTok),
      this.createTerminalNode(lparenTok),
      condition.cst,
      this.createTerminalNode(rparenTok),
      body.cst,
    ];

    const ast: WhileStatementNode = {
      id: this.nextAstId(),
      type: 'WhileStatement',
      condition: condition.ast,
      body: body.ast,
      loc: {
        line: whileTok.line,
        column: whileTok.column,
        start: whileTok.start,
        end: this.previous().end,
      },
    };

    const cst: ParseTreeNode = {
      id: this.nextParseId(),
      name: 'WhileStatement',
      isTerminal: false,
      rule: 'WhileStatement -> "while" "(" Expr ")" Stmt',
      children: cstChildren,
    };

    return { ast, cst };
  }

  private parseBlockStatement(): { ast: BlockStatementNode; cst: ParseTreeNode } {
    this.logTrace('Enter BlockStatement', 'BlockStatement -> "{" Stmt* "}"');
    const lbraceTok = this.consume('DELIMITER', 'Expected "{"', '{');
    const cstChildren: ParseTreeNode[] = [this.createTerminalNode(lbraceTok)];
    const statements: StatementNode[] = [];

    while (!this.check('DELIMITER', '}') && !this.isAtEnd()) {
      try {
        const stmt = this.parseStatement();
        if (stmt) {
          statements.push(stmt.ast);
          cstChildren.push(stmt.cst);
        }
      } catch (err: any) {
        this.synchronize();
      }
    }

    const rbraceTok = this.consume('DELIMITER', 'Expected "}" after block', '}');
    cstChildren.push(this.createTerminalNode(rbraceTok));

    const ast: BlockStatementNode = {
      id: this.nextAstId(),
      type: 'BlockStatement',
      statements,
      loc: {
        line: lbraceTok.line,
        column: lbraceTok.column,
        start: lbraceTok.start,
        end: rbraceTok.end,
      },
    };

    const cst: ParseTreeNode = {
      id: this.nextParseId(),
      name: 'BlockStatement',
      isTerminal: false,
      rule: 'BlockStatement -> "{" Stmt* "}"',
      children: cstChildren,
    };

    return { ast, cst };
  }

  // --- Expressions Parsing with Operator Precedence ---

  private parseExpression(): { ast: ExpressionNode; cst: ParseTreeNode } {
    return this.parseRelationalExpression();
  }

  private parseRelationalExpression(): { ast: ExpressionNode; cst: ParseTreeNode } {
    let left = this.parseAdditiveExpression();

    while (
      this.match('OPERATOR', '==') ||
      this.match('OPERATOR', '!=') ||
      this.match('OPERATOR', '<') ||
      this.match('OPERATOR', '<=') ||
      this.match('OPERATOR', '>') ||
      this.match('OPERATOR', '>=')
    ) {
      const opTok = this.previous();
      this.logTrace('Binary Op (Relational)', `Apply op ${opTok.value}`);
      const right = this.parseAdditiveExpression();

      const newAst: BinaryExpressionNode = {
        id: this.nextAstId(),
        type: 'BinaryExpression',
        operator: opTok.value as BinaryOperator,
        left: left.ast,
        right: right.ast,
        loc: {
          line: left.ast.loc.line,
          column: left.ast.loc.column,
          start: left.ast.loc.start,
          end: right.ast.loc.end,
        },
      };

      const newCst: ParseTreeNode = {
        id: this.nextParseId(),
        name: 'RelationalExpression',
        isTerminal: false,
        rule: `RelationalExpr -> RelationalExpr ${opTok.value} AdditiveExpr`,
        children: [left.cst, this.createTerminalNode(opTok), right.cst],
      };

      left = { ast: newAst, cst: newCst };
    }

    return left;
  }

  private parseAdditiveExpression(): { ast: ExpressionNode; cst: ParseTreeNode } {
    let left = this.parseMultiplicativeExpression();

    while (this.match('OPERATOR', '+') || this.match('OPERATOR', '-')) {
      const opTok = this.previous();
      this.logTrace('Binary Op (Additive)', `Apply op ${opTok.value}`);
      const right = this.parseMultiplicativeExpression();

      const newAst: BinaryExpressionNode = {
        id: this.nextAstId(),
        type: 'BinaryExpression',
        operator: opTok.value as BinaryOperator,
        left: left.ast,
        right: right.ast,
        loc: {
          line: left.ast.loc.line,
          column: left.ast.loc.column,
          start: left.ast.loc.start,
          end: right.ast.loc.end,
        },
      };

      const newCst: ParseTreeNode = {
        id: this.nextParseId(),
        name: 'AdditiveExpression',
        isTerminal: false,
        rule: `AdditiveExpr -> AdditiveExpr ${opTok.value} MultiplicativeExpr`,
        children: [left.cst, this.createTerminalNode(opTok), right.cst],
      };

      left = { ast: newAst, cst: newCst };
    }

    return left;
  }

  private parseMultiplicativeExpression(): { ast: ExpressionNode; cst: ParseTreeNode } {
    let left = this.parseUnaryExpression();

    while (
      this.match('OPERATOR', '*') ||
      this.match('OPERATOR', '/') ||
      this.match('OPERATOR', '%')
    ) {
      const opTok = this.previous();
      this.logTrace('Binary Op (Multiplicative)', `Apply op ${opTok.value}`);
      const right = this.parseUnaryExpression();

      const newAst: BinaryExpressionNode = {
        id: this.nextAstId(),
        type: 'BinaryExpression',
        operator: opTok.value as BinaryOperator,
        left: left.ast,
        right: right.ast,
        loc: {
          line: left.ast.loc.line,
          column: left.ast.loc.column,
          start: left.ast.loc.start,
          end: right.ast.loc.end,
        },
      };

      const newCst: ParseTreeNode = {
        id: this.nextParseId(),
        name: 'MultiplicativeExpression',
        isTerminal: false,
        rule: `MultiplicativeExpr -> MultiplicativeExpr ${opTok.value} UnaryExpr`,
        children: [left.cst, this.createTerminalNode(opTok), right.cst],
      };

      left = { ast: newAst, cst: newCst };
    }

    return left;
  }

  private parseUnaryExpression(): { ast: ExpressionNode; cst: ParseTreeNode } {
    if (this.match('OPERATOR', '-')) {
      const opTok = this.previous();
      this.logTrace('Unary Op (-)', 'UnaryExpr -> "-" UnaryExpr');
      const right = this.parseUnaryExpression();

      const ast: UnaryExpressionNode = {
        id: this.nextAstId(),
        type: 'UnaryExpression',
        operator: '-',
        argument: right.ast,
        loc: {
          line: opTok.line,
          column: opTok.column,
          start: opTok.start,
          end: right.ast.loc.end,
        },
      };

      const cst: ParseTreeNode = {
        id: this.nextParseId(),
        name: 'UnaryExpression',
        isTerminal: false,
        rule: 'UnaryExpr -> "-" UnaryExpr',
        children: [this.createTerminalNode(opTok), right.cst],
      };

      return { ast, cst };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): { ast: ExpressionNode; cst: ParseTreeNode } {
    const tok = this.peek();

    if (tok.type === 'NUMBER') {
      this.advance();
      this.logTrace('Primary (Number)', `Read number ${tok.value}`);
      const ast: IntegerLiteralNode = {
        id: this.nextAstId(),
        type: 'IntegerLiteral',
        value: parseInt(tok.value, 10),
        loc: {
          line: tok.line,
          column: tok.column,
          start: tok.start,
          end: tok.end,
        },
      };
      const cst = this.createTerminalNode(tok);
      return { ast, cst };
    }

    if (tok.type === 'IDENTIFIER') {
      this.advance();
      this.logTrace('Primary (Identifier)', `Read identifier ${tok.value}`);
      const ast: IdentifierLiteralNode = {
        id: this.nextAstId(),
        type: 'IdentifierLiteral',
        name: tok.value,
        loc: {
          line: tok.line,
          column: tok.column,
          start: tok.start,
          end: tok.end,
        },
      };
      const cst = this.createTerminalNode(tok);
      return { ast, cst };
    }

    if (this.match('DELIMITER', '(')) {
      const lparen = this.previous();
      this.logTrace('Primary (Parenthesized)', 'Read "("');
      const expr = this.parseExpression();
      const rparen = this.consume('DELIMITER', 'Expected ")" after expression', ')');

      const cst: ParseTreeNode = {
        id: this.nextParseId(),
        name: 'ParenthesizedExpression',
        isTerminal: false,
        rule: 'PrimaryExpr -> "(" Expr ")"',
        children: [this.createTerminalNode(lparen), expr.cst, this.createTerminalNode(rparen)],
      };

      // In AST, parenthesized expression retains inner expression with location adjusted
      expr.ast.loc.start = lparen.start;
      expr.ast.loc.end = rparen.end;
      return { ast: expr.ast, cst };
    }

    this.addError(`Expected expression but found '${tok.value}' (${tok.type})`, tok);
    this.advance();
    throw new Error(`Parse error at token ${tok.value}`);
  }

  // --- Helper Methods ---

  private match(type: TokenType, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType, value?: string): boolean {
    if (this.isAtEnd()) return false;
    const tok = this.peek();
    if (tok.type !== type) return false;
    if (value !== undefined && tok.value !== value) return false;
    return true;
  }

  private consume(type: TokenType, message: string, value?: string): Token {
    if (this.check(type, value)) {
      return this.advance();
    }
    const tok = this.peek();
    this.addError(`${message} (got '${tok.value}')`, tok);
    throw new Error(message);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current] || this.tokens[this.tokens.length - 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1] || this.tokens[0];
  }

  private addError(message: string, tok: Token): void {
    this.errors.push({
      message,
      line: tok.line,
      column: tok.column,
      start: tok.start,
      end: tok.end,
    });
  }

  private logTrace(action: string, rule: string): void {
    const lookaheadTok = this.peek();
    this.trace.push({
      step: this.traceStepCounter++,
      action: `${action} [${rule}]`,
      lookahead: lookaheadTok ? `${lookaheadTok.type}:${lookaheadTok.value}` : 'EOF',
      line: lookaheadTok ? lookaheadTok.line : 1,
      column: lookaheadTok ? lookaheadTok.column : 1,
    });
  }

  private createTerminalNode(tok: Token): ParseTreeNode {
    return {
      id: this.nextParseId(),
      name: `${tok.type}: ${tok.value}`,
      isTerminal: true,
      token: tok,
      children: [],
    };
  }

  private nextParseId(): string {
    return `cst_${this.parseNodeIdCounter++}`;
  }

  private nextAstId(): string {
    return `ast_${this.astNodeIdCounter++}`;
  }

  private synchronize(): void {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().value === ';') return;
      const tok = this.peek();
      if (tok.value === 'int' || tok.value === 'if' || tok.value === 'while' || tok.value === 'print') {
        return;
      }
      this.advance();
    }
  }
}

export function parse(tokens: Token[]): ParserResult {
  const parser = new Parser(tokens);
  return parser.parse();
}
