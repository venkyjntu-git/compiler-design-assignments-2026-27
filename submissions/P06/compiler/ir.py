from compiler.ast_nodes import Number, Unary, Binary

def generate_ir(node):
    instructions = []
    counter = 0

    def visit(current):
        nonlocal counter
        if isinstance(current, Number):
            return str(current.value)
        if isinstance(current, Unary):
            operand = visit(current.operand)
            counter += 1
            temp = f"t{counter}"
            instructions.append(f"{temp} = - {operand}")
            return temp
        if isinstance(current, Binary):
            left = visit(current.left)
            right = visit(current.right)
            counter += 1
            temp = f"t{counter}"
            instructions.append(f"{temp} = {left} {current.operator} {right}")
            return temp
        raise TypeError(f"Unsupported AST node: {type(current).__name__}")

    result = visit(node)
    instructions.append(f"result = {result}")
    return "\n".join(instructions)
