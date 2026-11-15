# CFG & Data-Flow Analysis Framework

An interactive compiler analysis and educational platform designed for university Compiler Design coursework, project submission, and viva demonstrations.

The complete application is located in the [`cfg-dataflow-framework/`](./cfg-dataflow-framework) directory.

---

## ⚡ Quick Start (One-Click)

On Windows, simply run:
```text
cfg-dataflow-framework\start_all.bat
```
This automatically boots:
- The **FastAPI Backend Compiler** (`http://127.0.0.1:8000`)
- The **React + Vite Visualizer** (`http://localhost:5173`)
- Opens the web platform in your browser.

---

## 📂 Project Structure

```text
DataFlowAnalysis/
└── cfg-dataflow-framework/
    ├── start_all.bat           # One-click launcher for full stack
    ├── backend/                # Python FastAPI compiler service
    │   ├── compiler/           # Lexer, Parser, 3AC, CFG, Data-Flow solvers
    │   ├── tests/              # 34 automated unit & integration tests
    │   ├── main.py             # FastAPI REST endpoints
    │   ├── run_backend.bat     # Windows batch launcher (auto-setup)
    │   └── run_backend.ps1     # PowerShell launcher
    ├── frontend/               # React + Vite visualizer
    │   ├── src/components/     # Interactive React Flow CFG canvas
    │   ├── src/services/       # Dual-engine API & client compiler fallback
    │   └── package.json        # Frontend dependencies
    └── README.md               # Detailed technical documentation & Viva Guide
```

For full documentation, architecture diagrams, theoretical equations, and viva questions, see [cfg-dataflow-framework/README.md](./cfg-dataflow-framework/README.md).

