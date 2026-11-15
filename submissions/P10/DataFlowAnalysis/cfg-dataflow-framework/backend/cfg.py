from typing import List, Dict, Set, Tuple, Optional
from models import TACInstruction, BasicBlock, CFGEdge, CFGGraph
from tac_parser import TACParser

class CFGBuilder:
    def __init__(self, instructions: List[TACInstruction]):
        self.instructions = instructions
        self.label_to_index: Dict[str, int] = {}  # label_name -> instruction_index (0-based)
        self.leaders: Set[int] = set()           # 0-based indices of leader instructions
        self.leader_reasons: Dict[int, str] = {}
        self.blocks: List[BasicBlock] = []
        self.edges: List[CFGEdge] = []
        self.instr_to_block: Dict[int, str] = {}

    def identify_leaders(self):
        n = len(self.instructions)
        if n == 0:
            return

        # 1. First record all label targets
        for idx, instr in enumerate(self.instructions):
            if instr.type == "label" and instr.target:
                # The label itself or the next instruction is the target
                self.label_to_index[instr.target] = idx

        # Rule 1: The first instruction is a leader
        self.leaders.add(0)
        self.leader_reasons[0] = "Rule 1: First instruction of the program"

        # Scan for Rule 2 and Rule 3
        for idx, instr in enumerate(self.instructions):
            # If it's a jump (conditional or unconditional)
            if instr.type in ("goto", "if_goto"):
                target_label = instr.target
                if target_label and target_label in self.label_to_index:
                    target_idx = self.label_to_index[target_label]
                    self.leaders.add(target_idx)
                    reason = f"Rule 2: Target of jump at instruction #{instr.id} ({instr.raw})"
                    if target_idx not in self.leader_reasons:
                        self.leader_reasons[target_idx] = reason
                    else:
                        self.leader_reasons[target_idx] += f"; {reason}"

                # Rule 3: Any instruction immediately following a jump is a leader
                if idx + 1 < n:
                    self.leaders.add(idx + 1)
                    reason = f"Rule 3: Follows jump at instruction #{instr.id} ({instr.raw})"
                    if (idx + 1) not in self.leader_reasons:
                        self.leader_reasons[idx + 1] = reason
                    else:
                        self.leader_reasons[idx + 1] += f"; {reason}"

        # Mark each instruction
        for idx, instr in enumerate(self.instructions):
            if idx in self.leaders:
                instr.is_leader = True
                instr.leader_reason = self.leader_reasons.get(idx, "Leader")

    def build_basic_blocks(self):
        sorted_leaders = sorted(list(self.leaders))
        n = len(self.instructions)

        # Create ENTRY block
        entry_block = BasicBlock(
            id="ENTRY",
            name="ENTRY",
            instructions=[],
            predecessors=[],
            successors=[],
            is_entry=True
        )
        self.blocks.append(entry_block)

        for i, leader_idx in enumerate(sorted_leaders):
            next_leader_idx = sorted_leaders[i + 1] if i + 1 < len(sorted_leaders) else n
            block_instrs = self.instructions[leader_idx:next_leader_idx]
            block_id = f"B{i + 1}"
            
            block = BasicBlock(
                id=block_id,
                name=f"Block {i + 1}",
                instructions=block_instrs,
                predecessors=[],
                successors=[]
            )
            self.blocks.append(block)

            for instr_idx in range(leader_idx, next_leader_idx):
                self.instr_to_block[instr_idx] = block_id

        # Create EXIT block
        exit_block = BasicBlock(
            id="EXIT",
            name="EXIT",
            instructions=[],
            predecessors=[],
            successors=[],
            is_exit=True
        )
        self.blocks.append(exit_block)

    def build_edges(self):
        # Entry edge to the first basic block
        if len(self.blocks) > 2:  # ENTRY, B1, ..., EXIT
            first_user_block = self.blocks[1].id
            self._add_edge("ENTRY", first_user_block, "fallthrough", "Start")

        user_blocks = [b for b in self.blocks if not b.is_entry and not b.is_exit]

        for i, block in enumerate(user_blocks):
            if not block.instructions:
                continue

            last_instr = block.instructions[-1]
            last_instr_idx = self.instructions.index(last_instr)
            has_explicit_jump = False

            if last_instr.type == "goto":
                has_explicit_jump = True
                target_label = last_instr.target
                if target_label and target_label in self.label_to_index:
                    target_instr_idx = self.label_to_index[target_label]
                    target_block_id = self.instr_to_block.get(target_instr_idx)
                    if target_block_id:
                        edge_type = "back_edge" if self._is_back_edge(block.id, target_block_id) else "unconditional"
                        self._add_edge(block.id, target_block_id, edge_type, "goto")

            elif last_instr.type == "if_goto":
                has_explicit_jump = True
                target_label = last_instr.target
                # True branch to target
                if target_label and target_label in self.label_to_index:
                    target_instr_idx = self.label_to_index[target_label]
                    target_block_id = self.instr_to_block.get(target_instr_idx)
                    if target_block_id:
                        edge_type = "back_edge" if self._is_back_edge(block.id, target_block_id) else "conditional_true"
                        self._add_edge(block.id, target_block_id, edge_type, "True")

                # False branch (fallthrough to next sequential block)
                if i + 1 < len(user_blocks):
                    next_block_id = user_blocks[i + 1].id
                    self._add_edge(block.id, next_block_id, "conditional_false", "False")
                else:
                    self._add_edge(block.id, "EXIT", "conditional_false", "False -> Exit")

            elif last_instr.type == "return":
                has_explicit_jump = True
                self._add_edge(block.id, "EXIT", "fallthrough", "return")

            if not has_explicit_jump:
                # Normal fallthrough to next block
                if i + 1 < len(user_blocks):
                    next_block_id = user_blocks[i + 1].id
                    self._add_edge(block.id, next_block_id, "fallthrough")
                else:
                    self._add_edge(block.id, "EXIT", "fallthrough", "End")

        # Any block with no successors connects to EXIT (if not already)
        for block in user_blocks:
            if not block.successors:
                self._add_edge(block.id, "EXIT", "fallthrough")

    def _is_back_edge(self, source_id: str, target_id: str) -> bool:
        """Heuristic check: if target block index <= source block index."""
        try:
            src_num = int(source_id.replace("B", ""))
            tgt_num = int(target_id.replace("B", ""))
            return tgt_num <= src_num
        except ValueError:
            return False

    def _add_edge(self, src_id: str, tgt_id: str, edge_type: str, label: Optional[str] = None):
        # Avoid duplicate edges of same type
        for e in self.edges:
            if e.source == src_id and e.target == tgt_id and e.type == edge_type:
                return

        edge = CFGEdge(source=src_id, target=tgt_id, type=edge_type, label=label)
        self.edges.append(edge)

        # Update block predecessor / successor lists
        for b in self.blocks:
            if b.id == src_id and tgt_id not in b.successors:
                b.successors.append(tgt_id)
            if b.id == tgt_id and src_id not in b.predecessors:
                b.predecessors.append(src_id)

    def extract_metadata(self) -> Tuple[List[str], List[str], List[Dict[str, any]]]:
        variables = set()
        expressions = set()
        definitions = []
        def_counter = 1

        for instr in self.instructions:
            if instr.def_var:
                variables.add(instr.def_var)
                def_id = f"d{def_counter}"
                definitions.append({
                    "id": def_id,
                    "var": instr.def_var,
                    "instr_id": instr.id,
                    "code": instr.raw,
                    "block": self.instr_to_block.get(self.instructions.index(instr), "UNKNOWN")
                })
                def_counter += 1

            for u in instr.use_vars:
                variables.add(u)

            if instr.expr:
                expressions.add(instr.expr)

        return sorted(list(variables)), sorted(list(expressions)), definitions

    def build(self) -> CFGGraph:
        self.identify_leaders()
        self.build_basic_blocks()
        self.build_edges()
        vars_list, exprs_list, defs_list = self.extract_metadata()

        # Leaders 1-indexed for display
        leader_ids = [self.instructions[idx].id for idx in sorted(list(self.leaders))]

        return CFGGraph(
            blocks=self.blocks,
            edges=self.edges,
            leaders=leader_ids,
            total_instructions=len(self.instructions),
            variables=vars_list,
            expressions=exprs_list,
            definitions=defs_list
        )
