from first_follow import calculate_first, first_of_sequence, ENDMARK
from lr0 import _augment


def closure_lr1(items, grammar, first):
    result = set(items)
    changed = True
    while changed:
        changed = False
        for lhs, rhs, dot, lookahead in list(result):
            if dot < len(rhs) and rhs[dot] in grammar:
                next_nt = rhs[dot]
                beta = list(rhs[dot + 1:]) + [lookahead]
                lookaheads = first_of_sequence(beta, first, grammar) - {"ε"}
                for production in grammar[next_nt]:
                    for la in lookaheads:
                        item = (next_nt, tuple(production), 0, la)
                        if item not in result:
                            result.add(item)
                            changed = True
    return frozenset(result)


def goto_lr1(items, symbol, grammar, first):
    moved = {
        (lhs, rhs, dot + 1, la)
        for lhs, rhs, dot, la in items
        if dot < len(rhs) and rhs[dot] == symbol
    }
    return closure_lr1(moved, grammar, first) if moved else frozenset()


def canonical_lr1_collection(grammar, first=None):
    first = first or calculate_first(grammar)
    augmented, _, augmented_start = _augment(grammar)
    original_start = next(iter(grammar))
    start_items = closure_lr1(
        {(augmented_start, (original_start,), 0, ENDMARK)},
        augmented,
        first,
    )
    states = [start_items]
    transitions = {}
    seen = {start_items: 0}
    i = 0
    while i < len(states):
        state = states[i]
        symbols = sorted({
            rhs[dot]
            for lhs, rhs, dot, la in state
            if dot < len(rhs)
        })
        for symbol in symbols:
            target = goto_lr1(state, symbol, augmented, first)
            if target:
                if target not in seen:
                    seen[target] = len(states)
                    states.append(target)
                transitions[(i, symbol)] = seen[target]
        i += 1
    return augmented, states, transitions


def print_lr1_item(item):
    lhs, rhs, dot, lookahead = item
    parts = list(rhs)
    parts.insert(dot, "·")
    return f"{lhs} → {' '.join(parts)}, {lookahead}"