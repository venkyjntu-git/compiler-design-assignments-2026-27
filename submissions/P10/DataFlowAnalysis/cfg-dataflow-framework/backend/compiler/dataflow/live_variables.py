from typing import List, Dict, Set, Any
from compiler.cfg import CFG
from compiler.dataflow.framework import DataFlowAnalysis, IterationStep

class LiveVariables(DataFlowAnalysis):
    def __init__(self, cfg: CFG):
        super().__init__(cfg)
        self.variables = sorted(list(set(cfg.variables)))
        self.block_def: Dict[str, Set[str]] = {}
        self.block_use: Dict[str, Set[str]] = {}

    @property
    def name(self) -> str:
        return "Live Variable Analysis"

    @property
    def direction(self) -> str:
        return "backward"

    @property
    def meet_operator(self) -> str:
        return "∪ (Union)"

    @property
    def confluence_equation(self) -> str:
        return "OUT[B] = ⋃_{S ∈ Succ(B)} IN[S]"

    @property
    def transfer_equation(self) -> str:
        return "IN[B] = USE[B] ∪ (OUT[B] − DEF[B])"

    @property
    def universal_set(self) -> List[str]:
        return self.variables

    def compute_local_sets(self):
        for b in self.cfg.blocks:
            self.block_def[b.id] = set()
            self.block_use[b.id] = set()

        for block in self.user_blocks:
            defs: Set[str] = set()
            uses: Set[str] = set()

            for instr in block.instructions:
                # Any variable used before being defined in this block
                for u in instr.use_vars:
                    if u not in defs:
                        uses.add(u)
                if instr.def_var:
                    defs.add(instr.def_var)

            self.block_use[block.id] = uses
            self.block_def[block.id] = defs

    def run(self) -> Dict[str, Any]:
        self.compute_local_sets()

        in_sets: Dict[str, Set[str]] = {b.id: set() for b in self.cfg.blocks}
        out_sets: Dict[str, Set[str]] = {b.id: set() for b in self.cfg.blocks}

        initial_in = {k: sorted(list(v)) for k, v in in_sets.items()}
        initial_out = {k: sorted(list(v)) for k, v in out_sets.items()}

        self.steps.clear()
        iteration = 1
        changed = True

        succ_map = {b.id: b.successors for b in self.cfg.blocks}
        # Backward traversal: reverse order (EXIT towards ENTRY)
        reversed_blocks = list(reversed(self.cfg.blocks))

        while changed and iteration <= 30:
            changed = False
            for block in reversed_blocks:
                b_id = block.id

                # 1. OUT[B] = Union_{S in Succ(B)} IN[S]
                succs = succ_map.get(b_id, [])
                new_out = set()
                if succs:
                    for s in succs:
                        new_out.update(in_sets.get(s, set()))

                # 2. IN[B] = USE[B] Union (OUT[B] - DEF[B])
                use = self.block_use.get(b_id, set())
                def_ = self.block_def.get(b_id, set())
                new_in = use.union(new_out - def_)

                in_diff = new_in != in_sets[b_id]
                out_diff = new_out != out_sets[b_id]
                step_changed = in_diff or out_diff

                if step_changed:
                    changed = True

                explanation_parts = []
                if succs:
                    explanation_parts.append(f"OUT = ∪ IN({', '.join(succs)}) = {{{', '.join(sorted(new_out)) or '∅'}}}")
                else:
                    explanation_parts.append("OUT = ∅ (Program Exit / No successors)")
                explanation_parts.append(f"IN = USE ∪ (OUT − DEF) = {{{', '.join(sorted(new_in)) or '∅'}}}")

                self.steps.append(IterationStep(
                    iteration=iteration,
                    block_id=b_id,
                    direction="backward",
                    in_set=sorted(list(new_in)),
                    out_set=sorted(list(new_out)),
                    gen_set=sorted(list(use)),   # USE is the generator of liveness
                    kill_set=sorted(list(def_)), # DEF is the killer of liveness
                    has_changed=step_changed,
                    explanation=" | ".join(explanation_parts)
                ))

                in_sets[b_id] = new_in
                out_sets[b_id] = new_out

            iteration += 1

        self.total_iterations = iteration - 1

        # Diagnostics: Dead assignment detection
        diagnostics = []
        for block in self.user_blocks:
            current_live = set(out_sets.get(block.id, set()))
            for instr in reversed(block.instructions):
                if instr.def_var and not instr.def_var.startswith("t"):
                    if instr.def_var not in current_live and instr.type not in ("return", "call"):
                        diagnostics.append({
                            "type": "dead_assignment",
                            "severity": "info",
                            "message": f"Dead assignment: Variable '{instr.def_var}' is assigned at line {instr.c_line} ('{instr.c_stmt or instr.raw}'), but is never live afterwards.",
                            "block": block.id,
                            "line": instr.c_line,
                            "source": "Live Variable Analysis"
                        })
                    current_live.discard(instr.def_var)
                for u in instr.use_vars:
                    current_live.add(u)

        return {
            "analysis_type": self.name,
            "direction": self.direction,
            "meet_operator": self.meet_operator,
            "confluence_equation": self.confluence_equation,
            "transfer_equation": self.transfer_equation,
            "universal_set": self.universal_set,
            "block_gen": {k: sorted(list(v)) for k, v in self.block_use.items()},  # USE
            "block_kill": {k: sorted(list(v)) for k, v in self.block_def.items()}, # DEF
            "initial_in": initial_in,
            "initial_out": initial_out,
            "final_in": {k: sorted(list(v)) for k, v in in_sets.items()},
            "final_out": {k: sorted(list(v)) for k, v in out_sets.items()},
            "steps": [s.to_dict() for s in self.steps],
            "total_iterations": self.total_iterations,
            "diagnostics": diagnostics
        }
