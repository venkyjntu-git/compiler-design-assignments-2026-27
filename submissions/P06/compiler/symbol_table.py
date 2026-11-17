class SymbolTable:
    """Simple symbol table for storing identifier attributes."""
    def __init__(self):
        self._symbols = {}

    def define(self, name, value):
        self._symbols[name] = value

    def lookup(self, name):
        if name not in self._symbols:
            raise NameError(f"Undefined identifier: {name}")
        return self._symbols[name]

    def contains(self, name):
        return name in self._symbols
