import sys
from lr0 import read_grammar, canonical_collection
from first_follow import calculate_first, calculate_follow, ENDMARK
from slr import build_slr_table

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass



def parse_input(user_input, action, goto_table, productions, max_steps=500):
    """
    Parse an input string or list of tokens using SLR/LR parsing tables.
    Returns: (accepted, trace, message)
    """
    if isinstance(user_input, str):
        tokens = user_input.strip().split()
    else:
        tokens = list(user_input)

    if not tokens:
        return False, [], "Result: INPUT REJECTED (Empty input)"

    if tokens[-1] != ENDMARK:
        tokens.append(ENDMARK)

    state_stack = [0]
    symbol_stack = []
    trace = []
    position = 0

    for _ in range(max_steps):
        state = state_stack[-1]
        lookahead = tokens[position]
        current_action = action.get((state, lookahead))
        remaining = " ".join(tokens[position:])

        row = {
            "states": list(state_stack),
            "symbols": list(symbol_stack),
            "input": remaining,
            "action": current_action if current_action is not None else "ERROR",
        }
        trace.append(row)

        if current_action is None:
            return (
                False,
                trace,
                f"Result: INPUT REJECTED (No action for state {state} and lookahead '{lookahead}')",
            )

        if current_action == "acc":
            return True, trace, "Result: INPUT ACCEPTED"

        if current_action.startswith("s"):
            target_state = int(current_action[1:])
            state_stack.append(target_state)
            symbol_stack.append(lookahead)
            position += 1
        elif current_action.startswith("r"):
            prod_no = int(current_action[1:])
            if prod_no >= len(productions):
                return (
                    False,
                    trace,
                    f"Result: INPUT REJECTED (Invalid production number {prod_no})",
                )

            lhs, rhs = productions[prod_no]
            count = len(rhs)

            if count > 0:
                if len(state_stack) < count + 1 or len(symbol_stack) < count:
                    return (
                        False,
                        trace,
                        "Result: INPUT REJECTED (Stack underflow on reduction)",
                    )
                del state_stack[-count:]
                del symbol_stack[-count:]

            symbol_stack.append(lhs)
            top_state = state_stack[-1]
            next_state = goto_table.get((top_state, lhs))

            if next_state is None:
                return (
                    False,
                    trace,
                    f"Result: INPUT REJECTED (No GOTO for state {top_state} and nonterminal '{lhs}')",
                )

            state_stack.append(next_state)
        else:
            return (
                False,
                trace,
                f"Result: INPUT REJECTED (Unknown action '{current_action}')",
            )

    return (
        False,
        trace,
        f"Result: INPUT REJECTED (Parsing exceeded {max_steps} steps)",
    )


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

    user_input = input(
        "Enter input string (symbols separated by spaces): "
    )

    accepted, trace, message = parse_input(
        user_input, action, goto_table, productions
    )

    print("\nPARSING TRACE")
    print("-" * 70)

    for step, row in enumerate(trace, start=1):
        print(f"Step: {step}")
        print("State stack:", row["states"])
        print("Symbol stack:", row["symbols"])
        print("Remaining input:", row["input"])
        print("Action:", row["action"])
        print("-" * 70)

    print(message)


if __name__ == "__main__":
    main()