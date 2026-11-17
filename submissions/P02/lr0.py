from grammer import read_grammar

__all__ = ["read_grammar", "closure", "goto", "canonical_collection", "format_item", "_augment"]


def _augment(grammar):
    start = next(iter(grammar))
    augmented_start = start + "'"
    while augmented_start in grammar:
        augmented_start += "'"
    augmented = {augmented_start: [(start,)]}
    augmented.update({lhs: [tuple(rhs) for rhs in rhss] for lhs, rhss in grammar.items()})
    productions = [(lhs, rhs) for lhs, rhss in augmented.items() for rhs in rhss]
    return augmented, productions, augmented_start



def closure(items, grammar):
    result = set(items)
    changed = True
    while changed:
        changed = False
        for lhs, rhs, dot in list(result):
            if dot < len(rhs) and rhs[dot] in grammar:
                for production in grammar[rhs[dot]]:
                    item = (rhs[dot], tuple(production), 0)
                    if item not in result:
                        result.add(item)
                        changed = True
    return frozenset(result)


def goto(items, symbol, grammar):
    moved = {
        (lhs, rhs, dot + 1)
        for lhs, rhs, dot in items
        if dot < len(rhs) and rhs[dot] == symbol
    }
    return closure(moved, grammar) if moved else frozenset()


def canonical_collection(grammar):
    augmented, productions, augmented_start = _augment(grammar)
    start_item = closure({(augmented_start, (next(iter(grammar)),), 0)}, augmented)
    states = [start_item]
    transitions = {}
    seen = {start_item: 0}
    index = 0

    while index < len(states):
        state = states[index]
        symbols = sorted({
            rhs[dot]
            for lhs, rhs, dot in state
            if dot < len(rhs)
        })
        for symbol in symbols:
            target = goto(state, symbol, augmented)
            if target:
                if target not in seen:
                    seen[target] = len(states)
                    states.append(target)
                transitions[(index, symbol)] = seen[target]
        index += 1
    return augmented, states, transitions


def format_item(item):
    lhs, rhs, dot = item
    parts = list(rhs)
    parts.insert(dot, "·")
    return f"{lhs} → {' '.join(parts)}"