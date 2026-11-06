DEFAULT_PRECEDENCE = {
    "+": (1, "left"),
    "-": (1, "left"),
    "*": (2, "left"),
    "/": (2, "left"),
    "^": (3, "right"),
}


class ConflictReportItem(str):
    def __new__(cls, text, data):
        obj = super().__new__(cls, text)
        obj.data = data
        return obj

    def __getitem__(self, key):
        if isinstance(key, str):
            return self.data[key]
        return super().__getitem__(key)

    def get(self, key, default=None):
        return self.data.get(key, default)


def resolve_conflicts(action, conflicts, productions, precedence=None):
    precedence = precedence or DEFAULT_PRECEDENCE
    report, unresolved = [], []

    for state, terminal, old_action, new_action in conflicts:
        actions = {old_action, new_action}
        shifts = [a for a in actions if a.startswith("s")]
        reductions = [a for a in actions if a.startswith("r")]

        if len(shifts) == 1 and len(reductions) == 1 and terminal in precedence:
            shift = shifts[0]
            reduce = reductions[0]
            prod_no = int(reduce[1:])
            lhs, rhs = productions[prod_no]
            prod_prec = next((precedence[s] for s in reversed(rhs) if s in precedence), None)
            token_prec = precedence[terminal]

            if prod_prec is None:
                unresolved.append((state, terminal, old_action, new_action))
                continue

            token_level, associativity = token_prec
            prod_level, _ = prod_prec

            if token_level > prod_level:
                chosen = shift
                reason = f"shift because {terminal} has higher precedence"
            elif token_level < prod_level:
                chosen = reduce
                reason = "reduce because the production has higher precedence"
            elif associativity == "left":
                chosen = reduce
                reason = "reduce because the operator is left-associative"
            elif associativity == "right":
                chosen = shift
                reason = "shift because the operator is right-associative"
            else:
                chosen = None
                reason = "non-associative operator"

            if chosen is None:
                action.pop((state, terminal), None)
                unresolved.append((state, terminal, old_action, new_action))
            else:
                action[(state, terminal)] = chosen
                text = f"State {state}, {terminal}: kept {chosen} ({reason})."
                data = {
                    "state": state,
                    "lookahead": terminal,
                    "original_actions": (old_action, new_action),
                    "selected_action": chosen,
                    "reason": reason,
                }
                report.append(ConflictReportItem(text, data))
        else:
            unresolved.append((state, terminal, old_action, new_action))

    return action, report, unresolved