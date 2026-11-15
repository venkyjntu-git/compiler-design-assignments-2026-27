from typing import List, Optional, Any, Union

class ASTNode:
    def __init__(self, line: int = 1, col: int = 1):
        self.line = line
        self.col = col

class Program(ASTNode):
    def __init__(self, declarations: List['ASTNode'], line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.declarations = declarations

class FunctionDef(ASTNode):
    def __init__(self, return_type: str, name: str, params: List['ParamDecl'], body: 'CompoundStmt', line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.return_type = return_type
        self.name = name
        self.params = params
        self.body = body

class ParamDecl(ASTNode):
    def __init__(self, type_name: str, name: str, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.type_name = type_name
        self.name = name

class CompoundStmt(ASTNode):
    def __init__(self, statements: List[ASTNode], line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.statements = statements

class VarDecl(ASTNode):
    def __init__(self, type_name: str, name: str, init_expr: Optional[ASTNode] = None, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.type_name = type_name
        self.name = name
        self.init_expr = init_expr

class Assignment(ASTNode):
    def __init__(self, target: str, expr: ASTNode, op: str = "=", line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.target = target
        self.expr = expr
        self.op = op

class BinaryOp(ASTNode):
    def __init__(self, left: ASTNode, op: str, right: ASTNode, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.left = left
        self.op = op
        self.right = right

class UnaryOp(ASTNode):
    def __init__(self, op: str, operand: ASTNode, is_prefix: bool = True, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.op = op
        self.operand = operand
        self.is_prefix = is_prefix

class Identifier(ASTNode):
    def __init__(self, name: str, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.name = name

class Constant(ASTNode):
    def __init__(self, value: Union[int, str], line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.value = value

class IfStmt(ASTNode):
    def __init__(self, condition: ASTNode, then_branch: ASTNode, else_branch: Optional[ASTNode] = None, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.condition = condition
        self.then_branch = then_branch
        self.else_branch = else_branch

class WhileStmt(ASTNode):
    def __init__(self, condition: ASTNode, body: ASTNode, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.condition = condition
        self.body = body

class ForStmt(ASTNode):
    def __init__(self, init: Optional[ASTNode], condition: Optional[ASTNode], post: Optional[ASTNode], body: ASTNode, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.init = init
        self.condition = condition
        self.post = post
        self.body = body

class DoWhileStmt(ASTNode):
    def __init__(self, body: ASTNode, condition: ASTNode, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.body = body
        self.condition = condition

class BreakStmt(ASTNode):
    def __init__(self, line: int = 1, col: int = 1):
        super().__init__(line, col)

class ContinueStmt(ASTNode):
    def __init__(self, line: int = 1, col: int = 1):
        super().__init__(line, col)

class ReturnStmt(ASTNode):
    def __init__(self, expr: Optional[ASTNode] = None, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.expr = expr

class ExprStmt(ASTNode):
    def __init__(self, expr: ASTNode, line: int = 1, col: int = 1):
        super().__init__(line, col)
        self.expr = expr
