"""Lexer for the Tensor Expression DSL.

Every statement lives on one line. ``#`` starts a comment that runs to the end
of the line. Tokens carry 1-based line and column numbers.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any

from compiler import LexError

NUMBER_RE = re.compile(r"[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?")
IDENT_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
WORD_RE = re.compile(r"[A-Za-z0-9_.]+")

KEYWORDS = {"tensor": "TENSOR", "sum": "SUM"}
SYMBOLS = {
    "+": "PLUS",
    "-": "MINUS",
    "*": "STAR",
    "=": "EQUALS",
    "[": "LBRACKET",
    "]": "RBRACKET",
    "(": "LPAREN",
    ")": "RPAREN",
    ",": "COMMA",
}
UNSUPPORTED_OPERATORS = "/%^&|<>!~@"
ASCII_DIGITS = "0123456789"


@dataclass(frozen=True)
class Token:
    kind: str
    text: str
    line: int
    col: int
    value: Any = None


def tokenize(source: str) -> list[Token]:
    """Convert DSL source text into a list of tokens ending with EOF."""
    tokens: list[Token] = []
    lines = source.splitlines()
    for line_no, line in enumerate(lines, start=1):
        pos, n = 0, len(line)
        while pos < n:
            ch = line[pos]
            col = pos + 1
            if ch in " \t\r\f\v":
                pos += 1
                continue
            if ch == "#":
                break
            if ch in ASCII_DIGITS:
                match = NUMBER_RE.match(line, pos)
                end = match.end()
                if end < n and (line[end].isalnum() or line[end] in "_."):
                    word = WORD_RE.match(line, pos).group()
                    raise LexError(f"malformed number '{word}'", line_no, col)
                text = match.group()
                try:
                    value = float(text) if re.search(r"[.eE]", text) else int(text)
                except ValueError:
                    raise LexError(f"number '{text[:20]}...' is too large", line_no, col)
                if isinstance(value, float) and not math.isfinite(value):
                    raise LexError(f"number '{text}' is out of range", line_no, col)
                tokens.append(Token("NUMBER", text, line_no, col, value))
                pos = end
                continue
            if ch.isascii() and (ch.isalpha() or ch == "_"):
                text = IDENT_RE.match(line, pos).group()
                tokens.append(Token(KEYWORDS.get(text, "IDENT"), text, line_no, col))
                pos += len(text)
                continue
            if ch in SYMBOLS:
                tokens.append(Token(SYMBOLS[ch], ch, line_no, col))
                pos += 1
                continue
            if ch in UNSUPPORTED_OPERATORS:
                raise LexError(
                    f"unsupported operator '{ch}' (supported: + - * and sum(...))",
                    line_no, col)
            if ch == ".":
                raise LexError("invalid character '.' (numbers must start with a digit)",
                               line_no, col)
            raise LexError(f"invalid character {ch!r}", line_no, col)
        if tokens and tokens[-1].kind != "NEWLINE":
            tokens.append(Token("NEWLINE", "\\n", line_no, n + 1))
    tokens.append(Token("EOF", "", len(lines) + 1, 1))
    return tokens
