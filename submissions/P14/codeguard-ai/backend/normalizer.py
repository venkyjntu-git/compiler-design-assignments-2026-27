"""
AST Normalization Module for CodeGuard AI
Implements configurable AST normalization to detect Type-2 and Type-3 code clones.
Provides identifier normalization, function name canonicalization, docstring stripping,
and commutative operation sorting.
"""

import ast
import copy
from typing import Dict, Any, List, Set, Tuple, Optional

# Standard built-ins that should never be renamed
BUILTIN_IDENTIFIERS: Set[str] = {
    "print", "len", "range", "enumerate", "zip", "map", "filter", "list", "dict",
    "set", "tuple", "int", "float", "str", "bool", "bytes", "sum", "min", "max",
    "abs", "all", "any", "sorted", "reversed", "round", "pow", "isinstance",
    "issubclass", "iter", "next", "open", "input", "id", "hash", "type", "repr",
    "self", "cls", "__init__", "__str__", "__repr__", "__len__", "__getitem__",
    "__name__", "__main__", "True", "False", "None"
}


class ASTNormalizer(ast.NodeTransformer):
    """
    Transforms an AST based on configurable normalization options.
    """

    def __init__(
        self,
        normalize_variables: bool = True,
        normalize_functions: bool = True,
        normalize_constants: bool = False,
        strip_docstrings: bool = True,
        sort_commutative_ops: bool = True
    ):
        self.normalize_variables = normalize_variables
        self.normalize_functions = normalize_functions
        self.normalize_constants = normalize_constants
        self.strip_docstrings = strip_docstrings
        self.sort_commutative_ops = sort_commutative_ops

        # Identifier mapping dictionaries
        self.var_map: Dict[str, str] = {}
        self.func_map: Dict[str, str] = {}
        self.param_map: Dict[str, str] = {}
        self.var_counter = 0
        self.func_counter = 0
        self.param_counter = 0

        # Discovered user functions (so calls to them can be renamed)
        self.user_functions: Set[str] = set()

        # Transformation log for educational transparency
        self.transformations_log: List[str] = []

    def _get_var_name(self, original: str) -> str:
        """Returns or creates a canonical name for a variable identifier."""
        if original in BUILTIN_IDENTIFIERS or original.startswith("__"):
            return original

        # If it was defined as a function, use function map
        if original in self.user_functions and self.normalize_functions:
            return self.func_map.get(original, original)

        if not self.normalize_variables:
            return original

        if original not in self.var_map:
            canonical = f"var_{self.var_counter}"
            self.var_counter += 1
            self.var_map[original] = canonical
            self.transformations_log.append(f"Normalized variable '{original}' -> '{canonical}'")
        return self.var_map[original]

    def _get_func_name(self, original: str) -> str:
        """Returns or creates a canonical name for a user function."""
        if original in BUILTIN_IDENTIFIERS or original.startswith("__"):
            return original

        if not self.normalize_functions:
            return original

        if original not in self.func_map:
            canonical = f"func_{self.func_counter}"
            self.func_counter += 1
            self.func_map[original] = canonical
            self.transformations_log.append(f"Normalized function '{original}' -> '{canonical}'")
        return self.func_map[original]

    def _get_param_name(self, original: str) -> str:
        """Returns or creates a canonical name for a function parameter."""
        if original in BUILTIN_IDENTIFIERS:
            return original

        if not self.normalize_functions:
            return original

        if original not in self.param_map:
            canonical = f"param_{self.param_counter}"
            self.param_counter += 1
            self.param_map[original] = canonical
            self.transformations_log.append(f"Normalized parameter '{original}' -> '{canonical}'")
        return self.param_map[original]

    def visit_Module(self, node: ast.Module) -> ast.Module:
        # Pre-pass: register user-defined function names first
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if item.name not in BUILTIN_IDENTIFIERS and not item.name.startswith("__"):
                    self.user_functions.add(item.name)
                    if self.normalize_functions:
                        self._get_func_name(item.name)

        # Optional docstring removal at module level
        new_body = []
        for i, stmt in enumerate(node.body):
            if self.strip_docstrings and i == 0 and isinstance(stmt, ast.Expr):
                if isinstance(stmt.value, ast.Constant) and isinstance(stmt.value.value, str):
                    self.transformations_log.append("Stripped module-level docstring")
                    continue
            new_body.append(self.visit(stmt))

        node.body = [s for s in new_body if s is not None]
        return node

    def visit_FunctionDef(self, node: ast.FunctionDef) -> ast.FunctionDef:
        if self.normalize_functions and node.name in self.user_functions:
            node.name = self._get_func_name(node.name)

        # Normalize arguments
        if self.normalize_functions:
            for arg in node.args.args:
                if arg.arg not in ("self", "cls"):
                    arg.arg = self._get_param_name(arg.arg)

        # Strip function docstring if present
        new_body = []
        for i, stmt in enumerate(node.body):
            if self.strip_docstrings and i == 0 and isinstance(stmt, ast.Expr):
                if isinstance(stmt.value, ast.Constant) and isinstance(stmt.value.value, str):
                    self.transformations_log.append("Stripped function-level docstring")
                    continue
            new_body.append(self.visit(stmt))

        node.body = [s for s in new_body if s is not None]
        return node

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> ast.AsyncFunctionDef:
        return self.visit_FunctionDef(node)  # type: ignore

    def visit_Name(self, node: ast.Name) -> ast.Name:
        if node.id in self.user_functions and self.normalize_functions:
            node.id = self.func_map.get(node.id, node.id)
        elif node.id in self.param_map and self.normalize_functions:
            node.id = self.param_map[node.id]
        elif self.normalize_variables:
            node.id = self._get_var_name(node.id)
        return node

    def visit_Call(self, node: ast.Call) -> ast.Call:
        # Visit func and arguments
        self.generic_visit(node)
        return node

    def visit_Constant(self, node: ast.Constant) -> ast.Constant:
        if self.normalize_constants:
            val = node.value
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                node.value = 0
                self.transformations_log.append(f"Normalized constant number {val} -> 0")
            elif isinstance(val, str):
                node.value = ""
                self.transformations_log.append(f"Normalized constant string '{val[:10]}...' -> ''")
        return node

    def visit_BinOp(self, node: ast.BinOp) -> ast.BinOp:
        self.generic_visit(node)

        # Canonicalize commutative operations: sort left and right deterministically
        if self.sort_commutative_ops and isinstance(node.op, (ast.Add, ast.Mult, ast.BitOr, ast.BitAnd, ast.BitXor)):
            try:
                left_dump = ast.dump(node.left)
                right_dump = ast.dump(node.right)
                if left_dump > right_dump:
                    node.left, node.right = node.right, node.left
                    self.transformations_log.append(f"Canonicalized commutative {node.op.__class__.__name__} operands")
            except Exception:
                pass
        return node


def normalize_ast(
    tree: ast.AST,
    options: Optional[Dict[str, bool]] = None
) -> Tuple[ast.AST, str, Dict[str, Any]]:
    """
    Applies configurable normalization on a deep copy of an AST.
    Returns:
        (normalized_tree, normalized_code, normalization_metadata)
    """
    opts = {
        "normalize_variables": True,
        "normalize_functions": True,
        "normalize_constants": False,
        "strip_docstrings": True,
        "sort_commutative_ops": True
    }
    if options:
        opts.update(options)

    # Work on a deep copy to keep original untouched
    tree_copy = copy.deepcopy(tree)

    normalizer = ASTNormalizer(
        normalize_variables=opts["normalize_variables"],
        normalize_functions=opts["normalize_functions"],
        normalize_constants=opts["normalize_constants"],
        strip_docstrings=opts["strip_docstrings"],
        sort_commutative_ops=opts["sort_commutative_ops"]
    )

    normalized_tree = normalizer.visit(tree_copy)
    ast.fix_missing_locations(normalized_tree)

    try:
        normalized_code = ast.unparse(normalized_tree)
    except Exception:
        normalized_code = "# [Unable to unparse normalized AST]"

    meta = {
        "options_applied": opts,
        "variable_map": normalizer.var_map,
        "function_map": normalizer.func_map,
        "param_map": normalizer.param_map,
        "total_variables_normalized": len(normalizer.var_map),
        "total_functions_normalized": len(normalizer.func_map),
        "log": normalizer.transformations_log[:50]  # Cap log size for payload safety
    }

    return normalized_tree, normalized_code, meta


if __name__ == "__main__":
    print("=" * 70)
    print("CodeGuard AI - AST Normalization & Alpha-Conversion Engine")
    print("=" * 70)
    sample = """def bubble_sort(elements):
    n = len(elements)
    for i in range(n):
        for j in range(0, n - i - 1):
            if elements[j] > elements[j + 1]:
                temp = elements[j]
                elements[j] = elements[j + 1]
                elements[j + 1] = temp
    return elements
"""
    print("Original Source Code:")
    print(sample)
    raw_tree = ast.parse(sample)
    norm_tree, norm_code, meta = normalize_ast(raw_tree)
    print("\n--- Canonicalized Code (ast.unparse) ---")
    print(norm_code)
    print("\n--- Symbol Table Canonical Mappings ---")
    print(f"Functions : {meta['function_map']}")
    print(f"Variables : {meta['variable_map']}")
    print(f"Parameters: {meta['param_map']}")
    print("=" * 70)

