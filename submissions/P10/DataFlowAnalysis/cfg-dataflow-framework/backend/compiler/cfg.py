from typing import List, Dict, Set, Tuple, Optional, Any
from compiler.basic_blocks import BasicBlock, IRInstruction, BasicBlockBuilder

class CFGEdge:
    def __init__(self, source: str, target: str, type: str, label: Optional[str] = None):
        self.source = source
        self.target = target
        self.type = type  # 'fallthrough', 'conditional_true', 'conditional_false', 'unconditional', 'back_edge'
        self.label = label

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "target": self.target,
            "type": self.type,
            "label": self.label
        }

class CFG:
    def __init__(self, blocks: List[BasicBlock], edges: List[CFGEdge], instructions: List[IRInstruction]):
        self.blocks = blocks
        self.edges = edges
        self.instructions = instructions
        self.block_map: Dict[str, BasicBlock] = {b.id: b for b in blocks}
        self.variables: List[str] = []
        self.expressions: List[str] = []
        self.definitions: List[Dict[str, Any]] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "blocks": [b.to_dict() for b in self.blocks],
            "edges": [e.to_dict() for e in self.edges],
            "total_instructions": len(self.instructions),
            "variables": self.variables,
            "expressions": self.expressions,
            "definitions": self.definitions
        }

class CFGBuilder:
    def __init__(self, bb_builder: BasicBlockBuilder):
        self.bb_builder = bb_builder
        self.blocks = bb_builder.blocks
        self.instructions = bb_builder.instructions
        self.edges: List[CFGEdge] = []

    def _is_back_edge(self, src_id: str, tgt_id: str) -> bool:
        try:
            src_num = int(src_id.replace("B", ""))
            tgt_num = int(tgt_id.replace("B", ""))
            return tgt_num <= src_num
        except ValueError:
            return False

    def _add_edge(self, src: str, tgt: str, edge_type: str, label: Optional[str] = None):
        for e in self.edges:
            if e.source == src and e.target == tgt and e.type == edge_type:
                return

        edge = CFGEdge(src, tgt, edge_type, label)
        self.edges.append(edge)

        for b in self.blocks:
            if b.id == src and tgt not in b.successors:
                b.successors.append(tgt)
            if b.id == tgt and src not in b.predecessors:
                b.predecessors.append(src)

    def build_edges(self):
        user_blocks = [b for b in self.blocks if not b.is_entry and not b.is_exit]
        if not user_blocks:
            self._add_edge("ENTRY", "EXIT", "fallthrough", "Start")
            return

        # Edge from ENTRY to first basic block
        self._add_edge("ENTRY", user_blocks[0].id, "fallthrough", "Start")

        for i, block in enumerate(user_blocks):
            if not block.instructions:
                if i + 1 < len(user_blocks):
                    self._add_edge(block.id, user_blocks[i + 1].id, "fallthrough")
                else:
                    self._add_edge(block.id, "EXIT", "fallthrough", "End")
                continue

            last_instr = block.instructions[-1]
            has_jump = False

            if last_instr.type == "goto":
                has_jump = True
                tgt = last_instr.target.rstrip(":") if last_instr.target else None
                if tgt and tgt in self.bb_builder.label_to_index:
                    tgt_idx = self.bb_builder.label_to_index[tgt]
                    tgt_block_id = self.bb_builder.instr_to_block.get(tgt_idx)
                    if tgt_block_id:
                        edge_type = "back_edge" if self._is_back_edge(block.id, tgt_block_id) else "unconditional"
                        label = "Loop Back" if edge_type == "back_edge" else "goto"
                        self._add_edge(block.id, tgt_block_id, edge_type, label)

            elif last_instr.type == "if_goto":
                has_jump = True
                tgt = last_instr.target.rstrip(":") if last_instr.target else None
                
                # Conditional branch target
                if tgt and tgt in self.bb_builder.label_to_index:
                    tgt_idx = self.bb_builder.label_to_index[tgt]
                    tgt_block_id = self.bb_builder.instr_to_block.get(tgt_idx)
                    if tgt_block_id:
                        edge_type = "back_edge" if self._is_back_edge(block.id, tgt_block_id) else "conditional_true"
                        label = "Loop Back" if edge_type == "back_edge" else "True"
                        self._add_edge(block.id, tgt_block_id, edge_type, label)

                # Fallthrough branch
                if i + 1 < len(user_blocks):
                    next_block_id = user_blocks[i + 1].id
                    self._add_edge(block.id, next_block_id, "conditional_false", "False")
                else:
                    self._add_edge(block.id, "EXIT", "conditional_false", "False -> Exit")

            elif last_instr.type == "return":
                has_jump = True
                self._add_edge(block.id, "EXIT", "fallthrough", "Return")

            if not has_jump:
                if i + 1 < len(user_blocks):
                    self._add_edge(block.id, user_blocks[i + 1].id, "fallthrough")
                else:
                    self._add_edge(block.id, "EXIT", "fallthrough", "End")

        # Connect any block with no successors to EXIT
        for b in user_blocks:
            if not b.successors:
                self._add_edge(b.id, "EXIT", "fallthrough")

    def extract_metadata(self) -> Tuple[List[str], List[str], List[Dict[str, Any]]]:
        vars_set = set()
        exprs_set = set()
        defs_list = []
        d_count = 1

        for instr in self.instructions:
            if instr.def_var:
                vars_set.add(instr.def_var)
                def_id = f"d{d_count}"
                defs_list.append({
                    "id": def_id,
                    "var": instr.def_var,
                    "instr_id": instr.id,
                    "code": instr.raw,
                    "c_line": instr.c_line,
                    "c_stmt": instr.c_stmt,
                    "block": self.bb_builder.instr_to_block.get(self.instructions.index(instr), "UNKNOWN")
                })
                d_count += 1

            for u in instr.use_vars:
                vars_set.add(u)

            if instr.expr:
                exprs_set.add(instr.expr)

        return sorted(list(vars_set)), sorted(list(exprs_set)), defs_list

    def build(self) -> CFG:
        self.build_edges()
        vars_list, exprs_list, defs_list = self.extract_metadata()
        cfg = CFG(self.blocks, self.edges, self.instructions)
        cfg.variables = vars_list
        cfg.expressions = exprs_list
        cfg.definitions = defs_list
        return cfg
