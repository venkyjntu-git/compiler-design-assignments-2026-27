import pytest
from compiler.lexer import Lexer
from compiler.parser import Parser
from compiler.basic_blocks import TACGenerator, BasicBlockBuilder

def test_basic_blocks_partition():
    code = """
    int x = 1;
    int y = 2;
    if (x < y) {
        x = x + 1;
    } else {
        y = y + 1;
    }
    return x + y;
    """
    tokens = Lexer(code).tokenize()
    ast = Parser(tokens).parse_program()
    gen = TACGenerator()
    instrs = gen.generate_program(ast)
    builder = BasicBlockBuilder(instrs)
    blocks = builder.partition_blocks()

    # Must contain ENTRY and EXIT
    assert blocks[0].is_entry
    assert blocks[-1].is_exit

    # Leaders should be properly detected
    assert len(builder.leaders) >= 3
    # Check that each block has instructions (except entry/exit)
    user_blocks = [b for b in blocks if not b.is_entry and not b.is_exit]
    assert len(user_blocks) >= 3
