# Architecture

1. **Lexer** converts characters into tokens.
2. **Parser** checks the grammar and builds an AST.
3. **Attribute evaluator** visits child nodes before parent nodes and computes
   the synthesized `value` attribute.
4. **Semantic module** exposes the evaluation phase.
5. **IR generator** creates temporary-variable instructions.
6. **Code generator** emits Python code.
7. **Runtime executor** runs the generated Python file.

The main synthesized attribute is `value`. For a binary node, its semantic rule is:

```text
node.value = node.left.value operator node.right.value
```
