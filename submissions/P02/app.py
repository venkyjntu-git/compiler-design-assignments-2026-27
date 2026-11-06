import re
import pandas as pd
import streamlit as st

from first_follow import calculate_first, calculate_follow, ENDMARK, EPSILON
from lr0 import canonical_collection, format_item
from lr1 import canonical_lr1_collection, print_lr1_item
from slr import build_slr_table
from lr1_table import build_lr1_table
from lalr import merge_lr1_states
from precedence import DEFAULT_PRECEDENCE, resolve_conflicts

st.set_page_config(page_title="LR(1) and LALR(1) Parser Workbench", layout="wide")
st.title("LR(1) and LALR(1) Parser Workbench")
st.caption("Grammar analysis, FIRST/FOLLOW, parsing tables, conflict analysis, shift-reduce parsing, and parse-tree visualization.")


def parse_grammar(text):
    grammar = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if "->" in line:
            lhs, rhs_text = line.split("->", 1)
        elif "→" in line:
            lhs, rhs_text = line.split("→", 1)
        else:
            raise ValueError(f"Invalid production (expected ->): {line}")
        lhs = lhs.strip()
        if not lhs:
            raise ValueError("A production has an empty left-hand side.")
        alternatives = []
        for alt in rhs_text.split("|"):
            alt = alt.strip()
            if alt in ("", EPSILON, "epsilon", "ε"):
                rhs = tuple()
            else:
                # Tokenize compact and spaced grammar notation consistently:
                # "(E)" -> "(", "E", ")" and "E+T" -> "E", "+", "T".
                # Keep multi-character identifiers such as "id" as one token.
                rhs = tuple(re.findall(r"[A-Za-z_][A-Za-z0-9_']*|\S", alt))
            alternatives.append(rhs)
        grammar.setdefault(lhs, []).extend(alternatives)
    if not grammar:
        raise ValueError("Enter at least one production.")
    return grammar


def productions_text(productions):
    return [f"{lhs} → {' '.join(rhs) if rhs else EPSILON}" for lhs, rhs in productions]


def item_text(item):
    if len(item) == 3:
        return format_item(item)
    return print_lr1_item(item)


def run_shift_reduce_parser(tokens, productions, action, goto_table, max_steps=500):
    input_tokens = list(tokens) + [ENDMARK]
    stack = [0]
    node_stack = []
    trace = []
    accepted = False
    error_message = None

    for step in range(1, max_steps + 1):
        state = stack[-1]
        lookahead = input_tokens[0]
        current_action = action.get((state, lookahead))
        row = {
            "Step": step,
            "Stack": " ".join(map(str, stack)),
            "Remaining Input": " ".join(input_tokens),
            "Action": current_action or "ERROR",
            "Production": "-",
        }

        if current_action is None:
            trace.append(row)
            error_message = f"No ACTION entry for state {state} and lookahead '{lookahead}'."
            break
        if current_action == "acc":
            trace.append(row)
            accepted = True
            break
        if current_action.startswith("s"):
            trace.append(row)
            target_state = int(current_action[1:])
            stack.extend([lookahead, target_state])
            node_stack.append({"symbol": lookahead, "children": []})
            input_tokens.pop(0)
        elif current_action.startswith("r"):
            production_number = int(current_action[1:])
            if production_number >= len(productions):
                trace.append(row)
                error_message = f"Invalid production number: {production_number}."
                break
            lhs, rhs = productions[production_number]
            rhs = list(rhs)
            row["Production"] = f"{lhs} → {' '.join(rhs) if rhs else EPSILON}"
            trace.append(row)
            if rhs:
                if len(stack) < 2 * len(rhs) + 1 or len(node_stack) < len(rhs):
                    error_message = "Invalid parser stack during reduction."
                    break
                del stack[-2 * len(rhs):]
                children = node_stack[-len(rhs):]
                del node_stack[-len(rhs):]
            else:
                children = []
            node_stack.append({"symbol": lhs, "children": children})
            target_state = goto_table.get((stack[-1], lhs))
            if target_state is None:
                error_message = f"No GOTO entry for state {stack[-1]} and nonterminal '{lhs}'."
                break
            stack.extend([lhs, target_state])
        else:
            trace.append(row)
            error_message = f"Unknown parser action: {current_action}"
            break
    else:
        error_message = f"Parsing stopped after {max_steps} steps."

    parse_tree = node_stack[-1] if accepted and node_stack else None
    return trace, accepted, error_message, parse_tree


def tree_to_text(node, depth=0):
    if not node:
        return ""
    lines = ["  " * depth + str(node["symbol"])]
    for child in node.get("children", []):
        lines.append(tree_to_text(child, depth + 1))
    return "\n".join(lines)


def display_conflicts(conflicts, productions, states):
    if not conflicts:
        st.success("No parsing-table conflicts detected.")
        return
    for state_no, lookahead, old_action, new_action in conflicts:
        with st.expander(f"State {state_no} | Lookahead {lookahead} | {old_action} vs {new_action}", expanded=True):
            actions = [old_action, new_action]
            shifts = [a for a in actions if a.startswith("s")]
            reductions = [a for a in actions if a.startswith("r")]
            if shifts and reductions:
                st.warning("Shift-Reduce Conflict")
                st.write("The parser can shift the next symbol or reduce using a production.")
            elif len(reductions) >= 2:
                st.warning("Reduce-Reduce Conflict")
                st.write("Two different productions can reduce in the same state and lookahead.")
            else:
                st.warning("Other Conflict")
            for action_value in actions:
                st.write(f"**Action:** `{action_value}`")
                if action_value.startswith("r"):
                    n = int(action_value[1:])
                    if n < len(productions):
                        lhs, rhs = productions[n]
                        st.write(f"Reduction production: `{lhs} → {' '.join(rhs) if rhs else EPSILON}`")
                elif action_value.startswith("s"):
                    st.write(f"Shift to state {action_value[1:]}")
            st.markdown("**Items in the conflicting state**")
            if 0 <= state_no < len(states):
                for item in sorted(states[state_no], key=str):
                    st.code(item_text(item))


default_grammar = """S -> C C
C -> c C | d"""
with st.sidebar:
    st.header("Grammar Settings")
    grammar_input = st.text_area("Enter grammar productions", value=default_grammar, height=150)
    parser_choice = st.selectbox("Choose parser", ["SLR(1)", "Canonical LR(1)", "LALR(1)"])
    use_precedence = st.checkbox("Apply default operator precedence")
    analyze = st.button("Analyze Grammar", type="primary", use_container_width=True)

if "analyze" not in st.session_state:
    st.session_state.analyze = True
if analyze:
    st.session_state.analyze = True

if st.session_state.analyze:
    try:
        grammar = parse_grammar(grammar_input)
        first = calculate_first(grammar)
        follow = calculate_follow(grammar, first)
        st.header("1. Grammar and FIRST/FOLLOW")
        st.code("\n".join(f"{lhs} -> {' | '.join(' '.join(rhs) if rhs else EPSILON for rhs in rhss)}" for lhs, rhss in grammar.items()))
        c1, c2 = st.columns(2)
        with c1:
            st.subheader("FIRST Sets")
            st.dataframe(pd.DataFrame([{"Nonterminal": nt, "FIRST": ", ".join(sorted(vals))} for nt, vals in first.items()]), hide_index=True, use_container_width=True)
        with c2:
            st.subheader("FOLLOW Sets")
            st.dataframe(pd.DataFrame([{"Nonterminal": nt, "FOLLOW": ", ".join(sorted(vals))} for nt, vals in follow.items()]), hide_index=True, use_container_width=True)

        if parser_choice == "SLR(1)":
            augmented, states, transitions = canonical_collection(grammar)
            terminals, nonterminals, productions, action, goto_table, conflicts = build_slr_table(grammar, augmented, states, transitions, follow)
        else:
            augmented, lr1_states, lr1_transitions = canonical_lr1_collection(grammar, first)
            if parser_choice == "LALR(1)":
                states, transitions, old_to_new = merge_lr1_states(lr1_states, lr1_transitions)
            else:
                states, transitions = lr1_states, lr1_transitions
            terminals, nonterminals, productions, action, goto_table, conflicts = build_lr1_table(grammar, augmented, states, transitions)

        original_conflicts = list(conflicts)
        precedence_report = []
        unresolved_conflicts = list(conflicts)
        if use_precedence and conflicts:
            action, precedence_report, unresolved_conflicts = resolve_conflicts(action, conflicts, productions, DEFAULT_PRECEDENCE)

        st.header("2. Parser Comparison")
        st.dataframe(pd.DataFrame([{
            "Parser": parser_choice,
            "States": len(states),
            "Conflicts before precedence": len(original_conflicts),
            "Conflicts remaining": len(unresolved_conflicts),
            "Conflicts resolved": len(original_conflicts) - len(unresolved_conflicts),
        }]), hide_index=True, use_container_width=True)

        tab1, tab2, tab3, tab4 = st.tabs(["Parsing Table", "Item Sets", "DFA Transitions", "Conflict Analyzer"])
        with tab1:
            st.subheader("ACTION / GOTO Table")
            columns = sorted(set(terminals) | {ENDMARK}) + [f"GOTO:{nt}" for nt in nonterminals]
            rows = []
            for state_no in range(len(states)):
                row = {"State": state_no}
                for terminal in sorted(set(terminals) | {ENDMARK}):
                    row[terminal] = action.get((state_no, terminal), "")
                for nt in nonterminals:
                    row[f"GOTO:{nt}"] = goto_table.get((state_no, nt), "")
                rows.append(row)
            st.dataframe(pd.DataFrame(rows).fillna("").astype(str), hide_index=True, use_container_width=True)
            if use_precedence and precedence_report:
                st.subheader("Conflict Resolution Report")
                for line in precedence_report:
                    st.write(line)
                st.write("Unresolved conflicts:", len(unresolved_conflicts))
        with tab2:
            for i, state in enumerate(states):
                with st.expander(f"State {i}", expanded=False):
                    for item in sorted(state, key=str):
                        st.code(item_text(item))
        with tab3:
            st.dataframe(pd.DataFrame([{"From": s, "Symbol": sym, "To": t} for (s, sym), t in transitions.items()]), hide_index=True, use_container_width=True)
        with tab4:
            st.subheader("Conflict Analyzer")
            display_conflicts(original_conflicts, productions, states)

        st.header("3. Input String Parser")
        st.caption("Enter whitespace-separated tokens. Example: d d or id + id.")
        input_text = st.text_input("Input string", value="d d")
        if st.button("Parse Input"):
            tokens = input_text.split()
            trace, accepted, error_message, parse_tree = run_shift_reduce_parser(tokens, productions, action, goto_table)
            st.subheader("Shift-Reduce Trace")
            st.dataframe(pd.DataFrame(trace).fillna("-").astype(str), hide_index=True, use_container_width=True)
            if accepted:
                st.success("Input accepted.")
                st.subheader("Parse Tree")
                st.code(tree_to_text(parse_tree))
            else:
                st.error(error_message or "Input was not accepted.")
    except Exception as exc:
        st.error(f"Could not analyze grammar: {exc}")
        st.exception(exc)