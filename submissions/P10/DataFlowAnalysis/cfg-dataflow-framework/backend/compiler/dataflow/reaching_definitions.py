from typing import List, Dict, Set, Any
from compiler.cfg import CFG
from compiler.dataflow.framework import DataFlowAnalysis, IterationStep

class ReachingDefinitions(DataFlowAnalysis):
    def __init__(self, cfg: CFG):
        super().__init__(cfg)
        self.definitions = cfg.definitions
        self.def_map = {d["id"]: d for d in self.definitions}
        self.var_to_defs: Dict[str, Set[str]] = {}
        for d in self.definitions:
            self.var_to_defs.setdefault(d["var"], set()).add(d["id"])

        self.block_gen: Dict[str, Set[str]] = {}
        self.block_kill: Dict[str, Set[str]] = {}

    @property
    def name(self) -> str:
        return "Reaching Definitions"

    @property
    def direction(self) -> str:
        return "forward"

    @property
    def meet_operator(self) -> str:
        return "∪ (Union)"

    @property
    def confluence_equation(self) -> str:
        return "IN[B] = ⋃_{P ∈ Pred(B)} OUT[P]"

    @property
    def transfer_equation(self) -> str:
        return "OUT[B] = GEN[B] ∪ (IN[B] − KILL[B])"

    @property
    def universal_set(self) -> List[str]:
        return [d["id"] for d in self.definitions]

    def compute_local_sets(self):
        for b in self.cfg.blocks:
            self.block_gen[b.id] = set()
            self.block_kill[b.id] = set()

        for block in self.user_blocks:
            gen: Set[str] = set()
            killed_vars: Set[str] = set()

            for instr in block.instructions:
                if instr.def_var:
                    d_obj = next((d for d in self.definitions if d["instr_id"] == instr.id), None)
                    if d_obj:
                        d_id = d_obj["id"]
                        # Remove prior defs of this var in block's gen
                        gen = {d for d in gen if self.def_map[d]["var"] != instr.def_var}
                        gen.add(d_id)
                        killed_vars.add(instr.def_var)

            # KILL[B] = all other definitions in program defining variables assigned in B
            kill: Set[str] = set()
            for var in killed_vars:
                all_defs = self.var_to_defs.get(var, set())
                kill.update(all_defs - gen)

            self.block_gen[block.id] = gen
            self.block_kill[block.id] = kill

    def run(self) -> Dict[str, Any]:
        self.compute_local_sets()

        in_sets: Dict[str, Set[str]] = {b.id: set() for b in self.cfg.blocks}
        out_sets: Dict[str, Set[str]] = {b.id: set(self.block_gen.get(b.id, set())) for b in self.cfg.blocks}

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

                # 1. IN[B] = Union_{P in Pred(B)} OUT[P]
                preds = pred_map.get(b_id, [])
                new_in = set()
                if preds:
                    for p in preds:
                        new_in.update(out_sets.get(p, set()))

                # 2. OUT[B] = GEN[B] Union (IN[B] - KILL[B])
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
                    explanation_parts.append(f"IN = ∪ OUT({', '.join(preds)}) = {{{', '.join(sorted(new_in)) or '∅'}}}")
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

        # Diagnostics: detect uninitialized variables
        diagnostics = []
        for block in self.user_blocks:
            current_in_defs = in_sets.get(block.id, set())
            defined_vars = {self.def_map[d]["var"] for d in current_in_defs if d in self.def_map}

            for instr in block.instructions:
                for used_var in instr.use_vars:
                    if not used_var.startswith("t") and used_var not in defined_vars:
                        diagnostics.append({
                            "type": "uninitialized_warning",
                            "severity": "warning",
                            "message": f"Variable '{used_var}' may be read before being initialized (at line {instr.c_line}: '{instr.c_stmt or instr.raw}')",
                            "block": block.id,
                            "line": instr.c_line,
                            "source": "Reaching Definitions"
                        })
                if instr.def_var:
                    defined_vars.add(instr.def_var)

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
            "definitions_table": self.definitions,
            "diagnostics": diagnostics
        }
