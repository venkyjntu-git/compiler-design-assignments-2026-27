/**
 * Abstract Syntax Tree (AST) definitions for CompilerVerse mini-language.
 * Each node maintains stable IDs and exact source code spans for cross-phase linking.
 */

export interface SourceLocation {
  line: number;
  column: number;
  start: number;
  end: number;
}

export type ASTNodeType =
  | 'Program'
  | 'VarDeclaration'
  | 'AssignmentStatement'
  | 'PrintStatement'
  | 'IfStatement'
  | 'WhileStatement'
  | 'BlockStatement'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'IdentifierLiteral'
  | 'IntegerLiteral';

export interface BaseASTNode {
  id: string;
  type: ASTNodeType;
  loc: SourceLocation;
}

export interface ProgramNode extends BaseASTNode {
  type: 'Program';
  body: StatementNode[];
}

export interface VarDeclarationNode extends BaseASTNode {
  type: 'VarDeclaration';
  varType: 'int';
  identifier: string;
  init: ExpressionNode | null;
}

export interface AssignmentStatementNode extends BaseASTNode {
  type: 'AssignmentStatement';
  identifier: string;
  value: ExpressionNode;
}

export interface PrintStatementNode extends BaseASTNode {
  type: 'PrintStatement';
  expression: ExpressionNode;
}

export interface IfStatementNode extends BaseASTNode {
  type: 'IfStatement';
  condition: ExpressionNode;
  consequent: StatementNode;
  alternate: StatementNode | null;
}

export interface WhileStatementNode extends BaseASTNode {
  type: 'WhileStatement';
  condition: ExpressionNode;
  body: StatementNode;
}

export interface BlockStatementNode extends BaseASTNode {
  type: 'BlockStatement';
  statements: StatementNode[];
}

export type BinaryOperator =
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
  | '>=';

export interface BinaryExpressionNode extends BaseASTNode {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryExpressionNode extends BaseASTNode {
  type: 'UnaryExpression';
  operator: '-';
  argument: ExpressionNode;
}

export interface IdentifierLiteralNode extends BaseASTNode {
  type: 'IdentifierLiteral';
  name: string;
}

export interface IntegerLiteralNode extends BaseASTNode {
  type: 'IntegerLiteral';
  value: number;
}

export type ExpressionNode =
  | BinaryExpressionNode
  | UnaryExpressionNode
  | IdentifierLiteralNode
  | IntegerLiteralNode;

export type StatementNode =
  | VarDeclarationNode
  | AssignmentStatementNode
  | PrintStatementNode
  | IfStatementNode
  | WhileStatementNode
  | BlockStatementNode;

export type ASTNode = ProgramNode | StatementNode | ExpressionNode;
