# CompilerVerse: Usability Testing & Educational Effectiveness Protocol
**Course:** Compiler Design (3rd-Year B.Tech Computer Science)  
**Track:** F – Visual and Educational Compiler Tooling  
**Problem Number:** 22  

---

## 1. Evaluation Objectives
The objective of this usability evaluation is to measure both the **educational efficacy** and the **system usability** of CompilerVerse with third-year undergraduate Computer Science students learning Compiler Design.

Specifically, the evaluation assesses:
1. **Knowledge Acquisition:** Whether interactive visualization of the 7 compiler phases and step-by-step LL(1)/LR(1) parsers produces measurable learning gains compared to traditional lecture notes.
2. **Mental Model Formation:** Whether cross-phase highlighting (connecting tokens to AST, TAC, and Assembly) clarifies the data transformations occurring inside a compiler.
3. **Usability & UX:** System Usability Scale (SUS) ratings, workflow friction, and overall learning satisfaction.

---

## 2. Testing Procedure
1. **Pre-Evaluation (10 minutes):**
   - The participant completes the 5-question pre-test quiz assessing baseline conceptual understanding of compiler phases, FIRST/FOLLOW, AST, and Three-Address Code.
2. **Platform Exploration & Tasks (25 minutes):**
   - **Task 1:** Open Compiler Playground, load `Example A`, run the pipeline, and observe how `a + b * 2` is parsed into an AST.
   - **Task 2:** Hover over token `c` and observe how it links to AST node `VarDeclaration`, TAC instruction `c = t2`, and assembly `STORE c, R3`.
   - **Task 3:** Navigate to the LL(1) Visualizer, play the predictive parsing stack simulation for `id + id * id`, and pause at step 4.
   - **Task 4:** Navigate to the LR(1) Visualizer, select state `I0`, inspect its closure items, and observe the shift-reduce sequence.
   - **Task 5:** Complete at least 5 questions in the Adaptive Quiz and reach at least the "Intermediate" difficulty level.
3. **Post-Evaluation (15 minutes):**
   - The participant completes the post-test quiz (identical difficulty covering the same topics).
   - The participant completes the Usability Survey (ratings 1–5 and qualitative feedback).

---

## 3. Pre-Test and Post-Test Quiz Instruments (Max Score: 10)

### Pre-Test Questions (2 marks each, total 10)
1. In recursive-descent parsing for arithmetic expressions, how is operator precedence enforced in the grammar?
2. If non-terminal $A \to \varepsilon$, how does $\text{FOLLOW}(A)$ influence the predictive parsing table $M[A, a]$?
3. What is the fundamental difference between an Abstract Syntax Tree (AST) and a Concrete Parse Tree (CST)?
4. Under classical leader detection for Three-Address Code, what are the three criteria that define an instruction as a leader?
5. What distinguishes Constant Folding from Constant Propagation during optimization?

### Post-Test Questions (2 marks each, total 10)
1. For production $E \to T E'$ and $E' \to + T E' \mid \varepsilon$, explain why $M[E', +]$ receives $E' \to + T E'$ while $M[E', \$]$ receives $E' \to \varepsilon$.
2. In an LR(1) item $[A \to \alpha \bullet \beta, a]$, what does the lookahead terminal $a$ represent, and when is it checked?
3. In CompilerVerse, how does the leader detection algorithm partition instructions into basic blocks?
4. How does algebraic simplification optimize instructions of the form $x * 1$ and $x + 0$?
5. How does cross-phase linking demonstrate the connection between high-level variable assignments and CPU register operations?

---

## 4. Participant Performance & Learning Gain Record

> **Note on Academic Integrity:** As required by Section 17 of the assignment specification, participant rows are provided with standardized scoring templates ready for actual in-person testing with five classmates. No fake test results or fabricated student scores are presented.

### Learning Improvement Formula:
$$\text{Normalized Gain } (g) = \frac{\text{Post Score} - \text{Pre Score}}{\text{Max Score} - \text{Pre Score}} \times 100\%$$
*(For students who score 10/10 on both, $g = 100\%$)*

### Evaluation Results Table:

| Participant ID | Class / Year | Pre-Test Score (/10) | Post-Test Score (/10) | Improvement Gain ($g$) | Evaluation Status |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Participant 1** | 3rd Year B.Tech CSE | _[To be recorded]_ | _[To be recorded]_ | _[To be calculated]_ | Scheduled |
| **Participant 2** | 3rd Year B.Tech CSE | _[To be recorded]_ | _[To be recorded]_ | _[To be calculated]_ | Scheduled |
| **Participant 3** | 3rd Year B.Tech CSE | _[To be recorded]_ | _[To be recorded]_ | _[To be calculated]_ | Scheduled |
| **Participant 4** | 3rd Year B.Tech CSE | _[To be recorded]_ | _[To be recorded]_ | _[To be calculated]_ | Scheduled |
| **Participant 5** | 3rd Year B.Tech CSE | _[To be recorded]_ | _[To be recorded]_ | _[To be calculated]_ | Scheduled |

---

## 5. System Usability Scale (SUS) & Survey Template

*(Scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree)*

| Survey Question | Participant 1 | Participant 2 | Participant 3 | Participant 4 | Participant 5 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 1. The 7-phase visual flow helped me understand compiler pipeline transformations. | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ |
| 2. The cross-phase token/AST/TAC highlighting clarified code relationships. | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ |
| 3. The LL(1) stack simulation made top-down leftmost derivation easy to follow. | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ |
| 4. The Canonical LR(1) closure and item sets demystified shift-reduce parsing. | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ |
| 5. The interface was intuitive, responsive, and aesthetically pleasing. | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ |
| 6. The Adaptive Quiz gave useful explanations that helped correct misconceptions. | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ | _[1-5]_ |

### Qualitative Feedback Fields:
- **Most Valuable Feature:** _[Participant notes to be added after session]_
- **Points of Confusion / Recommendations:** _[Participant notes to be added after session]_
