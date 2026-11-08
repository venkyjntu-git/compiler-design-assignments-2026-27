import argparse
import json
from pathlib import Path

from vulnerability_detector import analyze_file
from report_generator import write_json_report, write_sarif_report

def main():
    parser = argparse.ArgumentParser(description="AST-based Python security analyzer")
    parser.add_argument("target", help="Python file or directory to scan")
    parser.add_argument("--format", choices=["text", "json", "sarif"], default="text")
    parser.add_argument("--output", help="Optional report output path")
    args = parser.parse_args()

    target = Path(args.target)
    paths = [target] if target.is_file() else sorted(target.rglob("*.py"))
    results = []
    for path in paths:
        if path.is_file() and path.suffix == ".py":
            results.extend(analyze_file(path))

    if args.format == "sarif":
        output = args.output or "reports/results.sarif"
        write_sarif_report(results, output)
        print(f"SARIF report written to {output}")
    elif args.format == "json":
        output = args.output or "reports/results.json"
        write_json_report(results, output)
        print(f"JSON report written to {output}")
    else:
        if not results:
            print("No findings.")
        for item in results:
            print(f"[{item['severity']}] {item['rule_id']} | {item['file']}:{item['line']} | {item['message']}")
            if item.get("taint_path"):
                print("  Taint path: " + " -> ".join(item["taint_path"]))
        print(f"\nTotal findings: {len(results)}")

if __name__ == "__main__":
    main()
