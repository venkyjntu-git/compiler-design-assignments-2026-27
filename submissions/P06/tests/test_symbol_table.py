import unittest
from compiler.symbol_table import SymbolTable

class SymbolTableTests(unittest.TestCase):
    def test_define_and_lookup(self):
        table = SymbolTable()
        table.define("x", 10)
        self.assertEqual(table.lookup("x"), 10)

    def test_unknown_name(self):
        with self.assertRaises(NameError):
            SymbolTable().lookup("missing")
