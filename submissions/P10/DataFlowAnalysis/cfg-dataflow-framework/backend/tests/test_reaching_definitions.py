import pytest
from compiler.lexer import Lexer
from compiler.parser import Parser
from compiler.basic_blocks import TACGenerator, BasicBlockBuilder
from compiler.cfg import CFGBuilder
from compiler.dataflow.reaching_definitions import ReachingDefinitions

def test_reaching_definitions_analysis():
    code = """
    int a = 1;
    int b = 2;
    if (a > 0) {
        a = 10;
    } else {
        b = 20;
    }
    int c = a + b;
    return c;
    """
    tokens = Lexer(code).tokenize()
    ast = Parser(tokens).parse_program()
    gen = TACGenerator()
    instrs = gen.generate_program(ast)
    bb_builder = BasicBlockBuilder(instrs)
    bb_builder.partition_blocks()
    cfg = CFGBuilder(bb_builder).build()

    rd = ReachingDefinitions(cfg)
    result = rd.run()

    assert result["analysis_type"] == "Reaching Definitions"
    assert result["total_iterations"] >= 1
    assert len(result["steps"]) > 0
    # Definitions table exists
    assert len(result["definitions_table"]) >= 3
