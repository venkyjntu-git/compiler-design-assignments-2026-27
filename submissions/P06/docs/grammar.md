# Grammar

The evaluator accepts arithmetic expressions using this grammar:

```text
expression  -> term (('+' | '-') term)*
term        -> factor (('*' | '/') factor)*
factor      -> NUMBER | '(' expression ')' | '-' factor
```

Multiplication and division have higher precedence than addition and subtraction.
Parentheses can change the evaluation order.
