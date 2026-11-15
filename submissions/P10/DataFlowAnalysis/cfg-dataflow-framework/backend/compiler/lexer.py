import re
from typing import List, Optional

class Token:
    def __init__(self, type_: str, value: str, line: int, col: int):
        self.type = type_
        self.value = value
        self.line = line
        self.col = col

    def __repr__(self):
        return f"Token({self.type}, {repr(self.value)}, L{self.line}:C{self.col})"

class LexerError(Exception):
    def __init__(self, message: str, line: int, col: int):
        super().__init__(f"Lexer Error at line {line}, col {col}: {message}")
        self.message = message
        self.line = line
        self.col = col

KEYWORDS = {
    'int': 'INT',
    'void': 'VOID',
    'if': 'IF',
    'else': 'ELSE',
    'while': 'WHILE',
    'for': 'FOR',
    'do': 'DO',
    'break': 'BREAK',
    'continue': 'CONTINUE',
    'return': 'RETURN',
}

UNSUPPORTED_KEYWORDS = {
    'float': 'floating-point types',
    'double': 'floating-point types',
    'char': 'character types',
    'long': 'long types',
    'short': 'short types',
    'unsigned': 'unsigned specifiers',
    'struct': 'struct definitions',
    'union': 'union definitions',
    'enum': 'enum definitions',
    'typedef': 'typedef declarations',
    'switch': 'switch-case statements',
    'case': 'switch-case statements',
    'goto': 'direct goto statements (use while/for/if constructs)',
    'sizeof': 'sizeof operator',
    'const': 'const qualifiers',
    'static': 'static qualifiers'
}

class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.length = len(source)
        self.pos = 0
        self.line = 1
        self.col = 1

    def peek(self, offset: int = 0) -> Optional[str]:
        idx = self.pos + offset
        if idx < self.length:
            return self.source[idx]
        return None

    def advance(self) -> str:
        ch = self.source[self.pos]
        self.pos += 1
        if ch == '\n':
            self.line += 1
            self.col = 1
        else:
            self.col += 1
        return ch

    def match(self, expected: str) -> bool:
        if self.peek() == expected:
            self.advance()
            return True
        return False

    def skip_whitespace_and_comments(self):
        while self.pos < self.length:
            ch = self.peek()
            # Whitespace
            if ch in (' ', '\t', '\r', '\n'):
                self.advance()
            # Single-line comment: //
            elif ch == '/' and self.peek(1) == '/':
                self.advance()
                self.advance()
                while self.pos < self.length and self.peek() != '\n':
                    self.advance()
            # Multi-line comment: /* ... */
            elif ch == '/' and self.peek(1) == '*':
                start_line, start_col = self.line, self.col
                self.advance()
                self.advance()
                closed = False
                while self.pos < self.length:
                    if self.peek() == '*' and self.peek(1) == '/':
                        self.advance()
                        self.advance()
                        closed = True
                        break
                    self.advance()
                if not closed:
                    raise LexerError("Unterminated multi-line comment '/*'", start_line, start_col)
            else:
                break

    def tokenize(self) -> List[Token]:
        tokens = []
        while self.pos < self.length:
            self.skip_whitespace_and_comments()
            if self.pos >= self.length:
                break

            start_line, start_col = self.line, self.col
            ch = self.peek()

            # Multi-character & single-character operators
            if ch == '=':
                self.advance()
                if self.match('='):
                    tokens.append(Token('EQ', '==', start_line, start_col))
                else:
                    tokens.append(Token('ASSIGN', '=', start_line, start_col))
            elif ch == '!':
                self.advance()
                if self.match('='):
                    tokens.append(Token('NE', '!=', start_line, start_col))
                else:
                    tokens.append(Token('NOT', '!', start_line, start_col))
            elif ch == '<':
                self.advance()
                if self.match('='):
                    tokens.append(Token('LE', '<=', start_line, start_col))
                else:
                    tokens.append(Token('LT', '<', start_line, start_col))
            elif ch == '>':
                self.advance()
                if self.match('='):
                    tokens.append(Token('GE', '>=', start_line, start_col))
                else:
                    tokens.append(Token('GT', '>', start_line, start_col))
            elif ch == '&':
                self.advance()
                if self.match('&'):
                    tokens.append(Token('AND', '&&', start_line, start_col))
                else:
                    tokens.append(Token('BIT_AND', '&', start_line, start_col))
            elif ch == '|':
                self.advance()
                if self.match('|'):
                    tokens.append(Token('OR', '||', start_line, start_col))
                else:
                    tokens.append(Token('BIT_OR', '|', start_line, start_col))
            elif ch == '+':
                self.advance()
                if self.match('+'):
                    tokens.append(Token('INC', '++', start_line, start_col))
                elif self.match('='):
                    tokens.append(Token('ADD_ASSIGN', '+=', start_line, start_col))
                else:
                    tokens.append(Token('PLUS', '+', start_line, start_col))
            elif ch == '-':
                self.advance()
                if self.match('-'):
                    tokens.append(Token('DEC', '--', start_line, start_col))
                elif self.match('='):
                    tokens.append(Token('SUB_ASSIGN', '-=', start_line, start_col))
                else:
                    tokens.append(Token('MINUS', '-', start_line, start_col))
            elif ch == '*':
                self.advance()
                if self.match('='):
                    tokens.append(Token('MUL_ASSIGN', '*=', start_line, start_col))
                else:
                    tokens.append(Token('MUL', '*', start_line, start_col))
            elif ch == '/':
                self.advance()
                if self.match('='):
                    tokens.append(Token('DIV_ASSIGN', '/=', start_line, start_col))
                else:
                    tokens.append(Token('DIV', '/', start_line, start_col))
            elif ch == '%':
                self.advance()
                if self.match('='):
                    tokens.append(Token('MOD_ASSIGN', '%=', start_line, start_col))
                else:
                    tokens.append(Token('MOD', '%', start_line, start_col))
            elif ch == ';':
                self.advance()
                tokens.append(Token('SEMI', ';', start_line, start_col))
            elif ch == ',':
                self.advance()
                tokens.append(Token('COMMA', ',', start_line, start_col))
            elif ch == '(':
                self.advance()
                tokens.append(Token('LPAREN', '(', start_line, start_col))
            elif ch == ')':
                self.advance()
                tokens.append(Token('RPAREN', ')', start_line, start_col))
            elif ch == '{':
                self.advance()
                tokens.append(Token('LBRACE', '{', start_line, start_col))
            elif ch == '}':
                self.advance()
                tokens.append(Token('RBRACE', '}', start_line, start_col))
            elif ch == '[':
                self.advance()
                tokens.append(Token('LBRACKET', '[', start_line, start_col))
            elif ch == ']':
                self.advance()
                tokens.append(Token('RBRACKET', ']', start_line, start_col))

            # Number literal (integers and floats)
            elif ch.isdigit():
                num_str = ''
                while self.pos < self.length and self.peek() is not None and self.peek().isdigit():
                    num_str += self.advance()
                if self.peek() == '.' and self.peek(1) is not None and self.peek(1).isdigit():
                    num_str += self.advance() # consume '.'
                    while self.pos < self.length and self.peek() is not None and self.peek().isdigit():
                        num_str += self.advance()
                tokens.append(Token('NUMBER', num_str, start_line, start_col))

            # Identifiers and keywords
            elif ch.isalpha() or ch == '_':
                ident_str = ''
                while self.pos < self.length and (self.peek().isalnum() or self.peek() == '_'):
                    ident_str += self.advance()

                if ident_str in UNSUPPORTED_KEYWORDS:
                    feat = UNSUPPORTED_KEYWORDS[ident_str]
                    raise LexerError(f"Unsupported C construct '{ident_str}': {feat} are not supported in this C subset.", start_line, start_col)

                if ident_str in KEYWORDS:
                    tokens.append(Token(KEYWORDS[ident_str], ident_str, start_line, start_col))
                else:
                    tokens.append(Token('IDENT', ident_str, start_line, start_col))

            else:
                illegal_char = self.advance()
                raise LexerError(f"Unrecognized character '{illegal_char}'", start_line, start_col)

        tokens.append(Token('EOF', '', self.line, self.col))
        return tokens
