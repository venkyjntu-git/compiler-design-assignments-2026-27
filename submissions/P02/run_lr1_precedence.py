import sys
from lr0 import read_grammar
from first_follow import calculate_first
from lr1 import canonical_lr1_collection
from lr1_table import build_lr1_table
from precedence import resolve_conflicts, DEFAULT_PRECEDENCE

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass



def main():
    grammar = read_grammar()

    if not grammar:
        print("No grammar entered.")
        return

    first = calculate_first(grammar)

    augmented, states, transitions = canonical_lr1_collection(
        grammar, first
    )

    terminals, nonterminals, productions, action, goto_table, conflicts = (
        build_lr1_table(grammar, augmented, states, transitions)
    )

    print("\n========== LR(1) TABLE ==========")
    print("Number of LR(1) states:", len(states))
    print("Conflicts before resolution:", len(conflicts))

    for conflict in conflicts:
        print(conflict)

    if not conflicts:
        print("No conflicts to resolve.")
        return

    print("\n========== PRECEDENCE RESOLUTION ==========")

    updated_action, report, unresolved = resolve_conflicts(
        action,
        conflicts,
        productions,
        DEFAULT_PRECEDENCE
    )

    if report:
        for item in report:
            print(
                f"State {item['state']}, "
                f"lookahead '{item['lookahead']}': "
                f"{item['original_actions']} -> "
                f"{item['selected_action']} "
                f"({item['reason']})"
            )
    else:
        print("No conflicts could be resolved using the current rules.")

    print("\n========== FINAL STATUS ==========")
    print("Conflicts resolved:", len(report))
    print("Conflicts unresolved:", len(unresolved))

    if unresolved:
        print("\nUnresolved conflicts:")
        for conflict in unresolved:
            print(conflict)

    print("\nUpdated ACTION entries:")
    for key in sorted(updated_action):
        print(f"State {key[0]}, Symbol {key[1]}: {updated_action[key]}")


if __name__ == "__main__":
    main()