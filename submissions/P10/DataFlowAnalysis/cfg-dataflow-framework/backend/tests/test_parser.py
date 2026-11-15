import pytest
from compiler.lexer import Lexer
from compiler.parser import Parser, ParserError
from compiler.ast_nodes import Program, FunctionDef, IfStmt, WhileStmt, ForStmt, VarDecl

def test_parse_simple_assignment():
    code = "int x = 10; x = x + 5;"
    tokens = Lexer(code).tokenize()
    ast = Parser(tokens).parse_program()
    assert isinstance(ast, Program)
    assert len(ast.declarations) == 1
    main_fn = ast.declarations[0]
    assert isinstance(main_fn, FunctionDef)
    assert len(main_fn.body.statements) == 2

def test_parse_if_else():
    code = """
    int main() {
        int x = 5;
        if (x > 0) {
            x = x + 1;
        } else {
            x = 0;
        }
        return x;
    }
    """
    tokens = Lexer(code).tokenize()
    ast = Parser(tokens).parse_program()
    assert len(ast.declarations) == 1
    stmts = ast.declarations[0].body.statements
    assert isinstance(stmts[1], IfStmt)
    assert stmts[1].else_branch is not None

def test_parse_while_and_for():
    code = """
    int x = 0;
    while (x < 10) {
        x++;
    }
    for (int i = 0; i < 5; i++) {
        x += i;
    }
    """
    tokens = Lexer(code).tokenize()
    ast = Parser(tokens).parse_program()
    stmts = ast.declarations[0].body.statements
    assert isinstance(stmts[1], WhileStmt)
    assert isinstance(stmts[2], ForStmt)

def test_parse_syntax_error():
    code = "int x = ;"
    tokens = Lexer(code).tokenize()
    with pytest.raises(ParserError):
        Parser(tokens).parse_program()
