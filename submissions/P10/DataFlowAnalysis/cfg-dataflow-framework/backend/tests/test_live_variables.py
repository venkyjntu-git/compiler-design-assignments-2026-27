import pytest
from compiler.lexer import Lexer
from compiler.parser import Parser
from compiler.basic_blocks import TACGenerator, BasicBlockBuilder
from compiler.cfg import CFGBuilder
from compiler.dataflow.live_variables import LiveVariables

def test_live_variables_analysis():
    code = """
    int x = 5;
    int y = 10;
    int z = x + y;
    int dead = 999;
    return z;
    """
    tokens = Lexer(code).tokenize()
    ast = Parser(tokens).parse_program()
    gen = TACGenerator()
    instrs = gen.generate_program(ast)
    bb_builder = BasicBlockBuilder(instrs)
    bb_builder.partition_blocks()
    cfg = CFGBuilder(bb_builder).build()

    lv = LiveVariables(cfg)
    result = lv.run()

    assert result["analysis_type"] == "Live Variable Analysis"
    assert result["direction"] == "backward"
    assert "x" in result["universal_set"]
    assert "y" in result["universal_set"]

    # Detects dead assignment to 'dead'
    dead_assignments = [d for d in result["diagnostics"] if d["type"] == "dead_assignment"]
    assert any("dead" in d["message"] for d in dead_assignments)
