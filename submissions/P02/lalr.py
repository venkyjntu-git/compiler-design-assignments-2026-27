def merge_lr1_states(states, transitions):
    core_to_new = {}
    merged_states = []
    old_to_new = {}

    for old_index, state in enumerate(states):
        core = frozenset((lhs, rhs, dot) for lhs, rhs, dot, la in state)
        if core not in core_to_new:
            core_to_new[core] = len(merged_states)
            merged_states.append(set())
        new_index = core_to_new[core]
        old_to_new[old_index] = new_index
        merged_states[new_index].update(state)

    merged_transitions = {}
    for (old_src, symbol), old_dst in transitions.items():
        src, dst = old_to_new[old_src], old_to_new[old_dst]
        key = (src, symbol)
        if key in merged_transitions and merged_transitions[key] != dst:
            raise ValueError("Inconsistent transition while merging LR(1) states.")
        merged_transitions[key] = dst

    return [frozenset(s) for s in merged_states], merged_transitions, old_to_new