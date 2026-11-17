from compiler.ast_nodes import Number, Unary, Binary

def evaluate_attribute(node):
    """Evaluate the synthesized 'value' attribute in post-order."""
    if isinstance(node, Number):
        return node.value
    if isinstance(node, Unary):
        operand_value = evaluate_attribute(node.operand)
        return -operand_value
    if isinstance(node, Binary):
        left_value = evaluate_attribute(node.left)
        right_value = evaluate_attribute(node.right)
        if node.operator == "+": return left_value + right_value
        if node.operator == "-": return left_value - right_value
        if node.operator == "*": return left_value * right_value
        if node.operator == "/":
            if right_value == 0:
                raise ZeroDivisionError("Division by zero")
            return left_value / right_value
    raise TypeError(f"Unsupported AST node: {type(node).__name__}")
