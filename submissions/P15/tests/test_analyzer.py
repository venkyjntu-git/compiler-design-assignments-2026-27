import ast
from pathlib import Path
from vulnerability_detector import analyze_source, analyze_file, _call_name, _pattern_findings
from report_generator import write_sarif_report, write_json_report
from taint_analyzer import TaintAnalyzer
from ast_parser import parse_source, parse_file
from security_rules import load_rules, DEFAULT_RULES
import json

def test_detects_eval():
    findings = analyze_source("x = input(); eval(x)")
    assert any(x["rule_id"] == "PY001" for x in findings)

def test_detects_shell_true():
    findings = analyze_source("import subprocess\nsubprocess.run('echo hi', shell=True)")
    assert any(x["rule_id"] == "PY003" for x in findings)

def test_detects_hardcoded_secret():
    findings = analyze_source("password = 'secret123'")
    assert any(x["rule_id"] == "PY004" for x in findings)

def test_detects_taint_to_execute():
    findings = analyze_source("x = input()\ncursor.execute(x)")
    assert any(x["rule_id"] == "TAINT001" for x in findings)

def test_safe_hash_not_flagged():
    findings = analyze_source("import hashlib\nhashlib.sha256(b'x')")
    assert not any(x["rule_id"] == "PY005" for x in findings)

def test_sarif_output(tmp_path):
    findings = analyze_source("eval('2+2')", "sample.py")
    output = tmp_path / "out.sarif"
    write_sarif_report(findings, output)
    data = json.loads(output.read_text())
    assert data["version"] == "2.1.0"

def test_taint_direct_input_to_sink():
    tree = ast.parse("import os\nos.system(input())")
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert len(analyzer.findings) == 1
    assert analyzer.findings[0]["cwe"] == "CWE-78"


def test_taint_through_multiple_variables():
    tree = ast.parse(
        "a = input()\nb = a\ncursor.execute(b)"
    )
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert len(analyzer.findings) == 1
    assert "b" in analyzer.findings[0]["taint_path"]


def test_sanitized_input_not_flagged():
    tree = ast.parse(
        "a = input()\nb = sanitize(a)\ncursor.execute(b)"
    )
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert len(analyzer.findings) == 0


def test_annotated_assignment_taint():
    tree = ast.parse(
        "a: str = input()\ncursor.execute(a)"
    )
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert len(analyzer.findings) == 1


def test_keyword_argument_direct_input():
    tree = ast.parse("open(file=input())")
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert len(analyzer.findings) == 1
    assert analyzer.findings[0]["cwe"] == "CWE-22"


def test_clean_assignment_removes_taint():
    tree = ast.parse(
        "a = input()\na = 'safe text'\ncursor.execute(a)"
    )
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert len(analyzer.findings) == 0


def test_non_sink_call_not_flagged():
    tree = ast.parse(
        "a = input()\nprint(a)"
    )
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert len(analyzer.findings) == 0

def test_parse_source_returns_ast():
    tree = parse_source("x = 10")
    assert isinstance(tree, ast.Module)


def test_parse_file_reads_python_file(tmp_path):
    file_path = tmp_path / "sample.py"
    file_path.write_text("x = 10", encoding="utf-8")

    source, tree = parse_file(file_path)

    assert source == "x = 10"
    assert isinstance(tree, ast.Module)


def test_parse_source_invalid_syntax():
    import pytest

    with pytest.raises(SyntaxError):
        parse_source("if True print('hello')")

def test_json_report_output(tmp_path):
    findings = [
        {
            "rule_id": "PY001",
            "name": "Unsafe eval",
            "severity": "HIGH",
            "message": "Use of eval detected."
        }
    ]

    output = tmp_path / "reports" / "out.json"
    write_json_report(findings, output)

    data = json.loads(output.read_text(encoding="utf-8"))

    assert data["findings"] == findings


def test_sarif_empty_findings(tmp_path):
    output = tmp_path / "empty.sarif"

    write_sarif_report([], output)

    data = json.loads(output.read_text(encoding="utf-8"))

    assert data["version"] == "2.1.0"
    assert data["runs"][0]["results"] == []
    assert data["runs"][0]["tool"]["driver"]["rules"] == []


def test_sarif_warning_severity(tmp_path):
    findings = [
        {
            "rule_id": "PY005",
            "name": "Weak hash",
            "severity": "MEDIUM",
            "message": "Weak hash detected.",
            "file": "sample.py",
            "line": 5
        }
    ]

    output = tmp_path / "warning.sarif"
    write_sarif_report(findings, output)

    data = json.loads(output.read_text(encoding="utf-8"))
    result = data["runs"][0]["results"][0]

    assert result["level"] == "warning"
    assert result["locations"][0]["physicalLocation"]["region"]["startLine"] == 5

def test_load_rules_from_yaml(tmp_path):
    rules_file = tmp_path / "rules.yaml"
    rules_file.write_text(
        "rules:\n"
        "  - id: TEST001\n"
        "    name: Test rule\n",
        encoding="utf-8"
    )

    rules = load_rules(rules_file)

    assert len(rules) == 1
    assert rules[0]["id"] == "TEST001"


def test_load_missing_rules_file():
    rules = load_rules("non_existing_rules.yaml")

    assert rules == DEFAULT_RULES["rules"]


def test_load_empty_yaml_file(tmp_path):
    rules_file = tmp_path / "empty.yaml"
    rules_file.write_text("", encoding="utf-8")

    rules = load_rules(rules_file)

    assert rules == []

def test_names_with_none():
    analyzer = TaintAnalyzer()
    assert analyzer._names(None) == set()


def test_call_name_variants():
    analyzer = TaintAnalyzer()

    assert analyzer._call_name(ast.Name(id="input", ctx=ast.Load())) == "input"
    assert analyzer._call_name(
        ast.Attribute(value=ast.Name(id="db", ctx=ast.Load()),
                      attr="execute", ctx=ast.Load())
    ) == "execute"
    assert analyzer._call_name(ast.Constant(value=10)) == ""


def test_source_detection():
    analyzer = TaintAnalyzer()

    assert analyzer._is_source(None) is False
    assert analyzer._is_source(ast.parse("input()").body[0].value) is True
    assert analyzer._is_source(ast.parse("print('hello')").body[0].value) is False


def test_sanitizer_detection():
    analyzer = TaintAnalyzer()

    safe_expression = ast.parse("sanitize(user_input)").body[0].value
    unsafe_expression = ast.parse("str(user_input)").body[0].value

    assert analyzer._is_sanitized(safe_expression) is True
    assert analyzer._is_sanitized(unsafe_expression) is False


def test_annotated_assignment_without_value():
    tree = ast.parse("username: str")
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert analyzer.tainted == set()
    assert analyzer.findings == []

def test_source_detection_with_non_source_expression():
    analyzer = TaintAnalyzer()
    expression = ast.parse("username + 'hello'").body[0].value

    assert analyzer._is_source(expression) is False


def test_sanitizer_detection_with_none():
    analyzer = TaintAnalyzer()

    assert analyzer._is_sanitized(None) is False


def test_keyword_argument_with_tainted_variable():
    tree = ast.parse("""
query = input()
cursor.execute(sql=query)
""")
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert len(analyzer.findings) == 1
    assert analyzer.findings[0]["rule_id"] == "TAINT001"


def test_sink_with_safe_argument_not_flagged():
    tree = ast.parse("""
cursor.execute("SELECT * FROM users")
""")
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert analyzer.findings == []


def test_assignment_with_non_name_target():
    tree = ast.parse("""
items[0] = input()
""")
    analyzer = TaintAnalyzer()
    analyzer.visit(tree)

    assert analyzer.findings == []

def test_call_name_unknown_node():
    assert _call_name(ast.Constant(value=100)) == ""


def test_secret_assignment_without_matching_rule():
    tree = ast.parse("password = 'mysecretpassword'")
    findings = _pattern_findings(tree, "sample.py", [])

    assert findings == []


def test_secret_assignment_with_short_value():
    tree = ast.parse("password = 'abc'")
    findings = _pattern_findings(
        tree,
        "sample.py",
        DEFAULT_RULES["rules"]
    )

    assert findings == []

def test_analyze_source_adds_filename_to_taint_finding():
    source = """
username = input()
cursor.execute(username)
"""

    findings = analyze_source(source, filename="taint_test.py")

    taint_findings = [
        item for item in findings
        if item["rule_id"] == "TAINT001"
    ]

    assert len(taint_findings) == 1
    assert taint_findings[0]["file"] == "taint_test.py"

def test_source_detection_inside_nested_call():
    analyzer = TaintAnalyzer()
    tree = ast.parse("query = wrapper(input())")
    analyzer.visit(tree)

    assert "query" in analyzer.tainted


def test_annotated_assignment_with_sanitizer():
    analyzer = TaintAnalyzer()
    tree = ast.parse("query: str = sanitize(input())")
    analyzer.visit(tree)

    assert "query" not in analyzer.tainted


def test_annotated_assignment_removes_taint():
    analyzer = TaintAnalyzer()
    analyzer.tainted.add("query")

    tree = ast.parse('query: str = "safe"')
    analyzer.visit(tree)

    assert "query" not in analyzer.tainted


def test_analyze_file_reads_and_scans_file(tmp_path):
    source_file = tmp_path / "sample.py"
    source_file.write_text("eval('2 + 2')", encoding="utf-8")

    findings = analyze_file(source_file)

    assert any(item["rule_id"] == "PY001" for item in findings)