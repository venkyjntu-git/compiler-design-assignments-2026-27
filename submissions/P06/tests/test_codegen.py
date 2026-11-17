import unittest
from compiler.lexer import tokenize
from compiler.parser import Parser
from compiler.codegen import generate_python

class CodegenTests(unittest.TestCase):
    def test_python_is_generated(self):
        tree = Parser(tokenize("2 * 3")).parse()
        code = generate_python(tree)
        self.assertIn("result =", code)
        self.assertIn("print(result)", code)
