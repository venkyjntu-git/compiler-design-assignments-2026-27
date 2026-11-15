"""
AST Parser Module for CodeGuard AI
Parses Python source code into Abstract Syntax Trees (ASTs), validates syntax,
extracts structural metrics, and converts trees into JSON-serializable graphs for visualization.
"""

import ast
from typing import Dict, Any, List, Optional, Tuple


COMPILER_NODE_DOCS: Dict[str, str] = {
    "Module": "Root node representing the entire Python compilation unit (source file).",
    "FunctionDef": "Defines a named function. Establishes a new local scope and symbol table entry in the compiler.",
    "AsyncFunctionDef": "Defines an asynchronous coroutine function utilizing the event loop protocol.",
    "ClassDef": "Class declaration node creating a new namespace and type object.",
    "Return": "Terminates execution of the current function frame and transfers a value back to the caller.",
    "Delete": "Deletes target variables, attributes, or slice bindings from the runtime namespace.",
    "Assign": "Assignment statement storing an evaluated expression into one or more target identifiers.",
    "AugAssign": "Augmented in-place assignment (e.g. +=, -=) executing an in-place operator bytecode.",
    "AnnAssign": "Annotated variable declaration with optional initial value and static type annotation.",
    "For": "Iterative loop node over an iterable collection; lowers to iterator protocol bytecode.",
    "AsyncFor": "Asynchronous iterative loop utilizing async iterator protocol (__aiter__, __anext__).",
    "While": "Conditional pre-test loop evaluated before each iteration.",
    "If": "Conditional branching statement lowering to conditional jump bytecode instructions.",
    "With": "Context management statement executing __enter__ and __exit__ protocols.",
    "AsyncWith": "Asynchronous context management statement with async enter/exit protocols.",
    "Match": "Structural pattern matching statement evaluating patterns against a target expression.",
    "Raise": "Exception signaling node raising an error instance to unwind the call stack.",
    "Try": "Exception handling block wrapping risky statements with except, else, and finally handlers.",
    "Assert": "Assertion verification node testing a boolean condition; raises AssertionError on failure.",
    "Import": "Loads external modules into the current compilation scope symbol table.",
    "ImportFrom": "Binds specific identifiers from a module into the local namespace.",
    "Global": "Directs the compiler to bind target identifiers to module-level global scope.",
    "Nonlocal": "Directs the compiler to bind target identifiers to the nearest enclosing non-global scope.",
    "Expr": "Expression statement evaluated solely for its side effects (e.g. function call, docstring).",
    "Pass": "No-op statement placeholder; does not emit any operational bytecode instructions.",
    "Break": "Immediately terminates the innermost enclosing loop construct.",
    "Continue": "Skips remainder of current loop body and proceeds to next iteration.",
    "BoolOp": "Short-circuiting boolean operation (And, Or).",
    "NamedExpr": "Assignment expression (walrus operator :=) assigning and returning value inline.",
    "BinOp": "Binary arithmetic or bitwise operation combining two expressions with an operator (+, -, *, /).",
    "UnaryOp": "Unary operation applied to a single operand (not, +, -, ~).",
    "Lambda": "Anonymous inline function expression producing an implicit closure.",
    "IfExp": "Ternary conditional expression (body if test else orelse).",
    "Dict": "Dictionary literal constructing a hash map from key-value pairs.",
    "Set": "Set literal expression constructing an unordered collection of unique hashable elements.",
    "ListComp": "List comprehension expression compiling to an optimized inline builder loop.",
    "SetComp": "Set comprehension expression compiling to an inline set accumulator.",
    "DictComp": "Dictionary comprehension expression compiling to an inline key-value accumulator.",
    "GeneratorExp": "Lazy generator expression returning an iterator on evaluation.",
    "Await": "Yields coroutine execution back to event loop until awaited awaitable completes.",
    "Yield": "Yields intermediate value from generator frame, suspending execution state.",
    "YieldFrom": "Delegates generator execution directly to a sub-generator.",
    "Compare": "Relational comparison expression (==, !=, <, <=, >, >=, is, in).",
    "Call": "Function invocation node; evaluates callable and pushes argument registers onto call stack.",
    "FormattedValue": "F-string interpolated expression element with optional format specifier.",
    "JoinedStr": "F-string container node concatenating string literals and formatted values.",
    "Constant": "Literal scalar value (int, float, string, bool, None) stored in bytecode code-object constants.",
    "Attribute": "Object attribute access expression (e.g. obj.attr).",
    "Subscript": "Index or key access expression (e.g. obj[key]).",
    "Starred": "Unpacking expression (*args) expanding iterables into positional arguments.",
    "Name": "Identifier reference; triggers local, enclosing, global, or built-in scope lookup (LEGB).",
    "List": "Contiguous dynamic array literal expression [a, b, c].",
    "Tuple": "Immutable sequence literal expression (a, b, c).",
    "Slice": "Slice index expression defining start, stop, and step bounds.",
    "arg": "Formal parameter declaration in a function signature.",
    "arguments": "Container for function parameters including positional, keyword, and variadic args.",
}


def get_node_category(node: ast.AST) -> str:
    """Categorize an AST node for visual styling and structural classification."""
    name = node.__class__.__name__

    if isinstance(node, (ast.If, ast.For, ast.AsyncFor, ast.While, ast.Break, ast.Continue, ast.Try, ast.With, ast.Return)):
        return "ControlFlow"
    if isinstance(node, ast.stmt):
        return "Statement"
    if isinstance(node, (ast.BinOp, ast.UnaryOp, ast.BoolOp, ast.Compare)):
        return "Operation"
    if isinstance(node, ast.Call):
        return "Call"
    if isinstance(node, ast.Constant):
        return "Constant"
    if isinstance(node, ast.Name):
        return "Identifier"
    if isinstance(node, (ast.List, ast.Dict, ast.Set, ast.Tuple)):
        return "Collection"
    if isinstance(node, ast.expr):
        return "Expression"
    if isinstance(node, (ast.arg, ast.arguments)):
        return "Parameter"
    if isinstance(node, (ast.operator, ast.boolop, ast.unaryop, ast.cmpop)):
        return "Operator"

    return "Structure"


def parse_code(source_code: str) -> Tuple[bool, Optional[ast.AST], Optional[Dict[str, Any]]]:
    """
    Parse Python source code into an AST.
    Returns:
        (success, ast_tree, error_dict)
    """
    if not source_code or not source_code.strip():
        return False, None, {
            "error_type": "EmptyInputError",
            "message": "Source code cannot be empty. Please provide Python code to analyze.",
            "line": 0,
            "column": 0,
            "snippet": ""
        }

    # Normalize carriage returns
    clean_code = source_code.replace("\r\n", "\n").replace("\r", "\n")

    try:
        tree = ast.parse(clean_code)
        return True, tree, None
    except SyntaxError as se:
        lines = clean_code.split("\n")
        snippet = ""
        line_num = se.lineno or 1
        if 1 <= line_num <= len(lines):
            snippet = lines[line_num - 1]

        pointer = " " * (max(0, (se.offset or 1) - 1)) + "^"

        return False, None, {
            "error_type": "SyntaxError",
            "message": f"Python Syntax Error: {se.msg} (Line {line_num}, Column {se.offset or 1})",
            "line": line_num,
            "column": se.offset or 1,
            "snippet": snippet,
            "pointer": pointer
        }
    except Exception as e:
        return False, None, {
            "error_type": "ParserError",
            "message": f"AST Parsing failed: {str(e)}",
            "line": 0,
            "column": 0,
            "snippet": ""
        }


def extract_node_attributes(node: ast.AST) -> Dict[str, Any]:
    """Extract human-readable semantic attributes for inspecting an AST node."""
    attrs: Dict[str, Any] = {}

    if isinstance(node, ast.Name):
        attrs["identifier"] = node.id
        attrs["context"] = node.ctx.__class__.__name__ if hasattr(node, "ctx") else "Load"
    elif isinstance(node, ast.Constant):
        val = node.value
        attrs["value"] = repr(val) if isinstance(val, str) else str(val)
        attrs["value_type"] = type(val).__name__
    elif isinstance(node, ast.FunctionDef):
        attrs["function_name"] = node.name
        attrs["args"] = [a.arg for a in node.args.args]
        attrs["has_returns"] = bool(node.returns)
    elif isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name):
            attrs["func"] = node.func.id
        elif isinstance(node.func, ast.Attribute):
            attrs["func"] = f"{getattr(node.func.value, 'id', 'obj')}.{node.func.attr}"
        else:
            attrs["func"] = node.func.__class__.__name__
        attrs["arg_count"] = len(node.args)
    elif isinstance(node, ast.BinOp):
        attrs["operator"] = node.op.__class__.__name__
    elif isinstance(node, ast.UnaryOp):
        attrs["operator"] = node.op.__class__.__name__
    elif isinstance(node, ast.BoolOp):
        attrs["operator"] = node.op.__class__.__name__
        attrs["values_count"] = len(node.values)
    elif isinstance(node, ast.Compare):
        attrs["operators"] = [op.__class__.__name__ for op in node.ops]
        attrs["comparators_count"] = len(node.comparators)
    elif isinstance(node, ast.arg):
        attrs["arg_name"] = node.arg
    elif isinstance(node, ast.Attribute):
        attrs["attribute"] = node.attr
    elif isinstance(node, ast.Import):
        attrs["modules"] = [alias.name for alias in node.names]
    elif isinstance(node, ast.ImportFrom):
        attrs["module"] = node.module or ""
        attrs["names"] = [alias.name for alias in node.names]
    elif isinstance(node, ast.ClassDef):
        attrs["class_name"] = node.name

    return attrs


def ast_to_dict(node: ast.AST, counter: Optional[List[int]] = None, matched_ids: Optional[set] = None) -> Dict[str, Any]:
    """
    Convert an ast.AST node into a serializable hierarchical tree dictionary.
    Includes line spans for source code mapping and compiler doc descriptions.
    """
    if counter is None:
        counter = [0]
    node_id = f"node_{counter[0]}"
    counter[0] += 1

    node_class = node.__class__.__name__
    category = get_node_category(node)
    attributes = extract_node_attributes(node)

    lineno = getattr(node, "lineno", None)
    col_offset = getattr(node, "col_offset", None)
    end_lineno = getattr(node, "end_lineno", lineno)
    end_col_offset = getattr(node, "end_col_offset", None)

    doc = COMPILER_NODE_DOCS.get(
        node_class,
        f"AST node representing '{node_class}' construct in the Python grammar."
    )

    # Format a concise human-readable display label
    label = node_class
    if "identifier" in attributes:
        label = f"{node_class} ({attributes['identifier']})"
    elif "value" in attributes:
        val_str = str(attributes["value"])
        if len(val_str) > 16:
            val_str = val_str[:13] + "..."
        label = f"{node_class}: {val_str}"
    elif "operator" in attributes:
        label = f"{node_class} [{attributes['operator']}]"
    elif "function_name" in attributes:
        label = f"def {attributes['function_name']}()"
    elif "func" in attributes:
        label = f"Call: {attributes['func']}()"

    children = []
    for field_name, child_val in ast.iter_fields(node):
        if isinstance(child_val, ast.AST):
            children.append(ast_to_dict(child_val, counter, matched_ids))
        elif isinstance(child_val, list):
            for item in child_val:
                if isinstance(item, ast.AST):
                    children.append(ast_to_dict(item, counter, matched_ids))

    is_matched = None
    if matched_ids is not None:
        is_matched = node_id in matched_ids

    return {
        "id": node_id,
        "name": node_class,
        "label": label,
        "category": category,
        "doc": doc,
        "attributes": attributes,
        "lineno": lineno,
        "col_offset": col_offset,
        "end_lineno": end_lineno,
        "end_col_offset": end_col_offset,
        "is_matched": is_matched,
        "children": children
    }


def get_ast_statistics(tree: ast.AST, source_code: Optional[str] = None) -> Dict[str, Any]:
    """
    Compute structural and compiler metrics from the AST.
    """
    total_nodes = 0
    node_type_counts: Dict[str, int] = {}
    category_counts: Dict[str, int] = {}
    max_depth = 0
    control_flow_branches = 0

    def traverse(curr: ast.AST, depth: int):
        nonlocal total_nodes, max_depth, control_flow_branches
        total_nodes += 1
        if depth > max_depth:
            max_depth = depth

        node_name = curr.__class__.__name__
        node_type_counts[node_name] = node_type_counts.get(node_name, 0) + 1

        cat = get_node_category(curr)
        category_counts[cat] = category_counts.get(cat, 0) + 1

        # Branching estimation for McCabe Cyclomatic Complexity
        if isinstance(curr, (ast.If, ast.For, ast.AsyncFor, ast.While, ast.ExceptHandler, ast.With)):
            control_flow_branches += 1
        elif isinstance(curr, ast.BoolOp):
            control_flow_branches += max(1, len(curr.values) - 1)

        for _, child in ast.iter_fields(curr):
            if isinstance(child, ast.AST):
                traverse(child, depth + 1)
            elif isinstance(child, list):
                for item in child:
                    if isinstance(item, ast.AST):
                        traverse(item, depth + 1)

    traverse(tree, 1)

    lines = [l for l in (source_code or "").split("\n") if l.strip()]
    loc = len(lines)

    # McCabe Cyclomatic Complexity: V(G) = P + 1 where P is decision points
    cyclomatic_complexity = control_flow_branches + 1

    return {
        "total_nodes": total_nodes,
        "max_depth": max_depth,
        "node_types": node_type_counts,
        "category_counts": category_counts,
        "cyclomatic_complexity": cyclomatic_complexity,
        "loc": loc
    }


if __name__ == "__main__":
    import sys
    
    print("=" * 70)
    print("CodeGuard AI - AST Parser & Structural Inspector")
    print("=" * 70)
    
    if len(sys.argv) > 1:
        target_path = sys.argv[1]
        print(f"Reading file: {target_path}")
        with open(target_path, "r", encoding="utf-8") as f:
            sample_code = f.read()
    else:
        sample_code = """def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
"""
        print("Sample Python code being parsed into AST:")
        print(sample_code)

    is_valid, tree, err = parse_code(sample_code)
    if not is_valid:
        print(f"Syntax Error: {err}")
    else:
        stats = get_ast_statistics(tree, sample_code)
        print("\n--- AST Structural Metrics ---")
        print(f"Total AST Nodes:         {stats['total_nodes']}")
        print(f"Max Tree Depth:          {stats['max_depth']}")
        print(f"McCabe Cyclomatic Complexity: {stats['cyclomatic_complexity']}")
        print(f"Lines of Code (LOC):     {stats['loc']}")
        
        print("\nNode Category Distribution:")
        for cat, cnt in sorted(stats['category_counts'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {cat:15}: {cnt}")

        print("\nNode Type Breakdown:")
        for ntype, cnt in sorted(stats['node_types'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {ntype:15}: {cnt}")

        print("\nAST Tree Dump (indented):")
        print(ast.dump(tree, indent=2))
        print("=" * 70)

