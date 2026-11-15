import pytest
from compiler.lexer import Lexer
from compiler.parser import Parser
from compiler.basic_blocks import TACGenerator, BasicBlockBuilder
from compiler.cfg import CFGBuilder

def test_cfg_construction_and_loop_back_edge():
    code = """
    int i = 0;
    int sum = 0;
    while (i < 10) {
        sum = sum + i;
        i++;
    }
    return sum;
    """
    tokens = Lexer(code).tokenize()
    ast = Parser(tokens).parse_program()
    gen = TACGenerator()
    instrs = gen.generate_program(ast)
    bb_builder = BasicBlockBuilder(instrs)
    bb_builder.partition_blocks()

    cfg_builder = CFGBuilder(bb_builder)
    cfg = cfg_builder.build()

    assert len(cfg.blocks) >= 4
    # Check that a back-edge exists (for the loop)
    back_edges = [e for e in cfg.edges if e.type == "back_edge"]
    assert len(back_edges) >= 1

    # Check edges start from ENTRY and reach EXIT
    assert any(e.source == "ENTRY" for e in cfg.edges)
    assert any(e.target == "EXIT" for e in cfg.edges)
