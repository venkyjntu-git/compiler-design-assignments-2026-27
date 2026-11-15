from typing import List, Dict, Set, Any
from compiler.cfg import CFG
from compiler.dataflow.framework import DataFlowAnalysis, IterationStep

class AvailableExpressions(DataFlowAnalysis):
    def __init__(self, cfg: CFG):
        super().__init__(cfg)
        self.universal_set_items = sorted(list(set(cfg.expressions)))
        self.block_gen: Dict[str, Set[str]] = {}
        self.block_kill: Dict[str, Set[str]] = {}

    @property
    def name(self) -> str:
        return "Available Expressions"

    @property
    def direction(self) -> str:
        return "forward"

    @property
    def meet_operator(self) -> str:
        return "∩ (Intersection)"

    @property
    def confluence_equation(self) -> str:
        return "IN[B] = ⋂_{P ∈ Pred(B)} OUT[P]"

    @property
    def transfer_equation(self) -> str:
        return "OUT[B] = GEN[B] ∪ (IN[B] − KILL[B])"

    @property
    def universal_set(self) -> List[str]:
        return self.universal_set_items

    def _operands_of_expr(self, expr_str: str) -> Set[str]:
        parts = expr_str.split()
        ops = set()
        for p in parts:
            if p not in ('+', '-', '*', '/', '%', '&', '|', '^', '<<', '>>', '~', 'not', '==', '!=', '<', '>', '<=', '>='):
                ops.add(p)
        return ops

    def compute_local_sets(self):
        U = set(self.universal_set_items)

        for b in self.cfg.blocks:
            self.block_gen[b.id] = set()
            self.block_kill[b.id] = set()

        for block in self.user_blocks:
            gen: Set[str] = set()
            killed_operands: Set[str] = set()

            for instr in block.instructions:
                if instr.expr and instr.expr in U:
                    gen.add(instr.expr)

                if instr.def_var:
                    killed_operands.add(instr.def_var)
                    # Kill from gen any expression using this defined var
                    gen = {e for e in gen if instr.def_var not in self._operands_of_expr(e)}

            kill: Set[str] = set()
            for e in U:
                if self._operands_of_expr(e).intersection(killed_operands):
                    kill.add(e)

            self.block_gen[block.id] = gen
            self.block_kill[block.id] = kill

    def run(self) -> Dict[str, Any]:
        self.compute_local_sets()
        U = set(self.universal_set_items)

        in_sets: Dict[str, Set[str]] = {}
        out_sets: Dict[str, Set[str]] = {}

        # Boundary condition: OUT[ENTRY] = ∅
        in_sets["ENTRY"] = set()
        out_sets["ENTRY"] = set()

        # Initial values: OUT[B] = U for all B != ENTRY
        for b in self.cfg.blocks:
            if b.id != "ENTRY":
                in_sets[b.id] = set(U)
                out_sets[b.id] = set(U)

        initial_in = {k: sorted(list(v)) for k, v in in_sets.items()}
        initial_out = {k: sorted(list(v)) for k, v in out_sets.items()}

        self.steps.clear()
        iteration = 1
        changed = True
        pred_map = {b.id: b.predecessors for b in self.cfg.blocks}

        while changed and iteration <= 30:
            changed = False
            for block in self.cfg.blocks:
                b_id = block.id
                if b_id == "ENTRY":
                    continue

                preds = pred_map.get(b_id, [])
                if not preds:
                    new_in = set()
                else:
                    # Meet: INTERSECTION (∩)
                    first_pred = preds[0]
                    intersected = set(out_sets.get(first_pred, set()))
                    for p in preds[1:]:
                        intersected = intersected.intersection(out_sets.get(p, set()))
                    new_in = intersected

                gen = self.block_gen.get(b_id, set())
                kill = self.block_kill.get(b_id, set())
                new_out = gen.union(new_in - kill)

                in_diff = new_in != in_sets[b_id]
                out_diff = new_out != out_sets[b_id]
                step_changed = in_diff or out_diff

                if step_changed:
                    changed = True

                explanation_parts = []
                if preds:
                    explanation_parts.append(f"IN = ∩ OUT({', '.join(preds)}) = {{{', '.join(sorted(new_in)) or '∅'}}}")
                else:
                    explanation_parts.append("IN = ∅ (No predecessors)")
                explanation_parts.append(f"OUT = GEN ∪ (IN − KILL) = {{{', '.join(sorted(new_out)) or '∅'}}}")

                self.steps.append(IterationStep(
                    iteration=iteration,
                    block_id=b_id,
                    direction="forward",
                    in_set=sorted(list(new_in)),
                    out_set=sorted(list(new_out)),
                    gen_set=sorted(list(gen)),
                    kill_set=sorted(list(kill)),
                    has_changed=step_changed,
                    explanation=" | ".join(explanation_parts)
                ))

                in_sets[b_id] = new_in
                out_sets[b_id] = new_out

            iteration += 1

        self.total_iterations = iteration - 1

        # Diagnostics: Common Subexpression Elimination (CSE)
        diagnostics = []
        for block in self.user_blocks:
            current_avail = set(in_sets.get(block.id, set()))
            for instr in block.instructions:
                if instr.expr and instr.expr in current_avail:
                    diagnostics.append({
                        "type": "cse_opportunity",
                        "severity": "success",
                        "message": f"Common Subexpression: Expression '{instr.expr}' at line {instr.c_line} ('{instr.c_stmt or instr.raw}') is already available and can be reused.",
                        "block": block.id,
                        "line": instr.c_line,
                        "source": "Available Expressions"
                    })
                if instr.expr:
                    current_avail.add(instr.expr)
                if instr.def_var:
                    current_avail = {e for e in current_avail if instr.def_var not in self._operands_of_expr(e)}

        return {
            "analysis_type": self.name,
            "direction": self.direction,
            "meet_operator": self.meet_operator,
            "confluence_equation": self.confluence_equation,
            "transfer_equation": self.transfer_equation,
            "universal_set": self.universal_set,
            "block_gen": {k: sorted(list(v)) for k, v in self.block_gen.items()},
            "block_kill": {k: sorted(list(v)) for k, v in self.block_kill.items()},
            "initial_in": initial_in,
            "initial_out": initial_out,
            "final_in": {k: sorted(list(v)) for k, v in in_sets.items()},
            "final_out": {k: sorted(list(v)) for k, v in out_sets.items()},
            "steps": [s.to_dict() for s in self.steps],
            "total_iterations": self.total_iterations,
            "diagnostics": diagnostics
        }
