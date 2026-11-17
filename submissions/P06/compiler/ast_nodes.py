from dataclasses import dataclass

@dataclass
class Number:
    value: float

@dataclass
class Unary:
    operator: str
    operand: object

@dataclass
class Binary:
    operator: str
    left: object
    right: object
