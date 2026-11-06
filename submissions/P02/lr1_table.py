from first_follow import ENDMARK


def build_lr1_table(grammar, augmented, states, transitions):
    """
    Build ACTION and GOTO tables from canonical LR(1) item sets.

    LR(1) item format:
        (lhs, rhs_tuple, dot_position, lookahead)

    Returns:
        terminals, nonterminals, productions, action, goto_table, conflicts
    """
    productions = [
        (lhs, tuple(rhs))
        for lhs, alternatives in augmented.items()
        for rhs in alternatives
    ]

    nonterminals = list(grammar.keys())
    terminals = sorted({
        symbol
        for alternatives in grammar.values()
        for rhs in alternatives
        for symbol in rhs
        if symbol not in grammar and symbol not in ("ε", "epsilon")
    } | {ENDMARK})

    action = {}
    goto_table = {}
    conflicts = []
    augmented_start = next(iter(augmented))

    def insert_action(state, terminal, new_action):
        key = (state, terminal)
        old_action = action.get(key)

        if old_action is None:
            action[key] = new_action
        elif old_action != new_action:
            conflict = (state, terminal, old_action, new_action)
            if conflict not in conflicts:
                conflicts.append(conflict)

    # Transitions create shift actions for terminals and GOTO entries
    # for nonterminals.
    for (state, symbol), target_state in transitions.items():
        if symbol in grammar:
            goto_table[(state, symbol)] = target_state
        else:
            insert_action(state, symbol, f"s{target_state}")

    # Completed items create reductions only on their own LR(1) lookahead.
    for state_number, state_items in enumerate(states):
        for lhs, rhs, dot, lookahead in state_items:
            if dot != len(rhs):
                continue

            if lhs == augmented_start:
                insert_action(state_number, ENDMARK, "acc")
            else:
                try:
                    production_number = productions.index((lhs, tuple(rhs)))
                except ValueError as exc:
                    raise ValueError(
                        f"Production {lhs} -> {' '.join(rhs)} "
                        "was not found in the production list."
                    ) from exc

                insert_action(
                    state_number,
                    lookahead,
                    f"r{production_number}",
                )

    return terminals, nonterminals, productions, action, goto_table, conflicts