import json
from pathlib import Path

def write_json_report(findings, output_path):
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"findings": findings}, indent=2), encoding="utf-8")

def write_sarif_report(findings, output_path):
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    rules = {}
    results = []
    for item in findings:
        rid = item["rule_id"]
        rules[rid] = {"id": rid, "name": item.get("name", rid)}
        result = {
            "ruleId": rid,
            "level": "error" if item["severity"] == "HIGH" else "warning",
            "message": {"text": item["message"]},
            "locations": [{
                "physicalLocation": {
                    "artifactLocation": {"uri": item["file"]},
                    "region": {"startLine": item["line"]}
                }
            }]
        }
        results.append(result)
    sarif = {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {"driver": {"name": "AST Security Analyzer", "rules": list(rules.values())}},
            "results": results
        }]
    }
    path.write_text(json.dumps(sarif, indent=2), encoding="utf-8")
