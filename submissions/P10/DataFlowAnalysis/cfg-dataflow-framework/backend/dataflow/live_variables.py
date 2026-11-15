from typing import List, Dict, Set, Any
from models import CFGGraph, AnalysisResult, IterationStep

class LiveVariablesAnalysis:
    def __init__(self, cfg: CFGGraph):
        self.cfg = cfg
        self.variables = sorted(list(set(cfg.variables)))
        self.user_blocks = [b for b in self.cfg.blocks if not b.is_entry and not b.is_exit]
        self.block_def: Dict[str, Set[str]] = {}
        self.block_use: Dict[str, Set[str]] = {}

    def compute_use_def(self):
        self.block_def["ENTRY"] = set()
        self.block_use["ENTRY"] = set()
        self.block_def["EXIT"] = set()
        self.block_use["EXIT"] = set()

        for block in self.user_blocks:
            defs = set()
            uses = set()

            for instr in block.instructions:
                # Any variable used before being defined in this block is in USE[B]
                for u in instr.use_vars:
                    if u not in defs:
                        uses.add(u)
                
                # If variable is defined, add to defs
                if instr.def_var:
                    defs.add(instr.def_var)

            self.block_use[block.id] = uses
            self.block_def[block.id] = defs

    def run(self) -> AnalysisResult:
        self.compute_use_def()

        in_sets: Dict[str, Set[str]] = {b.id: set() for b in self.cfg.blocks}
        out_sets: Dict[str, Set[str]] = {b.id: set() for b in self.cfg.blocks}

        initial_in = {k: sorted(list(v)) for k, v in in_sets.items()}
        initial_out = {k: sorted(list(v)) for k, v in out_sets.items()}

        steps: List[IterationStep] = []
        iteration = 1
        changed = True

        succ_map: Dict[str, List[str]] = {b.id: b.successors for b in self.cfg.blocks}
        # Backward traversal: reverse order of blocks (EXIT to ENTRY)
        reversed_blocks = list(reversed(self.cfg.blocks))

        while changed and iteration <= 25:
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

                in_changed = new_in != in_sets[b_id]
                out_changed = new_out != out_sets[b_id]
                block_changed = in_changed or out_changed

                if block_changed:
                    changed = True

                explanation_parts = []
                if succs:
                    explanation_parts.append(f"OUT = ∪ IN({', '.join(succs)}) = {{{', '.join(sorted(new_out)) or '∅'}}}")
                else:
                    explanation_parts.append("OUT = ∅ (Exit / No successors)")
                explanation_parts.append(f"IN = USE ∪ (OUT - DEF) = {{{', '.join(sorted(new_in)) or '∅'}}}")

                steps.append(IterationStep(
                    iteration=iteration,
                    block_id=b_id,
                    direction="backward",
                    in_set=sorted(list(new_in)),
                    out_set=sorted(list(new_out)),
                    gen_set=sorted(list(use)),      # USE is effectively GEN in backward analysis
                    kill_set=sorted(list(def_)),    # DEF is effectively KILL in backward analysis
                    has_changed=block_changed,
                    explanation=" | ".join(explanation_parts)
                ))

                in_sets[b_id] = new_in
                out_sets[b_id] = new_out

            iteration += 1

        # Diagnostics: Dead assignment detection
        diagnostics = []
        for block in self.user_blocks:
            current_live = set(out_sets.get(block.id, set()))
            # Walk backward inside the block
            for instr in reversed(block.instructions):
                if instr.def_var:
                    # If defined variable is not live immediately after the assignment
                    if instr.def_var not in current_live and instr.type not in ("return", "call"):
                        diagnostics.append({
                            "type": "dead_assignment",
                            "severity": "info",
                            "message": f"Dead assignment: Variable '{instr.def_var}' at line {instr.id} ({instr.raw}) is assigned but its value is never live.",
                            "block": block.id,
                            "line": instr.id
                        })
                    # Update live: remove defined var
                    current_live.discard(instr.def_var)
                # Add used variables
                for u in instr.use_vars:
                    current_live.add(u)

        return AnalysisResult(
            analysis_type="Live Variable Analysis",
            direction="backward",
            meet_operator="∪ (Union)",
            universal_set=self.variables,
            block_gen={k: sorted(list(v)) for k, v in self.block_use.items()},  # USE
            block_kill={k: sorted(list(v)) for k, v in self.block_def.items()}, # DEF
            initial_in=initial_in,
            initial_out=initial_out,
            final_in={k: sorted(list(v)) for k, v in in_sets.items()},
            final_out={k: sorted(list(v)) for k, v in out_sets.items()},
            steps=steps,
            total_iterations=iteration - 1,
            diagnostics=diagnostics
        )
