import argparse
from pathlib import Path
from compiler.lexer import tokenize
from compiler.parser import Parser
from compiler.semantic import evaluate
from compiler.ir import generate_ir
from compiler.codegen import generate_python
from runtime.executor import execute

def main():
    ap = argparse.ArgumentParser(description="Attribute Grammar Evaluator")
    ap.add_argument("file", help="Path to a source program")
    ap.add_argument("--run", action="store_true", help="Execute generated Python code")
    args = ap.parse_args()

    source = Path(args.file).read_text(encoding="utf-8")
    tokens = tokenize(source)
    tree = Parser(tokens).parse()
    value = evaluate(tree)
    print("Evaluated value:", value)
    print("\nIntermediate representation:")
    print(generate_ir(tree))

    output = generate_python(tree)
    out_dir = Path("generated")
    out_dir.mkdir(exist_ok=True)
    output_file = out_dir / "output.py"
    output_file.write_text(output, encoding="utf-8")
    print(f"\nGenerated Python code: {output_file}")

    if args.run:
        print("\nExecution result:")
        execute(output_file)

if __name__ == "__main__":
    main()
