import ast
from pathlib import Path


def parse_source(source):
    """Parse Python source text into an AST."""
    return ast.parse(source)


def parse_file(path):
    """Read and parse a Python source file."""
    path = Path(path)
    source = path.read_text(encoding="utf-8")
    return source, parse_source(source)