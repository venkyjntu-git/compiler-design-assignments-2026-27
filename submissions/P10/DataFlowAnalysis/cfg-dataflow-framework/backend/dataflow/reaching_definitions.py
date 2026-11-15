from typing import List, Dict, Set, Any
from models import CFGGraph, AnalysisResult, IterationStep

class ReachingDefinitionsAnalysis:
    def __init__(self, cfg: CFGGraph):
        self.cfg = cfg
        self.definitions = cfg.definitions  # list of dicts: id, var, instr_id, code, block
        self.def_map = {d["id"]: d for d in self.definitions}
        self.var_to_defs: Dict[str, Set[str]] = {}
        for d in self.definitions:
            self.var_to_defs.setdefault(d["var"], set()).add(d["id"])

        self.user_blocks = [b for b in self.cfg.blocks if not b.is_entry and not b.is_exit]
        self.block_gen: Dict[str, Set[str]] = {}
        self.block_kill: Dict[str, Set[str]] = {}

    def compute_gen_kill(self):
        all_def_ids = set(self.def_map.keys())

        # For ENTRY and EXIT
        self.block_gen["ENTRY"] = set()
        self.block_kill["ENTRY"] = set()
        self.block_gen["EXIT"] = set()
        self.block_kill["EXIT"] = set()

        for block in self.user_blocks:
            gen = set()
            killed_vars = set()

            # Process instructions in order within the block
            # If d_i: x = ..., it generates d_i and kills any previous def of x inside the block
            # At block level: GEN[B] is the set of definitions that reach the end of B
            for instr in block.instructions:
                if instr.def_var:
                    # Find definition id for this instruction
                    d_obj = next((d for d in self.definitions if d["instr_id"] == instr.id), None)
                    if d_obj:
                        d_id = d_obj["id"]
                        # Remove prior defs of this var in gen
                        gen = {d for d in gen if self.def_map[d]["var"] != instr.def_var}
                        gen.add(d_id)
                        killed_vars.add(instr.def_var)

            # KILL[B] = all other definitions in the program of the variables defined in B
            kill = set()
            for var in killed_vars:
                all_defs_of_var = self.var_to_defs.get(var, set())
                # Kills all definitions of var NOT generated as the final def in this block
                kill.update(all_defs_of_var - gen)

            self.block_gen[block.id] = gen
            self.block_kill[block.id] = kill

    def run(self) -> AnalysisResult:
        self.compute_gen_kill()

        in_sets: Dict[str, Set[str]] = {b.id: set() for b in self.cfg.blocks}
        out_sets: Dict[str, Set[str]] = {b.id: set() for b in self.cfg.blocks}

        # Initialize OUT[B] = GEN[B] for forward analysis
        for b in self.cfg.blocks:
            out_sets[b.id] = set(self.block_gen.get(b.id, set()))

        initial_in = {k: sorted(list(v)) for k, v in in_sets.items()}
        initial_out = {k: sorted(list(v)) for k, v in out_sets.items()}

        steps: List[IterationStep] = []
        iteration = 1
        changed = True

        # Pred lookup
        pred_map: Dict[str, List[str]] = {b.id: b.predecessors for b in self.cfg.blocks}

        while changed and iteration <= 25:
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

                in_changed = new_in != in_sets[b_id]
                out_changed = new_out != out_sets[b_id]
                block_changed = in_changed or out_changed

                if block_changed:
                    changed = True

                explanation_parts = []
                if preds:
                    explanation_parts.append(f"IN = ∪ OUT({', '.join(preds)}) = {{{', '.join(sorted(new_in)) or '∅'}}}")
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

        # Diagnostics: detect potentially uninitialized variables
        diagnostics = []
        for block in self.user_blocks:
            b_in_defs = in_sets.get(block.id, set())
            defined_vars_so_far = {self.def_map[d]["var"] for d in b_in_defs if d in self.def_map}
            
            for instr in block.instructions:
                for used_var in instr.use_vars:
                    if used_var not in defined_vars_so_far:
                        diagnostics.append({
                            "type": "uninitialized_warning",
                            "severity": "warning",
                            "message": f"Variable '{used_var}' at line {instr.id} ({instr.raw}) may be used without prior definition reaching this point.",
                            "block": block.id,
                            "line": instr.id
                        })
                if instr.def_var:
                    defined_vars_so_far.add(instr.def_var)

        universal_set = [d["id"] for d in self.definitions]

        return AnalysisResult(
            analysis_type="Reaching Definitions",
            direction="forward",
            meet_operator="∪ (Union)",
            universal_set=universal_set,
            block_gen={k: sorted(list(v)) for k, v in self.block_gen.items()},
            block_kill={k: sorted(list(v)) for k, v in self.block_kill.items()},
            initial_in=initial_in,
            initial_out=initial_out,
            final_in={k: sorted(list(v)) for k, v in in_sets.items()},
            final_out={k: sorted(list(v)) for k, v in out_sets.items()},
            steps=steps,
            total_iterations=iteration - 1,
            definitions_table=self.definitions,
            diagnostics=diagnostics
        )
