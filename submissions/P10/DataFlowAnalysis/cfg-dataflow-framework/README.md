# CFG and Data-Flow Analysis Framework

An interactive, beginner-friendly compiler analysis and educational platform designed for university Compiler Design coursework, project submissions, and viva demonstrations.

The platform accepts arbitrary user-written programs in a documented C-like language subset, parses them into Three-Address Code (TAC), partitions them into basic blocks using leader detection rules, constructs an interactive Control Flow Graph (CFG), and solves iterative fixed-point data-flow equations (**Reaching Definitions**, **Live Variables**, and **Available Expressions**).

---

## 🏛️ Architecture Overview

The framework follows a modular decoupled architecture with dual execution capabilities:

```text
[ Source Code (C Subset / TAC) ]
           │
           ▼
[ Lexer (lexer.py / clientCompiler.js) ] ──▶ Tokens (line & column positions)
           │
           ▼
[ Recursive-Descent Parser (parser.py) ] ──▶ Abstract Syntax Tree (AST)
           │
           ▼
[ TAC Generator (basic_blocks.py) ] ──────▶ Linear Three-Address Code (TAC) Quadruples
           │
           ▼
[ BasicBlockBuilder (basic_blocks.py) ] ──▶ Leader Detection (Rules 1, 2, 3) & Basic Blocks
           │
           ▼
[ CFGBuilder (compiler/cfg.py) ] ────────▶ Directed CFG (ENTRY, Blocks, EXIT, Edges)
           │
           ├──▶ [ Reaching Definitions ] ──▶ Forward May, ∪  ──▶ Uninitialized Warnings
           ├──▶ [ Live Variables ]       ──▶ Backward May, ∪ ──▶ Dead Code Elimination (DCE)
           └──▶ [ Available Expressions ] ──▶ Forward Must, ∩ ──▶ Common Subexpression Elimination (CSE)
           │
           ▼
[ Dual Execution Engine ]
 ├── Primary:  FastAPI Server (main.py : 8000)
 └── Fallback: In-Browser Client Compiler Engine (Zero-Failure Offline Viva Mode)
           │
           ▼
[ React + Vite Professional UI (localhost:5173) ]
     ├── Interactive React Flow CFG Canvas & Zoom/Pan MiniMap
     ├── Linear 3AC Quadruples Inspector with ★ Leader Badges
     ├── Canonical IN/OUT Table with 1-Click LaTeX & Markdown Export
     ├── Interactive Fixpoint Iteration Scrubber with Auto-Play & Speed Slider
     ├── Compiler Optimization Opportunities & Diagnostic Insights
     └── Viva & Theory Quick Reference Guide (Modal)
```

---

## 🚀 Quickstart & One-Click Launch

### Option A: One-Click Full Launch (Recommended for Windows)
Simply double-click:
```text
cfg-dataflow-framework/start_all.bat
```
This automatically starts both the FastAPI backend and Vite frontend in separate terminal windows and opens `http://localhost:5173/` in your browser.

---

### Option B: Step-by-Step Manual Launch

#### 1. Start the Backend API (FastAPI)
Using the provided launcher:
```powershell
cd cfg-dataflow-framework/backend
.\run_backend.bat
# Or in PowerShell:
.\run_backend.ps1
```

Or run directly with Python:
```powershell
cd cfg-dataflow-framework/backend

# 1. Create virtual environment
python -m venv venv

# 2. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 3. Install backend dependencies
python -m pip install -r requirements.txt

# 4. Run the FastAPI server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- Backend API: `http://127.0.0.1:8000/`
- Interactive Swagger API Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

#### 2. Start the Frontend (React + Vite)
In a separate terminal:
```powershell
cd cfg-dataflow-framework/frontend

# Install dependencies (first time only)
npm install

# Start Vite dev server
npm run dev
```
- Open `http://localhost:5173/` in your browser.

---

## 🛠️ Common Troubleshooting

### Fix: `uvicorn : The term 'uvicorn' is not recognized`
**Cause:** On Windows, `uvicorn` is installed as a Python script inside Python's or virtual environment's `Scripts/` folder, which is not in your global system `PATH`, or the virtual environment hasn't been activated.

**Solutions:**
1. **Use the one-click launcher:** Run `run_backend.bat` in `cfg-dataflow-framework/backend/` — it automatically activates the venv and uses `python -m uvicorn`.
2. **Run via python module:**
   ```powershell
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
3. **Or launch main.py directly:**
   ```powershell
   python main.py
   ```
4. **Offline / Standalone Fallback:** If you do not have Python installed on the presentation machine, the framework includes an **In-Browser Client Compiler Engine** that compiles code, detects leaders, builds the CFG, and solves all 3 data-flow equations client-side with 0 setup required!

---

## 🎓 Viva & Theoretical Reference Guide

### 1. Three Rules of Leader Detection (Basic Block Partitioning)
1. **Rule 1 (Entry):** The very first instruction in the intermediate code is a leader.
2. **Rule 2 (Jump Target):** Any instruction that is the target of a conditional (`if_goto`) or unconditional (`goto`) jump is a leader.
3. **Rule 3 (Post Jump):** Any instruction immediately following a conditional or unconditional jump is a leader.

> **Basic Block Definition:** A sequence of consecutive statements in which flow of control enters at the beginning and leaves at the end without halt or possibility of branching except at the end.

---

### 2. Canonical Data-Flow Analysis Comparison

| Property | Reaching Definitions | Live Variables | Available Expressions |
| :--- | :--- | :--- | :--- |
| **Domain** | Set of Definitions ($d_i$) | Set of Variable Names ($x$) | Set of Binary Expressions ($a \text{ op } b$) |
| **Direction** | Forward ($\downarrow$) | Backward ($\uparrow$) | Forward ($\downarrow$) |
| **Lattice Meet** | Union ($\cup$) — May | Union ($\cup$) — May | Intersection ($\cap$) — Must |
| **Transfer Function** | $\text{OUT}[B] = \text{GEN}[B] \cup (\text{IN}[B] - \text{KILL}[B])$ | $\text{IN}[B] = \text{USE}[B] \cup (\text{OUT}[B] - \text{DEF}[B])$ | $\text{OUT}[B] = \text{GEN}[B] \cup (\text{IN}[B] - \text{KILL}[B])$ |
| **Confluence** | $\text{IN}[B] = \bigcup_{P \in \text{Pred}(B)} \text{OUT}[P]$ | $\text{OUT}[B] = \bigcup_{S \in \text{Succ}(B)} \text{IN}[S]$ | $\text{IN}[B] = \bigcap_{P \in \text{Pred}(B)} \text{OUT}[P]$ |
| **Boundary** | $\text{OUT}[\text{ENTRY}] = \emptyset$ | $\text{IN}[\text{EXIT}] = \emptyset$ | $\text{OUT}[\text{ENTRY}] = \emptyset$ |
| **Initial States** | $\text{OUT}[B] = \emptyset$ for all $B$ | $\text{IN}[B] = \emptyset$ for all $B$ | $\text{OUT}[B] = U$ for all $B \ne \text{ENTRY}$ |
| **Optimization** | Uninitialized Variable Detection | Dead Code Elimination (DCE) | Common Subexpression Elimination (CSE) |

---

## 📜 Supported Language Syntax

The compiler processes user-written programs within the following documented grammar:

### ✅ Supported Constructs
- **Variable Assignments**: Explicit declarations (`int x = 10;`) and direct assignments (`x = 10;`)
- **Arithmetic Expressions**: Binary operators `+`, `-`, `*`, `/`, `%` with operator precedence and grouping parentheses `(a + b) * 2`
- **Relational & Equality Operators**: `<`, `<=`, `>`, `>=`, `==`, `!=`
- **Logical Operators**: `&&`, `||`, `!`
- **Conditionals**: `if (cond) { ... } else { ... }` and single-statement branches without braces
- **Loops**: `while (cond) { ... }`, `for (init; cond; post) { ... }`, and `do { ... } while (cond);`
- **Nested Control Flow**: Nested `if` inside `if`, `while` inside `while`, and conditionals inside loops
- **Program Structures**: Formal C functions (`int main() { ... }`) or bare top-level statement sequences
- **Return Statements**: `return expr;` or `return;`

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Returns `{"status": "healthy"}` |
| `GET` | `/api/samples` | None | Returns list of benchmark C sample programs |
| `POST` | `/api/cfg/build` | `{"code": str}` | Compiles source code into CFG JSON structure |
| `POST` | `/api/analyze/reaching-definitions` | `{"code": str}` | Runs Reaching Definitions fixed-point analysis |
| `POST` | `/api/analyze/live-variables` | `{"code": str}` | Runs Live Variable analysis |
| `POST` | `/api/analyze/available-expressions` | `{"code": str}` | Runs Available Expressions analysis |
| `POST` | `/api/analyze/all` | `{"code": str}` | Runs full compiler pipeline, all 3 analyses & diagnostics |

---

## 🧪 Testing Commands

### Backend Automated Tests
```powershell
cd cfg-dataflow-framework/backend
.\venv\Scripts\Activate.ps1
pytest -v
```
- Total test count: **34 passing tests** across lexer, parser, basic blocks, CFG construction, and all 3 data-flow analyses.

### Frontend Production Build
```powershell
cd cfg-dataflow-framework/frontend
npm run build
```
Vite compiles the production bundle cleanly with 0 errors.

---

## 📄 License & Academic Submission
Developed for University Compiler Design coursework, demonstrations, and viva defense. Includes full source code, test suites, and interactive educational visualizers.
