from compiler.ast_nodes import Number, Unary, Binary

class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.index = 0

    def current(self):
        return self.tokens[self.index]

    def eat(self, kind):
        token = self.current()
        if token.kind != kind:
            raise SyntaxError(
                f"Expected {kind}, found {token.kind} at position {token.position}"
            )
        self.index += 1
        return token

    def parse(self):
        node = self.expression()
        self.eat("EOF")
        return node

    def expression(self):
        node = self.term()
        while self.current().kind in ("+", "-"):
            op = self.current().kind
            self.eat(op)
            node = Binary(op, node, self.term())
        return node

    def term(self):
        node = self.factor()
        while self.current().kind in ("*", "/"):
            op = self.current().kind
            self.eat(op)
            node = Binary(op, node, self.factor())
        return node

    def factor(self):
        token = self.current()
        if token.kind == "NUMBER":
            self.eat("NUMBER")
            return Number(float(token.value))
        if token.kind == "-":
            self.eat("-")
            return Unary("-", self.factor())
        if token.kind == "(":
            self.eat("(")
            node = self.expression()
            self.eat(")")
            return node
        raise SyntaxError(f"Unexpected token {token.kind} at position {token.position}")
