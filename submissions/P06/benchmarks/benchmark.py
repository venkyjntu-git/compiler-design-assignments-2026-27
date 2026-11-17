from time import perf_counter
from compiler.lexer import tokenize
from compiler.parser import Parser
from compiler.semantic import evaluate

source = "+".join(["1"] * 1000)
start = perf_counter()
tree = Parser(tokenize(source)).parse()
value = evaluate(tree)
elapsed = perf_counter() - start
print(f"Result: {value}")
print(f"Elapsed time: {elapsed:.6f} seconds")
