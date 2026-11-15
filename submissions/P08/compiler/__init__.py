"""TensorDSLCompiler: a small compiler for a tensor expression DSL.

This module only defines the exception hierarchy so that every other module
can import the error classes without creating circular imports.
"""
from __future__ import annotations


class DSLCompileError(Exception):
    """Base class for every error raised by the compiler pipeline."""

    stage = "compile"

    def __init__(self, message, line=None, col=None, filename=None):
        super().__init__(message)
        self.message = message
        self.line = line
        self.col = col
        self.filename = filename

    def __str__(self):
        text = f"{self.stage} error"
        if self.line is not None:
            text += f" at line {self.line}"
            if self.col is not None:
                text += f", column {self.col}"
        text += f": {self.message}"
        if self.filename:
            text = f"{self.filename}: {text}"
        return text


class LexError(DSLCompileError):
    stage = "lexical"


class ParseError(DSLCompileError):
    stage = "syntax"


class SemanticError(DSLCompileError):
    stage = "semantic"


class OptimizationError(DSLCompileError):
    stage = "optimization"


class CodegenError(DSLCompileError):
    stage = "code generation"


class ExecutionError(DSLCompileError):
    stage = "runtime"
