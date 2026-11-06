# Architecture Diagram

```mermaid
flowchart TD
    U[User: grammar and input] --> UI[Streamlit interface: app.py]
    UI --> GP[Grammar parser]
    GP --> FF[first_follow.py: FIRST and FOLLOW]
    GP --> LR0[lr0.py: LR(0) item collection]
    GP --> LR1[lr1.py: Canonical LR(1) item collection]
    LR0 --> SLR[slr.py: SLR ACTION/GOTO]
    LR1 --> LR1T[lr1_table.py: LR(1) ACTION/GOTO]
    LR1 --> LALR[lalr.py: merge states with equal LR(0) cores]
    LALR --> LR1T
    SLR --> CA[Conflict analyzer]
    LR1T --> CA
    CA --> PR[precedence.py: optional precedence resolution]
    SLR --> PARSE[Shift-reduce parser]
    LR1T --> PARSE
    PR --> PARSE
    PARSE --> OUT[Trace, acceptance status, parse tree]
    UI --> OUT
```