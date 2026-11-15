from typing import List, Dict, Set, Optional, Any, Union
from pydantic import BaseModel, Field

class TACInstruction(BaseModel):
    id: int
    raw: str
    op: Optional[str] = None
    arg1: Optional[str] = None
    arg2: Optional[str] = None
    result: Optional[str] = None
    target: Optional[str] = None
    type: str  # 'assign', 'binary', 'unary', 'copy', 'goto', 'if_goto', 'label', 'return', 'call', 'param', 'other'
    is_leader: bool = False
    leader_reason: Optional[str] = None
    def_var: Optional[str] = None
    use_vars: List[str] = Field(default_factory=list)
    expr: Optional[str] = None

class BasicBlock(BaseModel):
    id: str  # 'B0', 'B1', etc. or 'ENTRY', 'EXIT'
    name: str
    instructions: List[TACInstruction] = Field(default_factory=list)
    predecessors: List[str] = Field(default_factory=list)
    successors: List[str] = Field(default_factory=list)
    is_entry: bool = False
    is_exit: bool = False

class CFGEdge(BaseModel):
    source: str
    target: str
    type: str  # 'fallthrough', 'conditional_true', 'conditional_false', 'unconditional', 'back_edge'
    label: Optional[str] = None

class CFGGraph(BaseModel):
    blocks: List[BasicBlock]
    edges: List[CFGEdge]
    leaders: List[int]
    total_instructions: int
    variables: List[str]
    expressions: List[str]
    definitions: List[Dict[str, Any]]

class IterationStep(BaseModel):
    iteration: int
    block_id: str
    direction: str  # 'forward' or 'backward'
    in_set: List[str]
    out_set: List[str]
    gen_set: List[str]
    kill_set: List[str]
    has_changed: bool
    explanation: str

class AnalysisResult(BaseModel):
    analysis_type: str
    direction: str
    meet_operator: str
    universal_set: List[str]
    block_gen: Dict[str, List[str]]
    block_kill: Dict[str, List[str]]
    initial_in: Dict[str, List[str]]
    initial_out: Dict[str, List[str]]
    final_in: Dict[str, List[str]]
    final_out: Dict[str, List[str]]
    steps: List[IterationStep]
    total_iterations: int
    definitions_table: Optional[List[Dict[str, Any]]] = None
    diagnostics: List[Dict[str, Any]] = Field(default_factory=list)

class FullAnalysisResponse(BaseModel):
    cfg: CFGGraph
    reaching_definitions: AnalysisResult
    live_variables: AnalysisResult
    available_expressions: AnalysisResult
    optimizations: List[Dict[str, Any]]

class CodeRequest(BaseModel):
    code: str
    language: Optional[str] = "tac"  # 'tac' or 'pseudocode'

class SampleProgram(BaseModel):
    id: str
    title: str
    description: str
    code: str
