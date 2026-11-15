from typing import List, Dict, Set, Any
from compiler.ast_nodes import (
    ASTNode, Program, FunctionDef, CompoundStmt, VarDecl, Assignment,
    BinaryOp, UnaryOp, Identifier, Constant, IfStmt, WhileStmt, ForStmt,
    DoWhileStmt, BreakStmt, ContinueStmt, ReturnStmt, ExprStmt
)

class ValidationError(Exception):
    def __init__(self, message: str, line: int = 1, col: int = 1):
        super().__init__(f"Validation Error at line {line}, col {col}: {message}")
        self.message = message
        self.line = line
        self.col = col

class ASTValidator:
    def __init__(self, ast: Program):
        self.ast = ast
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.declared_variables: Set[str] = set()

    def validate(self) -> Dict[str, Any]:
        self.errors.clear()
        self.warnings.clear()
        self.declared_variables.clear()

        for decl in self.ast.declarations:
            if isinstance(decl, FunctionDef):
                self._validate_function(decl)
            elif isinstance(decl, VarDecl):
                self._validate_var_decl(decl)

        if self.errors:
            first = self.errors[0]
            raise ValidationError(first["message"], first["line"], first["col"])

        return {
            "is_valid": len(self.errors) == 0,
            "errors": self.errors,
            "warnings": self.warnings
        }

    def _validate_function(self, func: FunctionDef):
        # Scope variables
        for p in func.params:
            self.declared_variables.add(p.name)
        self._validate_stmt(func.body, in_loop=False)

    def _validate_var_decl(self, decl: VarDecl):
        self.declared_variables.add(decl.name)
        if decl.init_expr:
            self._validate_expr(decl.init_expr)

    def _validate_stmt(self, stmt: ASTNode, in_loop: bool = False):
        if isinstance(stmt, CompoundStmt):
            for s in stmt.statements:
                self._validate_stmt(s, in_loop)
        elif isinstance(stmt, VarDecl):
            self._validate_var_decl(stmt)
        elif isinstance(stmt, ExprStmt):
            self._validate_expr(stmt.expr)
        elif isinstance(stmt, IfStmt):
            self._validate_expr(stmt.condition)
            self._validate_stmt(stmt.then_branch, in_loop)
            if stmt.else_branch:
                self._validate_stmt(stmt.else_branch, in_loop)
        elif isinstance(stmt, WhileStmt):
            self._validate_expr(stmt.condition)
            self._validate_stmt(stmt.body, in_loop=True)
        elif isinstance(stmt, ForStmt):
            if stmt.init:
                if isinstance(stmt.init, ASTNode):
                    self._validate_stmt(stmt.init, in_loop)
            if stmt.condition:
                self._validate_expr(stmt.condition)
            if stmt.post:
                self._validate_expr(stmt.post)
            self._validate_stmt(stmt.body, in_loop=True)
        elif isinstance(stmt, DoWhileStmt):
            self._validate_stmt(stmt.body, in_loop=True)
            self._validate_expr(stmt.condition)
        elif isinstance(stmt, (BreakStmt, ContinueStmt)):
            if not in_loop:
                self.errors.append({
                    "message": f"'{type(stmt).__name__[:-4].lower()}' statement outside of loop construct",
                    "line": stmt.line,
                    "col": stmt.col
                })
        elif isinstance(stmt, ReturnStmt):
            if stmt.expr:
                self._validate_expr(stmt.expr)

    def _validate_expr(self, expr: ASTNode):
        if isinstance(expr, Identifier):
            if expr.name not in self.declared_variables:
                self.warnings.append({
                    "message": f"Variable '{expr.name}' used without explicit declaration in scope",
                    "line": expr.line,
                    "col": expr.col
                })
        elif isinstance(expr, Assignment):
            self.declared_variables.add(expr.target)
            self._validate_expr(expr.expr)
        elif isinstance(expr, BinaryOp):
            if expr.op in ('/', '%') and isinstance(expr.right, Constant) and expr.right.value == 0:
                self.errors.append({
                    "message": "Division or modulo by zero constant detected",
                    "line": expr.line,
                    "col": expr.col
                })
            self._validate_expr(expr.left)
            self._validate_expr(expr.right)
        elif isinstance(expr, UnaryOp):
            self._validate_expr(expr.operand)
