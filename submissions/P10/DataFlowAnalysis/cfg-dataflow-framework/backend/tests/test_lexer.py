import pytest
from compiler.lexer import Lexer, LexerError

def test_lexer_basic_tokens():
    code = "int x = 42; while (x > 0) { x--; }"
    lexer = Lexer(code)
    tokens = lexer.tokenize()
    types = [t.type for t in tokens]
    assert types == [
        'INT', 'IDENT', 'ASSIGN', 'NUMBER', 'SEMI',
        'WHILE', 'LPAREN', 'IDENT', 'GT', 'NUMBER', 'RPAREN',
        'LBRACE', 'IDENT', 'DEC', 'SEMI', 'RBRACE', 'EOF'
    ]

def test_lexer_comments():
    code = """
    // Single line comment
    int a = 1;
    /* Multi line
       comment */
    int b = 2;
    """
    lexer = Lexer(code)
    tokens = [t for t in lexer.tokenize() if t.type != 'EOF']
    assert len(tokens) == 10

def test_lexer_unsupported_construct():
    code = "float f = 3.14;"
    lexer = Lexer(code)
    with pytest.raises(LexerError) as exc_info:
        lexer.tokenize()
    assert "Unsupported C construct 'float'" in str(exc_info.value)

def test_lexer_operators():
    code = "a == b && c != d || x <= y + z * w"
    lexer = Lexer(code)
    tokens = [t.type for t in lexer.tokenize() if t.type != 'EOF']
    assert 'EQ' in tokens
    assert 'AND' in tokens
    assert 'NE' in tokens
    assert 'OR' in tokens
    assert 'LE' in tokens
