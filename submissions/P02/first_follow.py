EPSILON = "ε"
ENDMARK = "$"


def calculate_first(grammar):
    first = {nt: set() for nt in grammar}
    changed = True

    while changed:
        changed = False
        for lhs, alternatives in grammar.items():
            for rhs in alternatives:
                if not rhs:
                    if EPSILON not in first[lhs]:
                        first[lhs].add(EPSILON)
                        changed = True
                    continue

                nullable_prefix = True
                for symbol in rhs:
                    if symbol in grammar:
                        additions = first[symbol] - {EPSILON}
                        before = len(first[lhs])
                        first[lhs].update(additions)
                        changed |= len(first[lhs]) != before
                        if EPSILON not in first[symbol]:
                            nullable_prefix = False
                            break
                    else:
                        if symbol not in first[lhs]:
                            first[lhs].add(symbol)
                            changed = True
                        nullable_prefix = False
                        break

                if nullable_prefix and EPSILON not in first[lhs]:
                    first[lhs].add(EPSILON)
                    changed = True
    return first


def first_of_sequence(sequence, first, grammar):
    result = set()
    if not sequence:
        return {EPSILON}

    for symbol in sequence:
        if symbol in grammar:
            result.update(first[symbol] - {EPSILON})
            if EPSILON not in first[symbol]:
                return result
        else:
            result.add(symbol)
            return result

    result.add(EPSILON)
    return result


def calculate_follow(grammar, first=None, start_symbol=None):
    if not grammar:
        return {}
    first = first or calculate_first(grammar)
    start_symbol = start_symbol or next(iter(grammar))
    follow = {nt: set() for nt in grammar}
    follow[start_symbol].add(ENDMARK)

    changed = True
    while changed:
        changed = False
        for lhs, alternatives in grammar.items():
            for rhs in alternatives:
                for i, symbol in enumerate(rhs):
                    if symbol not in grammar:
                        continue
                    beta_first = first_of_sequence(rhs[i + 1:], first, grammar)
                    before = len(follow[symbol])
                    follow[symbol].update(beta_first - {EPSILON})
                    if EPSILON in beta_first:
                        follow[symbol].update(follow[lhs])
                    changed |= len(follow[symbol]) != before
    return follow