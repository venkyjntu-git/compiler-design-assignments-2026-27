import re
from dataclasses import dataclass

@dataclass(frozen=True)
class Token:
    kind: str
    value: str
    position: int

_TOKEN_RE = re.compile(r"\s*(?:(\d+(?:\.\d+)?)|([()+\-*/])|(.))")

def tokenize(source: str):
    tokens = []
    pos = 0
    while pos < len(source):
        match = _TOKEN_RE.match(source, pos)
        if not match:
            break
        number, operator, invalid = match.groups()
        start = pos
        pos = match.end()
        if number:
            tokens.append(Token("NUMBER", number, start))
        elif operator:
            tokens.append(Token(operator, operator, start))
        elif invalid and not invalid.isspace():
            raise SyntaxError(f"Unexpected character {invalid!r} at position {start}")
    tokens.append(Token("EOF", "", len(source)))
    return tokens
