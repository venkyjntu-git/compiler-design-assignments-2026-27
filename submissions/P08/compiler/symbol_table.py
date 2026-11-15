"""Symbol table: tensor names, shapes, ranks and assignment status."""
from __future__ import annotations

from dataclasses import dataclass

from compiler import SemanticError


@dataclass(frozen=True)
class TensorSymbol:
    name: str
    shape: tuple
    line: int = 0
    col: int = 0

    @property
    def rank(self) -> int:
        return len(self.shape)

    @property
    def size(self) -> int:
        total = 1
        for d in self.shape:
            total *= d
        return total


class SymbolTable:
    def __init__(self):
        self._symbols: dict[str, TensorSymbol] = {}
        self._assigned: dict[str, int] = {}

    def declare(self, name, shape, line=0, col=0) -> TensorSymbol:
        if name in self._symbols:
            first = self._symbols[name]
            raise SemanticError(
                f"tensor '{name}' is already declared (first declared on line {first.line})",
                line, col)
        symbol = TensorSymbol(name, tuple(shape), line, col)
        self._symbols[name] = symbol
        return symbol

    def lookup(self, name):
        return self._symbols.get(name)

    def get(self, name) -> TensorSymbol:
        symbol = self._symbols.get(name)
        if symbol is None:
            raise SemanticError(f"tensor '{name}' is not declared")
        return symbol

    def __contains__(self, name) -> bool:
        return name in self._symbols

    def mark_assigned(self, name, line=0):
        self._assigned[name] = line

    def is_assigned(self, name) -> bool:
        return name in self._assigned

    def assigned_line(self, name) -> int:
        return self._assigned.get(name, 0)

    def all(self) -> list[TensorSymbol]:
        return list(self._symbols.values())

    def inputs(self) -> list[TensorSymbol]:
        return [s for s in self._symbols.values() if s.name not in self._assigned]

    def outputs(self) -> list[TensorSymbol]:
        return [s for s in self._symbols.values() if s.name in self._assigned]
