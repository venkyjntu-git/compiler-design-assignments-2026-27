import ast

SOURCES = {"input"}
SINK_NAMES = {"execute", "executemany", "system", "popen", "open"}
SANITIZERS = {"escape", "html_escape", "sanitize", "parameterize"}


class TaintAnalyzer(ast.NodeVisitor):

    def __init__(self):
        self.tainted = set()
        self.findings = []

    def _names(self, node):
        if node is None:
            return set()

        return {
            n.id for n in ast.walk(node)
            if isinstance(n, ast.Name)
        }

    def _call_name(self, func):
        if isinstance(func, ast.Name):
            return func.id

        if isinstance(func, ast.Attribute):
            return func.attr

        return ""

    def _is_source(self, node):
        if node is None:
            return False

        if isinstance(node, ast.Call):
            if self._call_name(node.func) in SOURCES:
                return True

        for child in ast.iter_child_nodes(node):
            if self._is_source(child):
                return True

        return False

    def _is_sanitized(self, node):
        if node is None:
            return False

        return any(
            isinstance(n, ast.Call)
            and self._call_name(n.func) in SANITIZERS
            for n in ast.walk(node)
        )

    def visit_Assign(self, node):
        value_names = self._names(node.value)

        value_tainted = (
            bool(value_names & self.tainted)
            or self._is_source(node.value)
        )

        if self._is_sanitized(node.value):
            value_tainted = False

        for target in node.targets:
            if isinstance(target, ast.Name):
                if value_tainted:
                    self.tainted.add(target.id)
                else:
                    self.tainted.discard(target.id)

        self.generic_visit(node)

    def visit_AnnAssign(self, node):
        if isinstance(node.target, ast.Name) and node.value is not None:
            value_tainted = (
                bool(self._names(node.value) & self.tainted)
                or self._is_source(node.value)
            )

            if self._is_sanitized(node.value):
                value_tainted = False

            if value_tainted:
                self.tainted.add(node.target.id)
            else:
                self.tainted.discard(node.target.id)

        self.generic_visit(node)

    def visit_Call(self, node):
        name = self._call_name(node.func)

        argument_names = set()
        direct_source = False

        for arg in node.args:
            argument_names |= self._names(arg)

            if self._is_source(arg):
                direct_source = True

        for keyword in node.keywords:
            argument_names |= self._names(keyword.value)

            if self._is_source(keyword.value):
                direct_source = True

        tainted_args = argument_names & self.tainted

        if name in SINK_NAMES and (tainted_args or direct_source):
            if tainted_args:
                variable = sorted(tainted_args)[0]
                path = ["input()", variable, f"{name}()"]
                message = (
                    f"Tainted variable '{variable}' "
                    f"is passed to {name}()."
                )
            else:
                path = ["input()", f"{name}()"]
                message = (
                    f"Direct untrusted input is passed to {name}()."
                )

            self.findings.append({
                "rule_id": "TAINT001",
                "name": "Untrusted data reaches a sensitive sink",
                "severity": "HIGH",
                "cwe": (
                    "CWE-89"
                    if name in {"execute", "executemany"}
                    else "CWE-78"
                    if name in {"system", "popen"}
                    else "CWE-22"
                ),
                "line": node.lineno,
                "message": message,
                "taint_path": path
            })

        self.generic_visit(node)