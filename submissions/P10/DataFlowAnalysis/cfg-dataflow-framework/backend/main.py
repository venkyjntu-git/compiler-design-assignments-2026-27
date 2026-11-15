import sys
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from compiler.lexer import Lexer, LexerError
from compiler.parser import Parser, ParserError
from compiler.validation import ASTValidator, ValidationError
from compiler.basic_blocks import TACGenerator, BasicBlockBuilder
from compiler.cfg import CFGBuilder, CFG
from compiler.dataflow.reaching_definitions import ReachingDefinitions
from compiler.dataflow.live_variables import LiveVariables
from compiler.dataflow.available_expressions import AvailableExpressions

app = FastAPI(
    title="CFG and Data-Flow Analysis Framework",
    description="A visual compiler analysis tool supporting C subset compilation, CFG construction, and iterative dataflow analysis.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    code: str
    language: Optional[str] = "c"  # 'c' or 'tac'

class SampleProgram(BaseModel):
    id: str
    title: str
    description: str
    code: str

C_SAMPLE_PROGRAMS: List[SampleProgram] = [
    SampleProgram(
        id="simple_assignments",
        title="1. Simple Assignments (Program A)",
        description="Sequential assignments without branching. Tests linear basic block generation.",
        code="""a = 10;
b = 20;
c = a + b;
d = c * 2;"""
    ),
    SampleProgram(
        id="if_else_statements",
        title="2. If-Else Statements (Program B)",
        description="Conditional split into two branches and reconvergence at a merge point.",
        code="""x = 10;

if (x > 5) {
    y = x + 1;
} else {
    y = x - 1;
}

z = y * 2;"""
    ),
    SampleProgram(
        id="while_loop",
        title="3. While Loop (Program C)",
        description="Natural loop with condition, loop body, back-edge, and post-loop exit.",
        code="""i = 0;
sum = 0;

while (i < 5) {
    sum = sum + i;
    i = i + 1;
}

result = sum;"""
    ),
    SampleProgram(
        id="nested_conditions",
        title="4. Nested Conditions (Program D)",
        description="Nested if-else statements testing multi-level branching and cascaded joins.",
        code="""x = 10;
y = 0;

if (x > 0) {
    if (x > 5) {
        y = x * 2;
    } else {
        y = x + 2;
    }
} else {
    y = 0;
}

result = y;"""
    ),
    SampleProgram(
        id="repeated_variable_assignments",
        title="5. Repeated Variable Assignments",
        description="Variable defined multiple times, demonstrating KILL sets in Reaching Definitions.",
        code="""int x = 1;
int y = 2;
x = x + 10;

if (x > 5) {
    x = 20;
    y = x + 1;
} else {
    x = 30;
}

x = x + y;
return x;"""
    ),
    SampleProgram(
        id="arithmetic_expressions",
        title="6. Arithmetic Expressions & Parentheses",
        description="Complex arithmetic subexpressions demonstrating Available Expressions.",
        code="""int a = 4;
int b = 7;
int x = (a + b) * 2;
int y = 0;

if (x > 20) {
    y = (a + b) * 2;
} else {
    y = a + b;
}

int z = (a + b) * 2;
return x + y + z;"""
    ),
    SampleProgram(
        id="combined_branch_and_loop",
        title="7. Combined Branches & Loop",
        description="While loop containing conditional if-else logic inside the loop body.",
        code="""int i = 1;
int sum = 0;

while (i <= 6) {
    if (i % 2 == 0) {
        sum = sum + i;
    } else {
        sum = sum + 1;
    }
    i = i + 1;
}

return sum;"""
    )
]

def compile_c_to_cfg(source_code: str) -> CFG:
    if not source_code or not source_code.strip():
        raise HTTPException(status_code=400, detail={
            "error_type": "InputError",
            "message": "Source code cannot be empty. Please enter C source code.",
            "line": 1,
            "col": 1
        })

    # 1. Lexical Analysis
    try:
        lexer = Lexer(source_code)
        tokens = lexer.tokenize()
    except LexerError as e:
        raise HTTPException(status_code=400, detail={
            "error_type": "LexerError",
            "message": e.message,
            "line": e.line,
            "col": e.col
        })

    # 2. Syntax Analysis & Parsing
    try:
        parser = Parser(tokens)
        ast = parser.parse_program()
    except ParserError as e:
        raise HTTPException(status_code=400, detail={
            "error_type": "ParserError",
            "message": e.message,
            "line": e.line,
            "col": e.col
        })

    # 3. Semantic Validation
    try:
        validator = ASTValidator(ast)
        validator.validate()
    except ValidationError as e:
        raise HTTPException(status_code=400, detail={
            "error_type": "ValidationError",
            "message": e.message,
            "line": e.line,
            "col": e.col
        })

    # 4. Intermediate Code (TAC) Generation
    tac_gen = TACGenerator()
    instructions = tac_gen.generate_program(ast)
    if not instructions:
        raise HTTPException(status_code=400, detail={
            "error_type": "CompilationError",
            "message": "No executable instructions generated from source code",
            "line": 1,
            "col": 1
        })

    # 5. Basic Block Partitioning (Leaders)
    bb_builder = BasicBlockBuilder(instructions)
    bb_builder.partition_blocks()

    # 6. CFG Construction
    cfg_builder = CFGBuilder(bb_builder)
    cfg = cfg_builder.build()
    return cfg

@app.get("/")
def home():
    return {
        "project": "CFG and Data-Flow Analysis Framework",
        "status": "running",
        "modules": [
            "Control Flow Graph",
            "Reaching Definitions",
            "Live Variable Analysis",
            "Available Expressions"
        ],
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/api/samples", response_model=List[SampleProgram])
def get_samples():
    return C_SAMPLE_PROGRAMS

@app.post("/api/cfg/build")
def build_cfg_endpoint(req: CodeRequest):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail={"message": "Source code cannot be empty"})
    cfg = compile_c_to_cfg(req.code)
    return cfg.to_dict()

@app.post("/api/analyze/reaching-definitions")
def analyze_rd_endpoint(req: CodeRequest):
    cfg = compile_c_to_cfg(req.code)
    rd = ReachingDefinitions(cfg)
    return rd.run()

@app.post("/api/analyze/live-variables")
def analyze_lv_endpoint(req: CodeRequest):
    cfg = compile_c_to_cfg(req.code)
    lv = LiveVariables(cfg)
    return lv.run()

@app.post("/api/analyze/available-expressions")
def analyze_ae_endpoint(req: CodeRequest):
    cfg = compile_c_to_cfg(req.code)
    ae = AvailableExpressions(cfg)
    return ae.run()

@app.post("/api/analyze/all")
def analyze_all_endpoint(req: CodeRequest):
    cfg = compile_c_to_cfg(req.code)
    rd = ReachingDefinitions(cfg).run()
    lv = LiveVariables(cfg).run()
    ae = AvailableExpressions(cfg).run()

    optimizations = []
    optimizations.extend(rd.get("diagnostics", []))
    optimizations.extend(lv.get("diagnostics", []))
    optimizations.extend(ae.get("diagnostics", []))

    return {
        "cfg": cfg.to_dict(),
        "reaching_definitions": rd,
        "live_variables": lv,
        "available_expressions": ae,
        "optimizations": optimizations
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
