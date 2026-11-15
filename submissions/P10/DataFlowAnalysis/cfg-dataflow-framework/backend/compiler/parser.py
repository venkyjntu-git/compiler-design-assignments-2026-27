from typing import List, Optional
from compiler.lexer import Token, Lexer, LexerError
from compiler.ast_nodes import (
    ASTNode, Program, FunctionDef, ParamDecl, CompoundStmt, VarDecl, Assignment,
    BinaryOp, UnaryOp, Identifier, Constant, IfStmt, WhileStmt, ForStmt,
    DoWhileStmt, BreakStmt, ContinueStmt, ReturnStmt, ExprStmt
)

class ParserError(Exception):
    def __init__(self, message: str, line: int = 1, col: int = 1):
        super().__init__(f"Syntax Error at line {line}, col {col}: {message}")
        self.message = message
        self.line = line
        self.col = col

class Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0

    def current_token(self) -> Token:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return self.tokens[-1]

    def peek(self, offset: int = 1) -> Token:
        idx = self.pos + offset
        if idx < len(self.tokens):
            return self.tokens[idx]
        return self.tokens[-1]

    def advance(self) -> Token:
        tok = self.current_token()
        self.pos += 1
        return tok

    def match(self, *expected_types: str) -> bool:
        if self.current_token().type in expected_types:
            self.advance()
            return True
        return False

    def expect(self, expected_type: str, context_msg: str = "") -> Token:
        tok = self.current_token()
        if tok.type != expected_type:
            detail = f" (expected '{expected_type}' {context_msg})" if context_msg else f" (expected '{expected_type}')"
            raise ParserError(f"Unexpected token '{tok.value}'{detail}", tok.line, tok.col)
        return self.advance()

    def parse_program(self) -> Program:
        declarations = []
        # Check if the code is a formal C function or a sequence of statements
        is_function_defined = False
        for tok_idx in range(len(self.tokens) - 2):
            if (self.tokens[tok_idx].type in ('INT', 'FLOAT', 'VOID') and
                self.tokens[tok_idx + 1].type == 'IDENT' and
                self.tokens[tok_idx + 2].type == 'LPAREN'):
                is_function_defined = True
                break

        if is_function_defined:
            while self.current_token().type != 'EOF':
                if self.current_token().type in ('INT', 'FLOAT', 'VOID'):
                    # Could be function or global var
                    if self.peek(1).type == 'IDENT' and self.peek(2).type == 'LPAREN':
                        declarations.append(self.parse_function_def())
                    else:
                        declarations.extend(self.parse_var_decl())
                else:
                    raise ParserError(f"Expected top-level declaration or function, got '{self.current_token().value}'", self.current_token().line, self.current_token().col)
        else:
            # Wrap standalone statements inside an implicit 'main' function
            stmts = []
            while self.current_token().type != 'EOF':
                stmts.append(self.parse_statement())
            main_body = CompoundStmt(stmts, line=1, col=1)
            main_fn = FunctionDef("int", "main", [], main_body, line=1, col=1)
            declarations.append(main_fn)

        return Program(declarations)

    def parse_function_def(self) -> FunctionDef:
        ret_type_tok = self.advance() # INT or VOID
        name_tok = self.expect('IDENT', "as function name")
        self.expect('LPAREN')
        params = []
        if self.current_token().type != 'RPAREN':
            params = self.parse_param_list()
        self.expect('RPAREN')
        body = self.parse_compound_statement()
        return FunctionDef(ret_type_tok.value, name_tok.value, params, body, line=ret_type_tok.line, col=ret_type_tok.col)

    def parse_param_list(self) -> List[ParamDecl]:
        params = []
        p_type = self.expect('INT', "parameter type")
        p_name = self.expect('IDENT', "parameter name")
        params.append(ParamDecl(p_type.value, p_name.value, line=p_type.line, col=p_type.col))
        while self.match('COMMA'):
            p_type = self.expect('INT', "parameter type")
            p_name = self.expect('IDENT', "parameter name")
            params.append(ParamDecl(p_type.value, p_name.value, line=p_type.line, col=p_type.col))
        return params

    def parse_compound_statement(self) -> CompoundStmt:
        start_tok = self.expect('LBRACE')
        stmts = []
        while self.current_token().type not in ('RBRACE', 'EOF'):
            stmts.append(self.parse_statement())
        self.expect('RBRACE', "to close block '{'")
        return CompoundStmt(stmts, line=start_tok.line, col=start_tok.col)

    def parse_statement(self) -> ASTNode:
        tok = self.current_token()
        if tok.type == 'LBRACE':
            return self.parse_compound_statement()
        elif tok.type in ('INT', 'FLOAT'):
            decls = self.parse_var_decl()
            # If multiple declarations in one line e.g. int a = 1, b = 2; wrap in compound stmt
            if len(decls) == 1:
                return decls[0]
            return CompoundStmt(decls, line=tok.line, col=tok.col)
        elif tok.type == 'IF':
            return self.parse_if_statement()
        elif tok.type == 'WHILE':
            return self.parse_while_statement()
        elif tok.type == 'FOR':
            return self.parse_for_statement()
        elif tok.type == 'DO':
            return self.parse_do_while_statement()
        elif tok.type == 'BREAK':
            b_tok = self.advance()
            self.expect('SEMI', "after break")
            return BreakStmt(line=b_tok.line, col=b_tok.col)
        elif tok.type == 'CONTINUE':
            c_tok = self.advance()
            self.expect('SEMI', "after continue")
            return ContinueStmt(line=c_tok.line, col=c_tok.col)
        elif tok.type == 'RETURN':
            r_tok = self.advance()
            expr = None
            if self.current_token().type != 'SEMI':
                expr = self.parse_expression()
            self.expect('SEMI', "after return")
            return ReturnStmt(expr, line=r_tok.line, col=r_tok.col)
        elif tok.type == 'SEMI':
            # Empty statement
            self.advance()
            return CompoundStmt([], line=tok.line, col=tok.col)
        else:
            expr = self.parse_expression()
            self.expect('SEMI', "at end of statement")
            return ExprStmt(expr, line=tok.line, col=tok.col)

    def parse_var_decl(self) -> List[VarDecl]:
        type_tok = self.advance()  # 'INT' or 'FLOAT'
        decls = []
        name_tok = self.expect('IDENT', "as variable name")
        init_expr = None
        if self.match('ASSIGN'):
            init_expr = self.parse_expression()
        decls.append(VarDecl(type_tok.value, name_tok.value, init_expr, line=type_tok.line, col=type_tok.col))

        while self.match('COMMA'):
            n_tok = self.expect('IDENT', "as variable name in comma-separated list")
            init = None
            if self.match('ASSIGN'):
                init = self.parse_expression()
            decls.append(VarDecl(type_tok.value, n_tok.value, init, line=n_tok.line, col=n_tok.col))

        self.expect('SEMI', "after variable declaration")
        return decls

    def parse_if_statement(self) -> IfStmt:
        start_tok = self.expect('IF')
        self.expect('LPAREN', "after 'if'")
        condition = self.parse_expression()
        self.expect('RPAREN', "after condition in 'if'")
        then_branch = self.parse_statement()
        else_branch = None
        if self.match('ELSE'):
            else_branch = self.parse_statement()
        return IfStmt(condition, then_branch, else_branch, line=start_tok.line, col=start_tok.col)

    def parse_while_statement(self) -> WhileStmt:
        start_tok = self.expect('WHILE')
        self.expect('LPAREN', "after 'while'")
        condition = self.parse_expression()
        self.expect('RPAREN', "after condition in 'while'")
        body = self.parse_statement()
        return WhileStmt(condition, body, line=start_tok.line, col=start_tok.col)

    def parse_for_statement(self) -> ForStmt:
        start_tok = self.expect('FOR')
        self.expect('LPAREN', "after 'for'")
        # Init
        init = None
        if self.current_token().type == 'INT':
            decls = self.parse_var_decl()
            init = decls[0] if len(decls) == 1 else CompoundStmt(decls, line=start_tok.line, col=start_tok.col)
        elif self.current_token().type != 'SEMI':
            init = self.parse_expression()
            self.expect('SEMI', "after for loop initializer")
        else:
            self.expect('SEMI')

        # Condition
        condition = None
        if self.current_token().type != 'SEMI':
            condition = self.parse_expression()
        self.expect('SEMI', "after for loop condition")

        # Post / Update
        post = None
        if self.current_token().type != 'RPAREN':
            post = self.parse_expression()
        self.expect('RPAREN', "after for loop header")

        body = self.parse_statement()
        return ForStmt(init, condition, post, body, line=start_tok.line, col=start_tok.col)

    def parse_do_while_statement(self) -> DoWhileStmt:
        start_tok = self.expect('DO')
        body = self.parse_statement()
        self.expect('WHILE', "after 'do' body")
        self.expect('LPAREN', "after 'while'")
        condition = self.parse_expression()
        self.expect('RPAREN', "after do-while condition")
        self.expect('SEMI', "after do-while statement")
        return DoWhileStmt(body, condition, line=start_tok.line, col=start_tok.col)

    # Expression parsing with standard C operator precedence
    def parse_expression(self) -> ASTNode:
        return self.parse_assignment()

    def parse_assignment(self) -> ASTNode:
        expr = self.parse_logical_or()
        tok = self.current_token()
        if tok.type in ('ASSIGN', 'ADD_ASSIGN', 'SUB_ASSIGN', 'MUL_ASSIGN', 'DIV_ASSIGN', 'MOD_ASSIGN'):
            op_tok = self.advance()
            if not isinstance(expr, Identifier):
                raise ParserError(f"Invalid left-hand side of assignment '{tok.value}' (must be a variable)", expr.line, expr.col)
            val_expr = self.parse_assignment()

            # Desugar compound assignments like += into x = x + val
            if op_tok.type == 'ASSIGN':
                return Assignment(expr.name, val_expr, "=", line=op_tok.line, col=op_tok.col)
            else:
                bin_op = {
                    'ADD_ASSIGN': '+', 'SUB_ASSIGN': '-', 'MUL_ASSIGN': '*', 'DIV_ASSIGN': '/', 'MOD_ASSIGN': '%'
                }[op_tok.type]
                expanded_val = BinaryOp(expr, bin_op, val_expr, line=op_tok.line, col=op_tok.col)
                return Assignment(expr.name, expanded_val, "=", line=op_tok.line, col=op_tok.col)
        return expr

    def parse_logical_or(self) -> ASTNode:
        expr = self.parse_logical_and()
        while self.current_token().type == 'OR':
            op_tok = self.advance()
            right = self.parse_logical_and()
            expr = BinaryOp(expr, op_tok.value, right, line=op_tok.line, col=op_tok.col)
        return expr

    def parse_logical_and(self) -> ASTNode:
        expr = self.parse_equality()
        while self.current_token().type == 'AND':
            op_tok = self.advance()
            right = self.parse_equality()
            expr = BinaryOp(expr, op_tok.value, right, line=op_tok.line, col=op_tok.col)
        return expr

    def parse_equality(self) -> ASTNode:
        expr = self.parse_relational()
        while self.current_token().type in ('EQ', 'NE'):
            op_tok = self.advance()
            right = self.parse_relational()
            expr = BinaryOp(expr, op_tok.value, right, line=op_tok.line, col=op_tok.col)
        return expr

    def parse_relational(self) -> ASTNode:
        expr = self.parse_additive()
        while self.current_token().type in ('LT', 'LE', 'GT', 'GE'):
            op_tok = self.advance()
            right = self.parse_additive()
            expr = BinaryOp(expr, op_tok.value, right, line=op_tok.line, col=op_tok.col)
        return expr

    def parse_additive(self) -> ASTNode:
        expr = self.parse_multiplicative()
        while self.current_token().type in ('PLUS', 'MINUS'):
            op_tok = self.advance()
            right = self.parse_multiplicative()
            expr = BinaryOp(expr, op_tok.value, right, line=op_tok.line, col=op_tok.col)
        return expr

    def parse_multiplicative(self) -> ASTNode:
        expr = self.parse_unary()
        while self.current_token().type in ('MUL', 'DIV', 'MOD'):
            op_tok = self.advance()
            right = self.parse_unary()
            expr = BinaryOp(expr, op_tok.value, right, line=op_tok.line, col=op_tok.col)
        return expr

    def parse_unary(self) -> ASTNode:
        tok = self.current_token()
        if tok.type in ('NOT', 'MINUS', 'PLUS'):
            op_tok = self.advance()
            operand = self.parse_unary()
            return UnaryOp(op_tok.value, operand, is_prefix=True, line=op_tok.line, col=op_tok.col)
        elif tok.type in ('INC', 'DEC'):
            op_tok = self.advance()
            operand = self.parse_primary()
            if not isinstance(operand, Identifier):
                raise ParserError(f"Operand of '{op_tok.value}' must be a variable", op_tok.line, op_tok.col)
            # Desugar prefix ++x into assignment x = x + 1
            op_char = '+' if op_tok.type == 'INC' else '-'
            return Assignment(operand.name, BinaryOp(operand, op_char, Constant(1, operand.line, operand.col), line=op_tok.line, col=op_tok.col), line=op_tok.line, col=op_tok.col)
        return self.parse_postfix()

    def parse_postfix(self) -> ASTNode:
        expr = self.parse_primary()
        tok = self.current_token()
        if tok.type in ('INC', 'DEC'):
            op_tok = self.advance()
            if not isinstance(expr, Identifier):
                raise ParserError(f"Operand of '{op_tok.value}' must be a variable", op_tok.line, op_tok.col)
            # Postfix x++: returns assignment for CFG purposes
            op_char = '+' if op_tok.type == 'INC' else '-'
            return Assignment(expr.name, BinaryOp(expr, op_char, Constant(1, expr.line, expr.col), line=op_tok.line, col=op_tok.col), line=op_tok.line, col=op_tok.col)
        return expr

    def parse_primary(self) -> ASTNode:
        tok = self.current_token()
        if tok.type == 'NUMBER':
            self.advance()
            val = float(tok.value) if '.' in tok.value else int(tok.value)
            return Constant(val, line=tok.line, col=tok.col)
        elif tok.type == 'IDENT':
            self.advance()
            return Identifier(tok.value, line=tok.line, col=tok.col)
        elif tok.type == 'LPAREN':
            self.advance()
            expr = self.parse_expression()
            self.expect('RPAREN', "to match '('")
            return expr
        else:
            raise ParserError(f"Expected expression, got '{tok.value}'", tok.line, tok.col)
