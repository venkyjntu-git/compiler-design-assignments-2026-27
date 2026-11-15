from typing import List, Dict, Set, Any
from models import CFGGraph, AnalysisResult, IterationStep

class AvailableExpressionsAnalysis:
    def __init__(self, cfg: CFGGraph):
        self.cfg = cfg
        self.universal_set = sorted(list(set(cfg.expressions)))
        self.user_blocks = [b for b in self.cfg.blocks if not b.is_entry and not b.is_exit]
        self.block_gen: Dict[str, Set[str]] = {}
        self.block_kill: Dict[str, Set[str]] = {}

    def _operands_of_expr(self, expr_str: str) -> Set[str]:
        parts = expr_str.split()
        ops = set()
        for p in parts:
            if p not in ('+', '-', '*', '/', '%', '&', '|', '^', '<<', '>>', '~', 'not'):
                ops.add(p)
        return ops

    def compute_gen_kill(self):
        U = set(self.universal_set)

        self.block_gen["ENTRY"] = set()
        self.block_kill["ENTRY"] = set()
        self.block_gen["EXIT"] = set()
        self.block_kill["EXIT"] = set()

        for block in self.user_blocks:
            gen = set()
            killed_operands = set()

            for instr in block.instructions:
                # If instruction computes an expression
                if instr.expr and instr.expr in U:
                    # An expression is generated if its operands are not redefined later in the block
                    gen.add(instr.expr)

                # If instruction redefines a variable, kill all expressions in gen and in U involving this variable
                if instr.def_var:
                    killed_operands.add(instr.def_var)
                    # Remove from gen any expression that uses this defined var
                    gen = {e for e in gen if instr.def_var not in self._operands_of_expr(e)}

            # KILL[B] = all expressions in U where any operand is redefined in B
            kill = set()
            for e in U:
                operands = self._operands_of_expr(e)
                if operands.intersection(killed_operands):
                    kill.add(e)

            self.block_gen[block.id] = gen
            self.block_kill[block.id] = kill

    def run(self) -> AnalysisResult:
        self.compute_gen_kill()
        U = set(self.universal_set)

        in_sets: Dict[str, Set[str]] = {}
        out_sets: Dict[str, Set[str]] = {}

        # Initialization:
        # OUT[ENTRY] = empty
        # OUT[B] = U for all B != ENTRY
        in_sets["ENTRY"] = set()
        out_sets["ENTRY"] = set()

        for block in self.cfg.blocks:
            if block.id != "ENTRY":
                in_sets[block.id] = set(U)
                out_sets[block.id] = set(U)

        initial_in = {k: sorted(list(v)) for k, v in in_sets.items()}
        initial_out = {k: sorted(list(v)) for k, v in out_sets.items()}

        steps: List[IterationStep] = []
        iteration = 1
        changed = True

        pred_map: Dict[str, List[str]] = {b.id: b.predecessors for b in self.cfg.blocks}

        while changed and iteration <= 25:
            changed = False
            for block in self.cfg.blocks:
                b_id = block.id
                if b_id == "ENTRY":
                    continue

                preds = pred_map.get(b_id, [])
                if not preds:
                    new_in = set()
                else:
                    # Meet operator: INTERSECTION (∩)
                    # First predecessor's OUT
                    first_pred = preds[0]
                    intersected = set(out_sets.get(first_pred, set()))
                    for p in preds[1:]:
                        intersected = intersected.intersection(out_sets.get(p, set()))
                    new_in = intersected

                gen = self.block_gen.get(b_id, set())
                kill = self.block_kill.get(b_id, set())
                new_out = gen.union(new_in - kill)

                in_changed = new_in != in_sets[b_id]
                out_changed = new_out != out_sets[b_id]
                block_changed = in_changed or out_changed

                if block_changed:
                    changed = True

                explanation_parts = []
                if preds:
                    explanation_parts.append(f"IN = ∩ OUT({', '.join(preds)}) = {{{', '.join(sorted(new_in)) or '∅'}}}")
                else:
                    explanation_parts.append("IN = ∅ (No predecessors)")
                explanation_parts.append(f"OUT = GEN ∪ (IN - KILL) = {{{', '.join(sorted(new_out)) or '∅'}}}")

                steps.append(IterationStep(
                    iteration=iteration,
                    block_id=b_id,
                    direction="forward",
                    in_set=sorted(list(new_in)),
                    out_set=sorted(list(new_out)),
                    gen_set=sorted(list(gen)),
                    kill_set=sorted(list(kill)),
                    has_changed=block_changed,
                    explanation=" | ".join(explanation_parts)
                ))

                in_sets[b_id] = new_in
                out_sets[b_id] = new_out

            iteration += 1

        # Diagnostics: Common Subexpression Elimination (CSE)
        diagnostics = []
        for block in self.user_blocks:
            avail = set(in_sets.get(block.id, set()))
            for instr in block.instructions:
                if instr.expr and instr.expr in avail:
                    diagnostics.append({
                        "type": "cse_opportunity",
                        "severity": "success",
                        "message": f"Common Subexpression: Expression '{instr.expr}' at line {instr.id} ({instr.raw}) is already available and can be eliminated.",
                        "block": block.id,
                        "line": instr.id
                    })
                if instr.expr:
                    avail.add(instr.expr)
                if instr.def_var:
                    # Invalidate expressions with defined var
                    avail = {e for e in avail if instr.def_var not in self._operands_of_expr(e)}

        return AnalysisResult(
            analysis_type="Available Expressions",
            direction="forward",
            meet_operator="∩ (Intersection)",
            universal_set=self.universal_set,
            block_gen={k: sorted(list(v)) for k, v in self.block_gen.items()},
            block_kill={k: sorted(list(v)) for k, v in self.block_kill.items()},
            initial_in=initial_in,
            initial_out=initial_out,
            final_in={k: sorted(list(v)) for k, v in in_sets.items()},
            final_out={k: sorted(list(v)) for k, v in out_sets.items()},
            steps=steps,
            total_iterations=iteration - 1,
            diagnostics=diagnostics
        )
