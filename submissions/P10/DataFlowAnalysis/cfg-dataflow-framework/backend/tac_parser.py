import re
from typing import List, Tuple, Dict, Optional, Set
from models import TACInstruction

def is_identifier(token: str) -> bool:
    """Check if token is a valid variable identifier (not a numeric constant or keyword)."""
    if not token:
        return False
    # Check numeric literal
    if re.match(r'^-?\d+(\.\d+)?$', token):
        return False
    # Check string literal
    if (token.startswith('"') and token.endswith('"')) or (token.startswith("'") and token.endswith("'")):
        return False
    # Reserved keywords that shouldn't be treated as variables
    keywords = {'goto', 'jmp', 'if', 'iffalse', 'ifFalse', 'param', 'call', 'return', 'true', 'false', 'True', 'False'}
    if token.lower() in keywords:
        return False
    return bool(re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', token))

def normalize_expression(expr: str) -> str:
    """Normalize expression string, e.g. 'a + b' and commutative ordering for + and *."""
    expr = re.sub(r'\s+', ' ', expr.strip())
    # Match binary op: var1 op var2
    m = re.match(r'^([a-zA-Z0-9_]+)\s*([\+\-\*/%])\s*([a-zA-Z0-9_]+)$', expr)
    if m:
        arg1, op, arg2 = m.group(1), m.group(2), m.group(3)
        if op in ('+', '*') and arg1 > arg2:
            return f"{arg2} {op} {arg1}"
        return f"{arg1} {op} {arg2}"
    return expr

class TACParser:
    @staticmethod
    def clean_lines(raw_code: str) -> List[Tuple[int, str]]:
        """Remove comments and blank lines, keeping original line numbers (1-indexed)."""
        lines = []
        for idx, line in enumerate(raw_code.splitlines(), start=1):
            # Strip comments (# or //)
            stripped = re.sub(r'(#|//).*$', '', line).strip()
            if stripped:
                lines.append((idx, stripped))
        return lines

    @staticmethod
    def parse_instruction(instr_id: int, raw_text: str) -> TACInstruction:
        raw = raw_text.strip()
        
        # 1. Label: e.g. "L1:" or "START:"
        m_label = re.match(r'^([a-zA-Z0-9_]+)\s*:$', raw)
        if m_label:
            lbl = m_label.group(1)
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="label",
                target=lbl
            )

        # 2. Unconditional Goto: "goto L1" or "jmp L1"
        m_goto = re.match(r'^(?:goto|jmp)\s+([a-zA-Z0-9_]+)$', raw, re.IGNORECASE)
        if m_goto:
            target = m_goto.group(1)
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="goto",
                target=target
            )

        # 3. Conditional Goto: "if x <= y goto L1" or "if x goto L1"
        m_if_relop = re.match(r'^if\s+([a-zA-Z0-9_]+)\s*(<=|>=|==|!=|<|>)\s*([a-zA-Z0-9_]+)\s+goto\s+([a-zA-Z0-9_]+)$', raw, re.IGNORECASE)
        if m_if_relop:
            arg1, op, arg2, target = m_if_relop.group(1), m_if_relop.group(2), m_if_relop.group(3), m_if_relop.group(4)
            uses = []
            if is_identifier(arg1): uses.append(arg1)
            if is_identifier(arg2): uses.append(arg2)
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="if_goto",
                op=op,
                arg1=arg1,
                arg2=arg2,
                target=target,
                use_vars=uses
            )

        # 4. ifFalse x goto L1
        m_iffalse = re.match(r'^ifFalse\s+([a-zA-Z0-9_]+)\s+goto\s+([a-zA-Z0-9_]+)$', raw, re.IGNORECASE)
        if m_iffalse:
            arg1, target = m_iffalse.group(1), m_iffalse.group(2)
            uses = [arg1] if is_identifier(arg1) else []
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="if_goto",
                op="iffalse",
                arg1=arg1,
                target=target,
                use_vars=uses
            )

        # 5. if x goto L1
        m_if_simple = re.match(r'^if\s+([a-zA-Z0-9_]+)\s+goto\s+([a-zA-Z0-9_]+)$', raw, re.IGNORECASE)
        if m_if_simple:
            arg1, target = m_if_simple.group(1), m_if_simple.group(2)
            uses = [arg1] if is_identifier(arg1) else []
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="if_goto",
                op="if",
                arg1=arg1,
                target=target,
                use_vars=uses
            )

        # 6. Return: "return x" or "return"
        m_ret = re.match(r'^return(?:\s+([a-zA-Z0-9_]+))?$', raw, re.IGNORECASE)
        if m_ret:
            ret_val = m_ret.group(1)
            uses = [ret_val] if ret_val and is_identifier(ret_val) else []
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="return",
                arg1=ret_val,
                use_vars=uses
            )

        # 7. Param: "param x"
        m_param = re.match(r'^param\s+([a-zA-Z0-9_]+)$', raw, re.IGNORECASE)
        if m_param:
            arg = m_param.group(1)
            uses = [arg] if is_identifier(arg) else []
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="param",
                arg1=arg,
                use_vars=uses
            )

        # 8. Call without return: "call func, 2"
        m_call = re.match(r'^call\s+([a-zA-Z0-9_]+)\s*(?:,\s*(\d+))?$', raw, re.IGNORECASE)
        if m_call:
            func = m_call.group(1)
            nargs = m_call.group(2) or "0"
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="call",
                op="call",
                arg1=func,
                arg2=nargs
            )

        # 9. Assignment with Call: "x = call func, 2"
        m_assign_call = re.match(r'^([a-zA-Z0-9_]+)\s*=\s*call\s+([a-zA-Z0-9_]+)\s*(?:,\s*(\d+))?$', raw, re.IGNORECASE)
        if m_assign_call:
            res, func, nargs = m_assign_call.group(1), m_assign_call.group(2), m_assign_call.group(3) or "0"
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="call",
                op="call",
                result=res,
                arg1=func,
                arg2=nargs,
                def_var=res if is_identifier(res) else None
            )

        # 10. Array read: "x = a[i]"
        m_arr_read = re.match(r'^([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\s*\[\s*([a-zA-Z0-9_]+)\s*\]$', raw)
        if m_arr_read:
            res, arr, idx = m_arr_read.group(1), m_arr_read.group(2), m_arr_read.group(3)
            uses = []
            if is_identifier(arr): uses.append(arr)
            if is_identifier(idx): uses.append(idx)
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="assign",
                result=res,
                arg1=arr,
                arg2=idx,
                def_var=res if is_identifier(res) else None,
                use_vars=uses
            )

        # 11. Array write: "a[i] = x"
        m_arr_write = re.match(r'^([a-zA-Z0-9_]+)\s*\[\s*([a-zA-Z0-9_]+)\s*\]\s*=\s*([a-zA-Z0-9_]+)$', raw)
        if m_arr_write:
            arr, idx, val = m_arr_write.group(1), m_arr_write.group(2), m_arr_write.group(3)
            uses = []
            if is_identifier(arr): uses.append(arr)
            if is_identifier(idx): uses.append(idx)
            if is_identifier(val): uses.append(val)
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="assign",
                arg1=arr,
                arg2=idx,
                result=val,
                use_vars=uses
            )

        # 12. Binary Op Assignment: "x = y + z" or "t1 = a * b"
        m_bin = re.match(r'^([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\s*([\+\-\*/%&|\^]|<<|>>)\s*([a-zA-Z0-9_]+)$', raw)
        if m_bin:
            res, arg1, op, arg2 = m_bin.group(1), m_bin.group(2), m_bin.group(3), m_bin.group(4)
            uses = []
            if is_identifier(arg1): uses.append(arg1)
            if is_identifier(arg2): uses.append(arg2)
            expr = normalize_expression(f"{arg1} {op} {arg2}")
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="binary",
                result=res,
                op=op,
                arg1=arg1,
                arg2=arg2,
                def_var=res if is_identifier(res) else None,
                use_vars=uses,
                expr=expr
            )

        # 13. Unary Op Assignment: "x = -y" or "x = not y" or "x = ~y"
        m_unary = re.match(r'^([a-zA-Z0-9_]+)\s*=\s*(-|~|not\s+)([a-zA-Z0-9_]+)$', raw, re.IGNORECASE)
        if m_unary:
            res, op, arg1 = m_unary.group(1), m_unary.group(2).strip(), m_unary.group(3)
            uses = [arg1] if is_identifier(arg1) else []
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="unary",
                result=res,
                op=op,
                arg1=arg1,
                def_var=res if is_identifier(res) else None,
                use_vars=uses,
                expr=f"{op}{arg1}"
            )

        # 14. Simple Copy / Constant Assignment: "x = y" or "x = 42"
        m_copy = re.match(r'^([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)$', raw)
        if m_copy:
            res, src = m_copy.group(1), m_copy.group(2)
            uses = [src] if is_identifier(src) else []
            return TACInstruction(
                id=instr_id,
                raw=raw,
                type="copy",
                result=res,
                arg1=src,
                def_var=res if is_identifier(res) else None,
                use_vars=uses
            )

        # Fallback for arbitrary instruction
        return TACInstruction(
            id=instr_id,
            raw=raw,
            type="other"
        )

    @classmethod
    def parse_program(cls, code: str) -> List[TACInstruction]:
        lines = cls.clean_lines(code)
        instructions = []
        for i, (lineno, text) in enumerate(lines, start=1):
            instr = cls.parse_instruction(i, text)
            instructions.append(instr)
        return instructions
