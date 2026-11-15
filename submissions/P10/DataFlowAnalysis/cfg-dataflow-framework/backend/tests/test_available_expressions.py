import pytest
from compiler.lexer import Lexer
from compiler.parser import Parser
from compiler.basic_blocks import TACGenerator, BasicBlockBuilder
from compiler.cfg import CFGBuilder
from compiler.dataflow.available_expressions import AvailableExpressions

def test_available_expressions_analysis():
    code = """
    int a = 2;
    int b = 3;
    int x = a + b;
    int y = a + b;
    return x + y;
    """
    tokens = Lexer(code).tokenize()
    ast = Parser(tokens).parse_program()
    gen = TACGenerator()
    instrs = gen.generate_program(ast)
    bb_builder = BasicBlockBuilder(instrs)
    bb_builder.partition_blocks()
    cfg = CFGBuilder(bb_builder).build()

    ae = AvailableExpressions(cfg)
    result = ae.run()

    assert result["analysis_type"] == "Available Expressions"
    assert result["meet_operator"] == "∩ (Intersection)"
    assert len(result["universal_set"]) >= 1

    # Should detect common subexpression
    cses = [d for d in result["diagnostics"] if d["type"] == "cse_opportunity"]
    assert len(cses) >= 1
