# parse_tree.py

class ParseNode:
    def __init__(self, symbol, children=None):
        self.symbol = symbol
        self.children = children or []

    def display(self, level=0):
        print("  " * level + self.symbol)
        for child in self.children:
            child.display(level + 1)


def build_tree_from_reductions(productions, reductions, tokens):
    """
    Build a parse tree using the reduction sequence
    and the original input tokens.

    productions: list of (lhs, rhs) tuples
    reductions: production numbers in reduction order
    tokens: input tokens, without the end marker $
    """
    stack = []
    token_position = 0

    for production_number in reductions:
        lhs, rhs = productions[production_number]

        # Shift terminals until the next reduction can be applied.
        while token_position < len(tokens):
            if len(stack) >= len(rhs):
                top_symbols = [node.symbol for node in stack[-len(rhs):]] if rhs else []
                if tuple(top_symbols) == rhs:
                    break

            stack.append(ParseNode(tokens[token_position]))
            token_position += 1

        # Apply the reduction.
        if rhs:
            if len(stack) < len(rhs):
                raise ValueError("Invalid reduction sequence.")

            children = stack[-len(rhs):]
            if tuple(node.symbol for node in children) != rhs:
                raise ValueError(
                    f"Cannot apply production {lhs} -> {' '.join(rhs)}"
                )
            del stack[-len(rhs):]
        else:
            children = []

        stack.append(ParseNode(lhs, children))

    # Add any remaining input terminals.
    while token_position < len(tokens):
        stack.append(ParseNode(tokens[token_position]))
        token_position += 1

    if len(stack) != 1:
        raise ValueError(
            "Could not build a single parse tree. "
            "Check the reduction sequence."
        )

    return stack[0]


def demo():
    # Grammar:
    # E' -> E
    # E -> E + E
    # E -> id
    productions = [
        ("E'", ("E",)),
        ("E", ("E", "+", "E")),
        ("E", ("id",)),
    ]

    # Input: id + id
    # Reductions: E -> id, E -> id, E -> E + E
    reductions = [2, 2, 1]
    tokens = ["id", "+", "id"]

    print("Parse Tree for: id + id")
    print("-----------------------")

    try:
        tree = build_tree_from_reductions(
            productions, reductions, tokens
        )
        tree.display()
    except ValueError as error:
        print("Tree construction error:", error)


if __name__ == "__main__":
    demo()