from first_follow import ENDMARK
from lr0 import _augment


def build_slr_table(grammar, augmented, states, transitions, follow):
    productions = [(lhs, tuple(rhs)) for lhs, rhss in augmented.items() for rhs in rhss]
    terminals = sorted({
        symbol for rhss in grammar.values() for rhs in rhss for symbol in rhs
        if symbol not in grammar and symbol not in ("ε", "epsilon")
    } | {ENDMARK})
    nonterminals = list(grammar.keys())
    action, goto_table, conflicts = {}, {}, []

    def put(mapping, key, value):
        old = mapping.get(key)
        if old is None:
            mapping[key] = value
        elif old != value:
            conflicts.append((key[0], key[1], old, value))

    for (state, symbol), target in transitions.items():
        if symbol in grammar:
            goto_table[(state, symbol)] = target
        else:
            put(action, (state, symbol), f"s{target}")

    for i, state in enumerate(states):
        for lhs, rhs, dot in state:
            if dot == len(rhs):
                if lhs == next(iter(augmented)):
                    put(action, (i, ENDMARK), "acc")
                else:
                    prod_no = productions.index((lhs, rhs))
                    for terminal in follow.get(lhs, set()):
                        put(action, (i, terminal), f"r{prod_no}")
    return terminals, nonterminals, productions, action, goto_table, conflicts