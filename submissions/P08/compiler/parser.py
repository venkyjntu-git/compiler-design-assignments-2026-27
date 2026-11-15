"""Recursive-descent parser. The grammar is documented in docs/grammar.md."""
from __future__ import annotations

from compiler import ParseError
from compiler.ast_nodes import (Assignment, BinaryOperation, Number, Program,
                                SumExpression, TensorAccess, TensorDeclaration)
from compiler.lexer import Token, tokenize


def describe(tok: Token) -> str:
    if tok.kind == "NEWLINE":
        return "end of line"
    if tok.kind == "EOF":
        return "end of input"
    return f"'{tok.text}'"


class Parser:
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos = 0

    @property
    def tok(self) -> Token:
        return self.tokens[self.pos]

    def peek(self, offset: int = 1) -> Token:
        return self.tokens[min(self.pos + offset, len(self.tokens) - 1)]

    def advance(self) -> Token:
        tok = self.tok
        if tok.kind != "EOF":
            self.pos += 1
        return tok

    def error(self, message: str, tok: Token | None = None):
        tok = tok or self.tok
        raise ParseError(message, tok.line, tok.col)

    def expect(self, kind: str, what: str) -> Token:
        if self.tok.kind != kind:
            self.error(f"expected {what} but found {describe(self.tok)}")
        return self.advance()

    # program := { statement NEWLINE }
    def parse_program(self) -> Program:
        statements = []
        while True:
            while self.tok.kind == "NEWLINE":
                self.advance()
            if self.tok.kind == "EOF":
                break
            statements.append(self.parse_statement())
            if self.tok.kind not in ("NEWLINE", "EOF"):
                self.error(f"unexpected {describe(self.tok)}; expected end of line")
        return Program(statements)

    def parse_statement(self):
        if self.tok.kind == "TENSOR":
            return self.parse_declaration()
        if self.tok.kind == "IDENT":
            return self.parse_assignment()
        self.error("expected a 'tensor' declaration or an assignment "
                   f"but found {describe(self.tok)}")

    # declaration := 'tensor' IDENT '[' INT { ',' INT } ']'
    def parse_declaration(self) -> TensorDeclaration:
        kw = self.advance()
        name = self.expect("IDENT", "a tensor name")
        self.expect("LBRACKET", "'[' after the tensor name")
        shape = [self.parse_int("tensor dimension", 1)]
        while self.tok.kind == "COMMA":
            self.advance()
            shape.append(self.parse_int("tensor dimension", 1))
        self.expect("RBRACKET", "',' or ']'")
        return TensorDeclaration(name.text, shape, kw.line, kw.col)

    def parse_int(self, what: str, minimum: int) -> int:
        tok = self.tok
        if tok.kind != "NUMBER":
            self.error(f"expected an integer {what} but found {describe(tok)}")
        if not isinstance(tok.value, int):
            self.error(f"{what} must be an integer literal, found {tok.text}")
        if tok.value < minimum:
            self.error(f"{what} must be at least {minimum}, found {tok.text}")
        self.advance()
        return tok.value

    # assignment := access '=' expr
    def parse_assignment(self) -> Assignment:
        target = self.parse_access()
        eq = self.expect("EQUALS", "'=' after the assignment target")
        value = self.parse_expr()
        return Assignment(target, value, eq.line, eq.col)

    # access := IDENT '[' IDENT { ',' IDENT } ']'
    def parse_access(self) -> TensorAccess:
        name = self.expect("IDENT", "a tensor name")
        self.expect("LBRACKET", f"'[' after '{name.text}'")
        indices = [self.parse_index()]
        while self.tok.kind == "COMMA":
            self.advance()
            indices.append(self.parse_index())
        self.expect("RBRACKET", "',' or ']'")
        return TensorAccess(name.text, indices, name.line, name.col)

    def parse_index(self) -> str:
        if self.tok.kind == "NUMBER":
            self.error("an index must be a variable name; constant indices are not "
                       f"supported (found {self.tok.text})")
        return self.expect("IDENT", "an index variable name").text

    # expr := term { ('+' | '-') term }
    def parse_expr(self):
        left = self.parse_term()
        while self.tok.kind in ("PLUS", "MINUS"):
            op = self.advance()
            right = self.parse_term()
            left = BinaryOperation(op.text, left, right, op.line, op.col)
        return left

    # term := factor { '*' factor }
    def parse_term(self):
        left = self.parse_factor()
        while self.tok.kind == "STAR":
            op = self.advance()
            right = self.parse_factor()
            left = BinaryOperation("*", left, right, op.line, op.col)
        return left

    # factor := NUMBER | access | sum | '(' expr ')'
    def parse_factor(self):
        tok = self.tok
        if tok.kind == "NUMBER":
            self.advance()
            return Number(tok.value, tok.line, tok.col)
        if tok.kind == "IDENT":
            if self.peek().kind != "LBRACKET":
                self.error(f"tensor '{tok.text}' must be indexed, e.g. {tok.text}[i, j] "
                           "(scalar variables are not supported)")
            return self.parse_access()
        if tok.kind == "SUM":
            return self.parse_sum()
        if tok.kind == "LPAREN":
            self.advance()
            inner = self.parse_expr()
            self.expect("RPAREN", "')'")
            return inner
        if tok.kind in ("PLUS", "MINUS"):
            self.error(f"unary '{tok.text}' is not supported; scalar constants must be "
                       "positive (use binary subtraction instead)")
        self.error(f"expected an expression but found {describe(tok)}")

    # sum := 'sum' '(' expr ',' IDENT ',' INT ',' INT ')'
    def parse_sum(self) -> SumExpression:
        kw = self.advance()
        self.expect("LPAREN", "'(' after 'sum'")
        body = self.parse_expr()
        self.expect("COMMA", "',' after the summation body")
        var = self.expect("IDENT", "a summation variable name")
        self.expect("COMMA", "',' after the summation variable")
        lower = self.parse_int("summation lower bound", 0)
        self.expect("COMMA", "',' after the lower bound")
        upper = self.parse_int("summation upper bound", 0)
        self.expect("RPAREN", "')' to close sum(...)")
        return SumExpression(body, var.text, lower, upper, kw.line, kw.col)


def parse(source: str) -> Program:
    """Parse DSL source text into a Program AST."""
    return Parser(tokenize(source)).parse_program()
