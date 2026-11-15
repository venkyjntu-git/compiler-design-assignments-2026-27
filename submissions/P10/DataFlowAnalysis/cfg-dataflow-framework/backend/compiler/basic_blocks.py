import re
from typing import List, Dict, Set, Tuple, Optional, Any
from compiler.ast_nodes import (
    ASTNode, Program, FunctionDef, CompoundStmt, VarDecl, Assignment,
    BinaryOp, UnaryOp, Identifier, Constant, IfStmt, WhileStmt, ForStmt,
    DoWhileStmt, BreakStmt, ContinueStmt, ReturnStmt, ExprStmt
)

class IRInstruction:
    def __init__(
        self,
        id: int,
        raw: str,
        type: str,
        c_line: int,
        c_stmt: str = "",
        def_var: Optional[str] = None,
        use_vars: Optional[List[str]] = None,
        expr: Optional[str] = None,
        target: Optional[str] = None,
        op: Optional[str] = None,
        arg1: Optional[str] = None,
        arg2: Optional[str] = None,
        result: Optional[str] = None
    ):
        self.id = id
        self.raw = raw
        self.type = type
        self.c_line = c_line
        self.c_stmt = c_stmt
        self.def_var = def_var
        self.use_vars = use_vars or []
        self.expr = expr
        self.target = target
        self.op = op
        self.arg1 = arg1
        self.arg2 = arg2
        self.result = result
        self.is_leader = False
        self.leader_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "raw": self.raw,
            "type": self.type,
            "c_line": self.c_line,
            "c_stmt": self.c_stmt,
            "def_var": self.def_var,
            "use_vars": self.use_vars,
            "expr": self.expr,
            "target": self.target,
            "op": self.op,
            "arg1": self.arg1,
            "arg2": self.arg2,
            "result": self.result,
            "is_leader": self.is_leader,
            "leader_reason": self.leader_reason
        }

class BasicBlock:
    def __init__(self, id: str, name: str, is_entry: bool = False, is_exit: bool = False):
        self.id = id
        self.name = name
        self.instructions: List[IRInstruction] = []
        self.predecessors: List[str] = []
        self.successors: List[str] = []
        self.is_entry = is_entry
        self.is_exit = is_exit

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "instructions": [instr.to_dict() for instr in self.instructions],
            "predecessors": self.predecessors,
            "successors": self.successors,
            "is_entry": self.is_entry,
            "is_exit": self.is_exit
        }

def is_numeric_literal(token: str) -> bool:
    if not token:
        return False
    try:
        float(token)
        return True
    except (ValueError, TypeError):
        return False

def normalize_expr(op: str, left: str, right: str) -> str:
    """Normalize binary expression for Available Expressions analysis."""
    if op in ('+', '*') and left > right:
        return f"{right} {op} {left}"
    return f"{left} {op} {right}"

class TACGenerator:
    def __init__(self):
        self.instructions: List[IRInstruction] = []
        self.temp_count = 0
        self.label_count = 0
        self.loop_stack: List[Tuple[str, str]] = []  # (break_label, continue_label)

    def new_temp(self) -> str:
        self.temp_count += 1
        return f"t{self.temp_count}"

    def new_label(self, prefix: str = "L") -> str:
        self.label_count += 1
        return f"{prefix}{self.label_count}"

    def emit(
        self,
        raw: str,
        type: str,
        c_line: int,
        c_stmt: str = "",
        def_var: Optional[str] = None,
        use_vars: Optional[List[str]] = None,
        expr: Optional[str] = None,
        target: Optional[str] = None,
        op: Optional[str] = None,
        arg1: Optional[str] = None,
        arg2: Optional[str] = None,
        result: Optional[str] = None
    ) -> IRInstruction:
        instr_id = len(self.instructions) + 1
        instr = IRInstruction(
            id=instr_id,
            raw=raw,
            type=type,
            c_line=c_line,
            c_stmt=c_stmt,
            def_var=def_var,
            use_vars=use_vars,
            expr=expr,
            target=target,
            op=op,
            arg1=arg1,
            arg2=arg2,
            result=result
        )
        self.instructions.append(instr)
        return instr

    def generate_program(self, program: Program) -> List[IRInstruction]:
        for decl in program.declarations:
            if isinstance(decl, FunctionDef):
                self.generate_function(decl)
            elif isinstance(decl, VarDecl):
                self.generate_var_decl(decl)
        return self.instructions

    def generate_function(self, func: FunctionDef):
        # Optional: emit function entry label
        self.emit(f"FUNC_{func.name}:", "label", func.line, f"function {func.name}", target=f"FUNC_{func.name}")
        self.generate_stmt(func.body)

    def generate_stmt(self, stmt: ASTNode):
        if isinstance(stmt, CompoundStmt):
            for s in stmt.statements:
                self.generate_stmt(s)
        elif isinstance(stmt, VarDecl):
            self.generate_var_decl(stmt)
        elif isinstance(stmt, ExprStmt):
            self.generate_expr(stmt.expr)
        elif isinstance(stmt, IfStmt):
            self.generate_if(stmt)
        elif isinstance(stmt, WhileStmt):
            self.generate_while(stmt)
        elif isinstance(stmt, ForStmt):
            self.generate_for(stmt)
        elif isinstance(stmt, DoWhileStmt):
            self.generate_do_while(stmt)
        elif isinstance(stmt, BreakStmt):
            if self.loop_stack:
                break_lbl = self.loop_stack[-1][0]
                self.emit(f"goto {break_lbl}", "goto", stmt.line, "break;", target=break_lbl)
        elif isinstance(stmt, ContinueStmt):
            if self.loop_stack:
                cont_lbl = self.loop_stack[-1][1]
                self.emit(f"goto {cont_lbl}", "goto", stmt.line, "continue;", target=cont_lbl)
        elif isinstance(stmt, ReturnStmt):
            if stmt.expr:
                ret_val = self.generate_expr(stmt.expr)
                uses = [ret_val] if not ret_val.lstrip('-').isdigit() else []
                self.emit(f"return {ret_val}", "return", stmt.line, f"return {ret_val};", use_vars=uses, arg1=ret_val)
            else:
                self.emit("return", "return", stmt.line, "return;")

    def generate_var_decl(self, decl: VarDecl):
        if decl.init_expr:
            val = self.generate_expr(decl.init_expr)
            uses = [val] if not val.lstrip('-').isdigit() else []
            self.emit(
                f"{decl.name} = {val}",
                "copy",
                decl.line,
                f"int {decl.name} = {val};",
                def_var=decl.name,
                use_vars=uses,
                result=decl.name,
                arg1=val
            )

    def generate_if(self, stmt: IfStmt):
        cond_val = self.generate_expr(stmt.condition)
        uses = [cond_val] if not is_numeric_literal(cond_val) else []
        lbl_else = self.new_label("L_ELSE_")
        lbl_end = self.new_label("L_END_IF_")

        target = lbl_else if stmt.else_branch else lbl_end
        self.emit(
            f"ifFalse {cond_val} goto {target}",
            "if_goto",
            stmt.line,
            f"if (!({cond_val})) goto {target}",
            use_vars=uses,
            target=target,
            arg1=cond_val,
            op="ifFalse"
        )

        self.generate_stmt(stmt.then_branch)

        if stmt.else_branch:
            self.emit(f"goto {lbl_end}", "goto", stmt.line, f"goto {lbl_end}", target=lbl_end)
            self.emit(f"{lbl_else}:", "label", stmt.line, f"{lbl_else}:", target=lbl_else)
            self.generate_stmt(stmt.else_branch)

        self.emit(f"{lbl_end}:", "label", stmt.line, f"{lbl_end}:", target=lbl_end)

    def generate_while(self, stmt: WhileStmt):
        lbl_start = self.new_label("L_WHILE_")
        lbl_end = self.new_label("L_END_WHILE_")

        self.loop_stack.append((lbl_end, lbl_start))
        self.emit(f"{lbl_start}:", "label", stmt.line, f"{lbl_start}:", target=lbl_start)

        cond_val = self.generate_expr(stmt.condition)
        uses = [cond_val] if not is_numeric_literal(cond_val) else []
        self.emit(
            f"ifFalse {cond_val} goto {lbl_end}",
            "if_goto",
            stmt.line,
            f"while condition check",
            use_vars=uses,
            target=lbl_end,
            arg1=cond_val,
            op="ifFalse"
        )

        self.generate_stmt(stmt.body)
        self.emit(f"goto {lbl_start}", "goto", stmt.line, f"goto {lbl_start}", target=lbl_start)
        self.emit(f"{lbl_end}:", "label", stmt.line, f"{lbl_end}:", target=lbl_end)
        self.loop_stack.pop()

    def generate_for(self, stmt: ForStmt):
        lbl_start = self.new_label("L_FOR_")
        lbl_post = self.new_label("L_POST_FOR_")
        lbl_end = self.new_label("L_END_FOR_")

        if stmt.init:
            if isinstance(stmt.init, ASTNode):
                self.generate_stmt(stmt.init)

        self.loop_stack.append((lbl_end, lbl_post))
        self.emit(f"{lbl_start}:", "label", stmt.line, f"{lbl_start}:", target=lbl_start)

        if stmt.condition:
            cond_val = self.generate_expr(stmt.condition)
            uses = [cond_val] if not is_numeric_literal(cond_val) else []
            self.emit(
                f"ifFalse {cond_val} goto {lbl_end}",
                "if_goto",
                stmt.line,
                f"for loop condition check",
                use_vars=uses,
                target=lbl_end,
                arg1=cond_val,
                op="ifFalse"
            )

        self.generate_stmt(stmt.body)
        self.emit(f"{lbl_post}:", "label", stmt.line, f"{lbl_post}:", target=lbl_post)

        if stmt.post:
            self.generate_expr(stmt.post)

        self.emit(f"goto {lbl_start}", "goto", stmt.line, f"goto {lbl_start}", target=lbl_start)
        self.emit(f"{lbl_end}:", "label", stmt.line, f"{lbl_end}:", target=lbl_end)
        self.loop_stack.pop()

    def generate_do_while(self, stmt: DoWhileStmt):
        lbl_start = self.new_label("L_DO_")
        lbl_end = self.new_label("L_END_DO_")

        self.loop_stack.append((lbl_end, lbl_start))
        self.emit(f"{lbl_start}:", "label", stmt.line, f"{lbl_start}:", target=lbl_start)
        self.generate_stmt(stmt.body)

        cond_val = self.generate_expr(stmt.condition)
        uses = [cond_val] if not is_numeric_literal(cond_val) else []
        self.emit(
            f"if {cond_val} goto {lbl_start}",
            "if_goto",
            stmt.line,
            f"do-while loop jump",
            use_vars=uses,
            target=lbl_start,
            arg1=cond_val,
            op="if"
        )
        self.emit(f"{lbl_end}:", "label", stmt.line, f"{lbl_end}:", target=lbl_end)
        self.loop_stack.pop()

    def generate_expr(self, expr: ASTNode) -> str:
        if isinstance(expr, Constant):
            return str(expr.value)
        elif isinstance(expr, Identifier):
            return expr.name
        elif isinstance(expr, Assignment):
            rhs = self.generate_expr(expr.expr)
            uses = [rhs] if not is_numeric_literal(rhs) else []
            self.emit(
                f"{expr.target} = {rhs}",
                "copy",
                expr.line,
                f"{expr.target} = {rhs}",
                def_var=expr.target,
                use_vars=uses,
                result=expr.target,
                arg1=rhs
            )
            return expr.target
        elif isinstance(expr, BinaryOp):
            left_val = self.generate_expr(expr.left)
            right_val = self.generate_expr(expr.right)
            t = self.new_temp()
            norm_e = normalize_expr(expr.op, left_val, right_val)
            uses = []
            if not is_numeric_literal(left_val): uses.append(left_val)
            if not is_numeric_literal(right_val): uses.append(right_val)
            self.emit(
                f"{t} = {left_val} {expr.op} {right_val}",
                "binary",
                expr.line,
                f"{t} = {left_val} {expr.op} {right_val}",
                def_var=t,
                use_vars=uses,
                expr=norm_e,
                result=t,
                op=expr.op,
                arg1=left_val,
                arg2=right_val
            )
            return t
        elif isinstance(expr, UnaryOp):
            val = self.generate_expr(expr.operand)
            t = self.new_temp()
            uses = [val] if not is_numeric_literal(val) else []
            self.emit(
                f"{t} = {expr.op}{val}",
                "unary",
                expr.line,
                f"{t} = {expr.op}{val}",
                def_var=t,
                use_vars=uses,
                result=t,
                op=expr.op,
                arg1=val
            )
            return t
        return "0"

class BasicBlockBuilder:
    def __init__(self, instructions: List[IRInstruction]):
        self.instructions = instructions
        self.label_to_index: Dict[str, int] = {}
        self.leaders: Set[int] = set()
        self.leader_reasons: Dict[int, str] = {}
        self.blocks: List[BasicBlock] = []
        self.instr_to_block: Dict[int, str] = {}

    def find_leaders(self):
        n = len(self.instructions)
        if n == 0:
            return

        # Map labels to their index in the instructions array
        for idx, instr in enumerate(self.instructions):
            if instr.type == "label" and instr.target:
                lbl_clean = instr.target.rstrip(":")
                self.label_to_index[lbl_clean] = idx
                self.label_to_index[instr.target] = idx

        # Rule 1: First instruction of intermediate code is a leader
        self.leaders.add(0)
        self.leader_reasons[0] = "Rule 1: First instruction of intermediate code"

        # Rule 2 & 3
        for idx, instr in enumerate(self.instructions):
            if instr.type in ("goto", "if_goto"):
                tgt = instr.target
                if tgt:
                    tgt_clean = tgt.rstrip(":")
                    if tgt_clean in self.label_to_index:
                        target_idx = self.label_to_index[tgt_clean]
                        self.leaders.add(target_idx)
                        r = f"Rule 2: Target of jump at instruction #{instr.id} ({instr.raw})"
                        self.leader_reasons[target_idx] = (
                            self.leader_reasons.get(target_idx, "") + f"; {r}" if target_idx in self.leader_reasons else r
                        )

                # Rule 3: Any instruction immediately following a jump is a leader
                if idx + 1 < n:
                    self.leaders.add(idx + 1)
                    r = f"Rule 3: Follows jump instruction #{instr.id} ({instr.raw})"
                    self.leader_reasons[idx + 1] = (
                        self.leader_reasons.get(idx + 1, "") + f"; {r}" if (idx + 1) in self.leader_reasons else r
                    )

        # Mark instructions
        for idx, instr in enumerate(self.instructions):
            if idx in self.leaders:
                instr.is_leader = True
                instr.leader_reason = self.leader_reasons.get(idx, "Leader instruction")

    def partition_blocks(self) -> List[BasicBlock]:
        self.find_leaders()
        sorted_leaders = sorted(list(self.leaders))
        n = len(self.instructions)

        # ENTRY Block
        entry = BasicBlock("ENTRY", "ENTRY", is_entry=True)
        self.blocks.append(entry)

        for i, leader_idx in enumerate(sorted_leaders):
            next_leader_idx = sorted_leaders[i + 1] if i + 1 < len(sorted_leaders) else n
            block_instrs = self.instructions[leader_idx:next_leader_idx]
            block_id = f"B{i + 1}"
            block = BasicBlock(block_id, f"Block {i + 1}")
            block.instructions = block_instrs
            self.blocks.append(block)

            for instr_idx in range(leader_idx, next_leader_idx):
                self.instr_to_block[instr_idx] = block_id

        # EXIT Block
        exit_block = BasicBlock("EXIT", "EXIT", is_exit=True)
        self.blocks.append(exit_block)

        return self.blocks
