# CompilerVerse: Viva & Demonstration Walkthrough Guide
**Course:** Compiler Design (3rd-Year B.Tech Computer Science)  
**Track:** F – Visual and Educational Compiler Tooling  
**Problem Number:** 22  

---

## 1. Quick Demonstration Script (5-Minute Viva Walkthrough)

### Step 1: Introduction & Dashboard (1 Minute)
- **Action:** Open `http://localhost:3000` (or production URL).
- **Explanation:** Introduce **CompilerVerse** ("Understand Every Step. Visualize Every Transformation.").
- **Showcase:**
  - Highlight the 7-phase compilation pipeline flow at the top.
  - Explain the 11-topic curriculum covering Lexical Analysis through Target Code Generation and parsing theory.
  - Point out real user statistics pulled from `localStorage` (Compilations Run, Quiz Attempts, Accuracy, Adaptive Tier).

---

### Step 2: Compiler Playground & 7 Phases (2 Minutes)
- **Action:** Click **Compiler Playground** in the sidebar.
- **Explanation:**
  - Select **Example A** from the dropdown:
    ```c
    int a = 10;
    int b = 20;
    int c = a + b * 2;
    print(c);
    ```
  - Click **Run Pipeline**.
- **Inspect Phases:**
  1. **Tokens Tab:** Show typed tokens (`KEYWORD`, `IDENTIFIER`, `NUMBER`, `OPERATOR`, `SEPARATOR`, `DELIMITER`) with 1-based line:column coordinates and byte offsets.
  2. **Parse Tree Tab:** Expand the Concrete Parse Tree (CST) and show the recursive-descent reduction trace log.
  3. **AST Tab:** Select the `BinaryExpression (+)` node. Show how the left child is `a` and the right child is `BinaryExpression (*)` (`b * 2`), verifying proper operator precedence.
  4. **Cross-Phase Highlighting:** Hover over token `c` or click an AST node. Notice how the editor highlights the exact source code span, the TAC panel highlights `c = t2`, and the Target Code highlights `STORE c, R3`.
  5. **Symbols Tab:** Show the Scoped Symbol Table with identifier names, types (`int`), scopes (`global`), initial values, and usage counts.
  6. **TAC & Basic Blocks Tab:** Toggle between **Basic Blocks** and **Linear TAC**. Explain leader detection (first instruction, jump targets, instruction following jumps).
  7. **Optimizer Tab:** Select **Example E (Optimization Showcase)** or observe how Constant Folding computed compile-time values, showing before/after counts and reduction percentage.
  8. **Target Code Tab:** Show generated RISC-style pseudo-assembly (`LOAD`, `STORE`, `MUL`, `ADD`, `PRINT`, `HALT`) and explain simulated register allocation across `R1` to `R6`.

---

### Step 3: LL(1) Predictive Parsing Visualizer (1 Minute)
- **Action:** Click **LL(1) Visualizer** in the sidebar.
- **Explanation:**
  - Standard arithmetic grammar: $E \to T E'$, $E' \to + T E' \mid \varepsilon$, $T \to F T'$, $T' \to * F T' \mid \varepsilon$, $F \to ( E ) \mid \text{id}$.
  - Show algorithmically computed **FIRST** and **FOLLOW** sets.
  - Inspect the conflict-free **M[A, a]** predictive parsing table.
  - Click **Play** on the input `id + id * id`. Observe stack matching, epsilon reductions, and string acceptance with 0 errors.

---

### Step 4: Canonical LR(1) Bottom-Up Visualizer (1 Minute)
- **Action:** Click **LR(1) Visualizer** in the sidebar.
- **Explanation:**
  - Augmented grammar: $S' \to E$.
  - Canonical collection of item sets $I_0 \dots I_n$ generated algorithmically via CLOSURE and GOTO.
  - Click on State $I_0$ to inspect dotted items $[A \to \alpha \bullet \beta, a]$ and lookahead symbols.
  - Click **Play** on the shift-reduce simulation. Point out the State Stack and Symbol Stack, showing rightmost derivation in reverse.

---

### Step 5: Animated Lessons & Adaptive Quiz (30 Seconds)
- **Action:** Show **Animated Lessons** and **Adaptive Quiz**.
- **Explanation:**
  - Point to the Manim Community Python source scripts (`animations/ll1_parsing.py` and `animations/lr1_parsing.py`) and demonstrate the live scene viewer.
  - Answer a question in the Adaptive Quiz. Show that consecutive correct answers automatically scale difficulty from Beginner to Intermediate to Advanced.
