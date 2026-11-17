import sys
from lr0 import read_grammar, canonical_collection
from first_follow import calculate_first, calculate_follow, ENDMARK
from slr import build_slr_table

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass



class ParseNode:
    def __init__(self, symbol, children=None):
        self.symbol = symbol
        self.children = children or []

    def display(self, level=0):
        print("  " * level + self.symbol)
        for child in self.children:
            child.display(level + 1)


def main():
    grammar = read_grammar()

    if not grammar:
        print("No grammar entered.")
        return

    start_symbol = next(iter(grammar))
    first = calculate_first(grammar)
    follow = calculate_follow(grammar, first, start_symbol)

    augmented, states, transitions = canonical_collection(grammar)

    terminals, nonterminals, productions, action, goto_table, conflicts = (
        build_slr_table(grammar, augmented, states, transitions, follow)
    )

    print("\nNumber of LR(0) states:", len(states))

    if conflicts:
        print("\nGrammar has SLR conflicts:")
        for conflict in conflicts:
            print(conflict)
        print("Parsing stopped because the grammar has conflicts.")
        return

    print("No conflicts found. The grammar is SLR(1).")

    action_dict = {}
    goto_dict = {}

    for (state, symbol), value in action.items():
        action_dict.setdefault(state, {})[symbol] = value

    for (state, symbol), value in goto_table.items():
        goto_dict.setdefault(state, {})[symbol] = value

    production_dict = {
        i: production for i, production in enumerate(productions)
    }

    user_input = input(
        "\nEnter input symbols separated by spaces (example: d d): "
    ).strip()

    if not user_input:
        print("Input is empty. Please enter a string.")
        return

    tokens = user_input.split()

    if ENDMARK in tokens:
        print("Do not enter $. The parser adds it automatically.")
        return

    tokens.append(ENDMARK)

    state_stack = [0]
    symbol_stack = []
    node_stack = []
    position = 0
    step = 1

    print("\n========== SHIFT-REDUCE PARSING TRACE ==========")
    print(
        f"{'Step':<6}{'State Stack':<22}"
        f"{'Symbol Stack':<22}{'Remaining Input':<25}Action"
    )
    print("-" * 100)

    while True:
        state = state_stack[-1]
        lookahead = tokens[position]
        operation = action_dict.get(state, {}).get(lookahead)

        print(
            f"{step:<6}{str(state_stack):<22}"
            f"{str(symbol_stack):<22}"
            f"{' '.join(tokens[position:]):<25}"
            f"{operation if operation is not None else 'ERROR'}"
        )

        if operation is None:
            print("\nResult: INPUT REJECTED")
            break

        if operation == "acc":
            print("\nResult: INPUT ACCEPTED")

            if len(node_stack) == 1:
                print("\n========== PARSE TREE ==========")
                node_stack[0].display()
            else:
                print("Could not display the parse tree: invalid node stack.")
            break

        if operation.startswith("s"):
            # SHIFT: create a leaf node for the input terminal.
            next_state = int(operation[1:])
            symbol_stack.append(lookahead)
            node_stack.append(ParseNode(lookahead))
            state_stack.append(next_state)
            position += 1

        elif operation.startswith("r"):
            # REDUCE: combine child nodes under their production's LHS.
            production_number = int(operation[1:])
            lhs, rhs = production_dict[production_number]
            count = len(rhs)

            if count:
                if len(symbol_stack) < count or len(node_stack) < count:
                    print("\nError: Invalid reduction stack.")
                    print("Result: INPUT REJECTED")
                    break

                actual_rhs = tuple(symbol_stack[-count:])

                if actual_rhs != rhs:
                    print("\nError: Production does not match the stack.")
                    print("Expected:", rhs)
                    print("Found:", actual_rhs)
                    print("Result: INPUT REJECTED")
                    break

                children = node_stack[-count:]
                del symbol_stack[-count:]
                del node_stack[-count:]
                del state_stack[-count:]
            else:
                # Epsilon production: the parent has no children.
                children = []

            symbol_stack.append(lhs)
            node_stack.append(ParseNode(lhs, children))

            next_state = goto_dict.get(state_stack[-1], {}).get(lhs)

            if next_state is None:
                print("\nError: Missing GOTO entry.")
                print("Result: INPUT REJECTED")
                break

            state_stack.append(next_state)

        step += 1


if __name__ == "__main__":
    main()