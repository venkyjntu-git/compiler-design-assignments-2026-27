import sys
from lr0 import read_grammar
from first_follow import calculate_first
from lr1 import canonical_lr1_collection, print_lr1_item
from lalr import merge_lr1_states
from lr1_table import build_lr1_table

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass



def main():
    # Step 1: Read grammar
    grammar = read_grammar()

    if not grammar:
        print("No grammar entered.")
        return

    # Step 2: Calculate FIRST sets
    first = calculate_first(grammar)

    # Step 3: Generate canonical LR(1) states
    augmented, states, transitions = (
        canonical_lr1_collection(grammar, first)
    )

    # Step 4: Merge states with identical LR(0) cores
    merged_states, merged_transitions, mapping = (
        merge_lr1_states(states, transitions)
    )

    # Step 5: Build LALR table using the merged states
    (
        terminals,
        nonterminals,
        productions,
        action,
        goto_table,
        conflicts,
    ) = build_lr1_table(
        grammar,
        augmented,
        merged_states,
        merged_transitions,
    )

    # Step 6: Display merged item sets
    print("\n========== LALR(1) ITEM SETS ==========")

    for i, state in enumerate(merged_states):
        print(f"\nI{i}:")
        for item in sorted(state):
            print("  " + print_lr1_item(item))

    # Step 7: Display parsing table
    action_columns = sorted(terminals)
    goto_columns = sorted(nonterminals)

    print("\n========== LALR(1) ACTION / GOTO TABLE ==========")
    print("State | " + " | ".join(action_columns + goto_columns))
    print("-" * 70)

    for i in range(len(merged_states)):
        row = [str(i)]

        for symbol in action_columns:
            row.append(action.get((i, symbol), "-"))

        for symbol in goto_columns:
            row.append(str(goto_table.get((i, symbol), "-")))

        print(" | ".join(row))

    # Step 8: Report conflicts
    print("\n========== LALR(1) CONFLICT REPORT ==========")

    if conflicts:
        for state, symbol, old, new in conflicts:
            print(
                f"State {state}, lookahead {symbol}: "
                f"{old} conflicts with {new}"
            )
            print("Conflicting state items:")
            for item in sorted(merged_states[state]):
                print("  " + print_lr1_item(item))
    else:
        print("No conflicts found. The grammar is LALR(1).")

    print("\nCanonical LR(1) states:", len(states))
    print("LALR(1) states:", len(merged_states))


if __name__ == "__main__":
    main()