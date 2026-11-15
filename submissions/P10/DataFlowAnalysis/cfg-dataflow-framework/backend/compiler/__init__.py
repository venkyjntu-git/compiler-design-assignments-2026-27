"""Compiler package for CFG and Dataflow Analysis."""
from compiler.lexer import Lexer, Token, LexerError
from compiler.parser import Parser, ParserError
from compiler.validation import ASTValidator, ValidationError
from compiler.basic_blocks import TACGenerator, BasicBlockBuilder, BasicBlock, IRInstruction
from compiler.cfg import CFGBuilder, CFG, CFGEdge

__all__ = [
    "Lexer", "Token", "LexerError",
    "Parser", "ParserError",
    "ASTValidator", "ValidationError",
    "TACGenerator", "BasicBlockBuilder", "BasicBlock", "IRInstruction",
    "CFGBuilder", "CFG", "CFGEdge"
]
