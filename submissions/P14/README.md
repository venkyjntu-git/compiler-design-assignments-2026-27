# CodeGuard AI

AST-based code clone and structural plagiarism detection system that analyzes Abstract Syntax Tree topologies invariant to renaming, whitespace, and statement modifications.


## Team
- Puli Bhumika, 24VV1A0550
- Pothuri Usha Susmitha, 24VV1A0548
- Potnuru Rahul Naidu , 24VV1A0549
- Problem: P14 - AST-Based Code Clone & Plagiarism Detection System
- Course: Compiler Design, 2026-27

## Problem statement
Traditional code similarity tools rely heavily on lexical token frequencies, character diffs, or naive string matching, making them trivial to bypass through superficial obfuscations such as identifier renaming, comment injection, and whitespace manipulation.
In academic programming environments, instructors need a principled approach to verify whether two submissions share identical algorithmic structures. CodeGuard AI solves this by transforming source code into compiler Abstract Syntax Trees (ASTs) and performing intermediate representation canonicalization and subtree decomposition. This allows educators and developers to reliably detect Type-1, Type-2, and Type-3 clones regardless of surface-level cosmetic modifications.

## Background theory
In compiler frontends, after Lexical Analysis (scanning characters into tokens) and Syntax Analysis (validating tokens against grammar production rules), the compiler generates an **Abstract Syntax Tree (AST)**. The AST abstracts away concrete syntax trivia (such as semicolons, whitespace, parenthetical groupings, and comments) and models the hierarchical syntactic structure of the program as a tree of operators, operands, and control-flow blocks.

To detect structural clones, CodeGuard AI applies **Alpha-Conversion (Scope-Aware Identifier Canonicalization)** and **Subtree Multiset Decomposition**:
1. **Trivia Elimination:** Python's PEG parser naturally ignores whitespace variations and non-semantic comments during AST generation.
2. **Identifier Normalization:** Local variables and parameter names are mapped to canonical identifiers (`var_0`, `var_1`, `func_0`) using local scope symbol tables while preserving standard library and built-in keywords.
3. **Subtree Hashing:** Every node in the normalized AST is recursively hashed using structural signatures (node types and operand relationships) following the Deckard tree-decomposition algorithm.
4. **Metric Formulation:** Subtree multisets are compared via Dice and Jaccard coefficients:
   $$\text{Dice}(T_A, T_B) = \frac{2 \times \sum_{s} \min(M_A(s), M_B(s))}{|M_A| + |M_B|}$$
   Combined with linearized pre-order sequence alignment (Gestalt Pattern Matching) and node type vector distributions:
   $$\mathbf{AST\ Similarity} = 0.55 \times \text{Subtree Dice} + 0.30 \times \text{Sequence Sim} + 0.15 \times \text{Node Type Jaccard}$$

### Worked Example:
Consider Program A and Program B:
- **Program A:**
  ```python
  def compute_sum(limit):
      total = 0
      for i in range(limit):
          total += i
      return total
  ```
- **Program B:**
  ```python
  # Optimized accumulator
  def calc(n):
      """Sums up to n"""
      acc = 0  # start at 0
      for x in range(n):
          acc += x  # increment
      return acc
  ```

**Compilation & Analysis Steps:**
1. **Lexical & Syntax Parsing:** Both programs are parsed into `Module -> FunctionDef -> [Assign, For, Return]`. All comments and docstrings in Program B are stripped during tree generation.
2. **Scope-Aware Normalization:**
   - Program A symbol table: `compute_sum` $\to$ `func_0`, `limit` $\to$ `var_0`, `total` $\to$ `var_1`, `i` $\to$ `var_2`.
   - Program B symbol table: `calc` $\to$ `func_0`, `n` $\to$ `var_0`, `acc` $\to$ `var_1`, `x` $\to$ `var_2`.
   - Both normalized programs unparse to:
     ```python
     def func_0(var_0):
         var_1 = 0
         for var_2 in range(var_0):
             var_1 += var_2
         return var_1
     ```
3. **Subtree Hash Comparison:** Because the canonical trees and child node types (`FunctionDef`, `Assign`, `For`, `AugAssign`, `Return`) are topologically identical, the calculated Subtree Dice index is **100.0%**, exposing an exact Type-2 clone despite distinct variable names and heavy commentary.

## Features
- [x] **Compiler Front-End Parser:** Parses Python source into validated ASTs using Python's grammar parser with line and column syntax error diagnostics.
- [x] **Scope-Aware Normalization (Alpha-Conversion):** Canonicalizes identifiers (`var_0`, `var_1`, `func_0`) and normalizes parameter signatures while preserving built-ins.
- [x] **Multi-Metric Structural Similarity:** Combines multiset subtree hashing (Deckard algorithm pattern), linearized pre-order sequence alignment, and AST node distribution cosine metrics.
- [x] **Lexical & Trivia Stripping:** Automatically removes docstrings, inline comments, blank lines, and whitespace formatting differences.
- [x] **McCabe Cyclomatic Complexity & AST Metrics:** Computes decision node branches ($V(G) = P + 1$), maximum tree depth, and node category distributions.
- [x] **Interactive D3.js SVG Visualizer:** Side-by-side expandable/collapsible visual AST syntax trees with interactive node inspection and compiler documentation tooltips.
- [x] **Clone Categorization:** Automatically classifies similarities into High ($\ge 80\%$), Moderate ($50\% - 79\%$), or Low ($< 50\%$) clone categories.
- [x] **SQLite Audit & History Persistence:** Stores past comparisons, scores, and timestamps in a local SQLite database with JSON retrieval API.
- [ ] *Stretch Goal:* Multi-language AST parsing (supporting C, C++, and Java via Tree-sitter grammar parsers).
- [ ] *Stretch Goal:* Control Flow Graph (CFG) basic block analysis for algorithmic Type-4 semantic clone detection (e.g., while-loop vs recursion).

## Architecture
```mermaid
flowchart TD
    A["Raw Python Programs (A & B)"] --> B["Lexical Analysis & Scanner\n(Python Tokenizer)"]
    B --> C["Syntax Analysis\n(PEG Parser)"]
    C -->|Syntax Error| Err["Syntax Error Diagnostic Handler\n(Line, Col, Pointer)"]
    C -->|Valid AST| D["Abstract Syntax Tree Generation\n(ast.AST)"]
    
    subgraph NormalizationEngine ["AST Canonicalization Engine (normalizer.py)"]
        D --> E1["Identifier Alpha-Conversion\n(Symbol Table Mapping)"]
        E1 --> E2["Docstring & Trivia Stripping"]
        E2 --> E3["Commutative Operator Ordering"]
    end
    
    NormalizationEngine --> F["Normalized AST Representations"]
    
    subgraph ComparisonEngine ["Multi-Metric Similarity Engine (similarity.py)"]
        F --> G1["Subtree Multiset Hashing\n(Dice & Jaccard Index)"]
        F --> G2["Linearized Pre-Order Alignment\n(Gestalt Pattern Matching)"]
        F --> G3["Node Frequency Vector Cosine\n(Type Distribution)"]
        F --> G4["Surface Text & Token Baselines"]
    end
    
    G1 & G2 & G3 & G4 --> H["Composite Similarity Synthesizer\n(comparator.py)"]
    H --> I["D3.js SVG Interactive Tree Visualizer\n(Frontend SPA)"]
    H --> J["SQLite Historical Report Store\n(database.py)"]
```

## Installation
```bash
git clone https://github.com/bhumika8328/codeguard-ai.git
cd codeguard-ai

python3 -m venv venv
# On Windows:
.\venv\Scripts\activate

pip install -r requirements.txt
```

## Usage

Usage
1. Interactive Web Application
Launch the Flask local server:

bash


python run.py
Then open your browser at:
http://127.0.0.1:5000


# One command that runs all tests
python -m unittest discover codeguard-ai/tests
What the tests cover (22 Automated Tests):

tests/test_ast_parser.py (6 tests): Validates AST parsing, empty code rejection, syntax error reporting with exact line and column numbers, AST JSON serialization, node classification, and Cyclomatic Complexity calculations.
tests/test_normalizer.py (5 tests): Validates variable renaming (alpha-conversion), function name normalization, comment and docstring removal, literal masking, and built-in protection.
tests/test_similarity.py (6 tests): Validates subtree hashing consistency, multiset Jaccard/Dice indices, pre-order sequence alignment, node distribution cosine similarity, and SQLite report persistence.
tests/test_api.py (5 tests): Tests Flask REST API endpoints (/, /api/samples, /api/ast, /api/compare, and /api/history).
Limitations and future work
Language Scope: Current parsing and normalization are targeted to the Python 3 grammar. Future work will incorporate Tree-sitter grammars to support C, C++, and Java.
Type-4 Semantic Clones: Algorithms with fundamentally different control structures (e.g., recursive vs. iterative binary search) generate different AST hierarchies and produce lower structural scores. Future work will integrate Control Flow Graph (CFG) basic block graph isomorphism.
Instruction Reordering: Independent non-dependent assignment reordering slightly alters linearized pre-order sequences; future work will incorporate data dependency graph (DDG) analysis.


### Credits and references
Aho, A. V., Lam, M. S., Sethi, R., & Ullman, J. D. (2006). Compilers: Principles, Techniques, and Tools (2nd ed.). Addison-Wesley (The Dragon Book).
Jiang, L., Misherghi, G., Su, Z., & Glondu, S. (2007). DECKARD: Scalable and Accurate Tree-based Detection of Code Clones. IEEE/ACM International Conference on Software Engineering (ICSE).
Roy, C. K., & Cordy, J. R. (2007). A Survey on Software Clone Detection Research. School of Computing, Queen's University.
Python Standard Library: ast module (AST parsing and visitation), tokenize module (Lexical scanning).
D3.js (v7): Hierarchical Tree Layout and SVG interactive rendering.
Monaco Editor: Web-based code editor interface.
AI Assistance: Architectural design and benchmark synthesis developed with assistance from Google Antigravity.
