import unittest
from compiler.lexer import tokenize
from compiler.parser import Parser
from compiler.ir import generate_ir

class IRTests(unittest.TestCase):
    def test_ir_has_result(self):
        tree = Parser(tokenize("2 + 3")).parse()
        self.assertIn("result =", generate_ir(tree))
