# CompilerVerse: Architecture & System Design Document
**Course:** Compiler Design (3rd-Year B.Tech Computer Science)  
**Track:** F – Visual and Educational Compiler Tooling  
**Problem Number:** 22  

---

## 1. Overview and Core Philosophy

CompilerVerse is an interactive educational compilation and parsing visualization environment. Rather than relying on black-box tools (such as Lex, Yacc, ANTLR, or LLVM), CompilerVerse implements every algorithm **from first principles in TypeScript**, exposing the internal data structures, intermediate states, and transformations across all seven classic phases of compilation.

---

## 2. Global Architectural Pipeline

```mermaid
flowchart TD
    SRC["Source Code (C-Like Mini-Language)"] --> P1["Phase 1: Lexical Analyzer (DFA)"]
    P1 -->|Token Stream & Spans| P2["Phase 2: Syntax Analyzer (Recursive-Descent)"]
    P2 -->|Concrete Parse Tree (CST)| P3["Phase 3: AST Generator"]
    P3 -->|Abstract Syntax Tree (AST)| P4["Phase 4: Semantic Analyzer & Scoped Symbol Table"]
    P4 -->|Type-Checked AST| P5["Phase 5: Intermediate Code (TAC) & Basic Blocks"]
    P5 -->|Three-Address Code (TAC)| P6["Phase 6: Code Optimizer (Folding, CSE, DCE)"]
    P6 -->|Optimized TAC| P7["Phase 7: Target Code Generator (RISC Assembly)"]
    P7 --> OUT["Executable Pseudo-Assembly"]

    subgraph Parsing Visualizers ["Parsing Theory Engines"]
        G["Grammar G"] --> LL1["LL(1) Predictive Engine (FIRST, FOLLOW, M-Table, Stack)"]
        G --> LR1["LR(1) Canonical Engine (Items, CLOSURE, GOTO, ACTION/GOTO)"]
    end
```

---

## 3. Seven Compiler Phases Specification

### Phase 1: Lexical Analysis (`src/compiler/lexer.ts`)
- **Input:** Source string.
- **Output:** Array of `Token` records with unique `id` (`tok_1`, `tok_2`), `type`, `value`, `line`, `column`, `start`, `end`.
- **Algorithm:** Deterministic character scanner with the Maximal Munch (longest match) rule.
- **Error Recovery:** Collects lexical errors with exact line/column coordinates and proceeds when possible.

### Phase 2: Syntax Analysis (`src/compiler/parser.ts`)
- **Input:** Token stream.
- **Output:** Concrete Parse Tree (`ParseTreeNode`) retaining all grammar terminals and structural punctuation, plus a comprehensive step-by-step reduction trace (`ParsingTraceEntry[]`).
- **Algorithm:** Recursive-descent parsing with strict precedence binding (Multiplication/Division > Addition/Subtraction > Relational comparisons).
- **Separation:** CST retains concrete grammar nodes, while AST abstracts away syntax noise.

### Phase 3: Abstract Syntax Tree (`src/compiler/ast.ts`)
- **Input:** Concrete derivation.
- **Output:** Minimal hierarchical tree (`ProgramNode`, `VarDeclarationNode`, `BinaryExpressionNode`, `IfStatementNode`, `WhileStatementNode`, etc.).
- **Cross-Phase Traceability:** Every AST node preserves its exact source span `loc: { line, column, start, end }` and stable `id`.

### Phase 4: Semantic Analysis (`src/compiler/semantic.ts` & `src/compiler/symbolTable.ts`)
- **Input:** Abstract Syntax Tree.
- **Output:** Scoped Symbol Table (`SymbolEntry[]`), semantic errors, and warnings.
- **Rules Enforced:**
  1. Declaration before use.
  2. Duplicate declaration prevention within the same lexical scope.
  3. Scope resolution across nested blocks (`{ ... }`).
  4. Division-by-zero detection.
  5. Uninitialized variable reference warnings.

### Phase 5: Intermediate Code Generation (`src/compiler/tac.ts`)
- **Input:** Verified AST.
- **Output:** Linear Three-Address Code (`TACInstruction[]`) and Control Flow Basic Blocks (`BasicBlock[]`).
- **Basic Block Partitioning (Leader Detection):**
  - **Rule 1:** The first instruction is a leader.
  - **Rule 2:** Any instruction that is the target of a conditional or unconditional branch (labels) is a leader.
  - **Rule 3:** Any instruction that immediately follows a branch is a leader.
  - Predecessor and successor edges are resolved to construct the Control Flow Graph (CFG).

### Phase 6: Code Optimization (`src/compiler/optimizer.ts`)
- **Input:** Linear TAC and Basic Blocks.
- **Output:** Optimized TAC, transformation audit log (`OptimizationLogEntry[]`), and reduction metrics.
- **Optimization Passes:**
  1. **Constant Folding:** Compile-time arithmetic evaluation (`10 + 20` $\to$ `30`).
  2. **Algebraic Simplification:** Identity and zero properties (`x * 1` $\to$ `x`, `x + 0` $\to$ `x`, `x * 0` $\to$ `0`).
  3. **Constant & Copy Propagation:** Replaces variable uses with known constants or aliases within basic blocks.
  4. **Common Subexpression Elimination (CSE):** Eliminates duplicate evaluations within straight-line blocks.
  5. **Dead-Code Elimination (DCE):** Purges unused intermediate temporaries while preserving side-effects.

### Phase 7: Target Code Generation (`src/compiler/targetCode.ts`)
- **Input:** Optimized TAC.
- **Output:** Pseudo-assembly instructions mapped to virtual machine registers (`R1` through `R6`).
- **ISA Supported:** `LOAD`, `STORE`, `ADD`, `SUB`, `MUL`, `DIV`, `MOD`, `CMP`, `JMP`, `JZ`, `JNZ`, `PRINT`, `HALT`.

---

## 4. Cross-Phase Synchronized Linking Architecture

```
Editor Token (tok_X)  <====>  AST Node (ast_Y)  <====>  TAC Instruction (tac_Z)  <====>  Target Assembly (asm_W)
```
Whenever a student interacts with any visualization panel:
1. `setActiveHighlight({ type, id, sourceSpan })` is dispatched to `CompilerContext`.
2. The Code Editor highlights the corresponding source lines and columns.
3. The AST Viewer highlights the corresponding subtree node.
4. The TAC Viewer highlights the corresponding linearized instruction.
5. The Target Code Viewer highlights the generated pseudo-assembly.
