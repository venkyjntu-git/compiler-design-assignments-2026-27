import React from 'react';
import { BookOpen, CheckCircle, Code2, Cpu } from 'lucide-react';

export default function AlgorithmExplanations() {
  return (
    <div className="analysis-container">
      {/* Overview */}
      <div className="theory-card">
        <div className="theory-header">
          <h4>Compiler Design Data-Flow Framework Documentation</h4>
          <span className="eq-tag">Reference Guide</span>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          This framework implements an end-to-end educational compiler pipeline: Lexing, Parsing, Abstract Syntax Tree generation, Three-Address Code (TAC) generation, Basic Block partitioning with Leader detection, Control Flow Graph (CFG) generation, and Iterative Fixed-Point Data-Flow analysis.
        </p>
      </div>

      {/* Supported C Subset */}
      <div className="theory-card">
        <div className="theory-header">
          <h4>Supported C Language Subset</h4>
          <span className="eq-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            Strict C Specification
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          <div>
            <strong style={{ color: 'var(--accent-cyan)' }}>Supported Features:</strong>
            <ul style={{ paddingLeft: 18, marginTop: 4 }}>
              <li><strong>Types:</strong> <code>int</code>, <code>void</code> functions</li>
              <li><strong>Control Flow:</strong> <code>if</code>, <code>if / else</code>, <code>while</code>, <code>for</code>, <code>do-while</code>, <code>break</code>, <code>continue</code>, <code>return</code></li>
              <li><strong>Operators:</strong> Arithmetic (<code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>%</code>), Relational (<code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>, <code>==</code>, <code>!=</code>), Logical (<code>&&</code>, <code>||</code>, <code>!</code>), Increment/Decrement (<code>++</code>, <code>--</code>), Compound (<code>+=</code>, <code>-=</code>, <code>*=</code>, <code>/=</code>)</li>
              <li><strong>Structures:</strong> Functions (<code>int main() {'{...}'}</code>) or standalone statement sequences</li>
            </ul>
          </div>
          <div>
            <strong style={{ color: 'var(--accent-coral)' }}>Unsupported Features (Rejected with friendly errors):</strong>
            <ul style={{ paddingLeft: 18, marginTop: 4 }}>
              <li>Floating-point types (<code>float</code>, <code>double</code>)</li>
              <li>Pointers (<code>*ptr</code>, <code>&amp;var</code>)</li>
              <li>Aggregate types (<code>struct</code>, <code>union</code>, <code>enum</code>)</li>
              <li>Unstructured jumps (<code>goto</code>)</li>
              <li>Switch-case constructs (<code>switch</code>, <code>case</code>)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Leader Detection Rules */}
      <div className="theory-card">
        <div className="theory-header">
          <h4>Basic Block Partitioning: The 3 Leader Rules</h4>
          <span className="eq-tag">Algorithm 1</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          <p>
            A <strong>Basic Block</strong> is a sequence of consecutive Three-Address Code instructions with a single entry (control enters only at the beginning) and a single exit (control leaves only at the end).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            <div className="eq-box">
              <span className="eq-label" style={{ minWidth: 60 }}>Rule 1:</span>
              <span>The first intermediate instruction of the program is always a leader.</span>
            </div>
            <div className="eq-box">
              <span className="eq-label" style={{ minWidth: 60 }}>Rule 2:</span>
              <span>Any instruction that is the target of a conditional or unconditional branch (<code>goto</code> or <code>ifFalse</code>) is a leader.</span>
            </div>
            <div className="eq-box">
              <span className="eq-label" style={{ minWidth: 60 }}>Rule 3:</span>
              <span>Any instruction that immediately follows a conditional or unconditional branch is a leader.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reaching Definitions */}
      <div className="theory-card">
        <div className="theory-header">
          <h4>1. Reaching Definitions Analysis</h4>
          <span className="eq-tag">Forward / Union</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          <p>
            A definition <code>d: x = ...</code> reaches a point <code>p</code> if there is a path from the point immediately following <code>d</code> to <code>p</code> along which <code>x</code> is not redefined (killed).
          </p>
          <div style={{ marginTop: 8 }}>
            <strong>Transfer Equation:</strong> <code>OUT[B] = GEN[B] ∪ (IN[B] − KILL[B])</code><br />
            <strong>Confluence (Meet):</strong> <code>IN[B] = ⋃_(P ∈ Pred(B)) OUT[P]</code><br />
            <strong>Boundary Condition:</strong> <code>OUT[ENTRY] = ∅</code>
          </div>
        </div>
      </div>

      {/* Live Variables */}
      <div className="theory-card">
        <div className="theory-header">
          <h4>2. Live Variable Analysis</h4>
          <span className="eq-tag badge-backward">Backward / Union</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          <p>
            A variable <code>x</code> is live at point <code>p</code> if the value of <code>x</code> at <code>p</code> could be used along some path in the flow graph starting at <code>p</code> before <code>x</code> is redefined.
          </p>
          <div style={{ marginTop: 8 }}>
            <strong>Transfer Equation:</strong> <code>IN[B] = USE[B] ∪ (OUT[B] − DEF[B])</code><br />
            <strong>Confluence (Meet):</strong> <code>OUT[B] = ⋃_(S ∈ Succ(B)) IN[S]</code><br />
            <strong>Boundary Condition:</strong> <code>IN[EXIT] = ∅</code>
          </div>
        </div>
      </div>

      {/* Available Expressions */}
      <div className="theory-card">
        <div className="theory-header">
          <h4>3. Available Expressions Analysis</h4>
          <span className="eq-tag badge-intersect">Forward / Intersection</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          <p>
            An expression <code>x + y</code> is available at point <code>p</code> if every path from the initial node to <code>p</code> evaluates <code>x + y</code>, and after the last such evaluation prior to reaching <code>p</code>, there are no subsequent assignments to <code>x</code> or <code>y</code>.
          </p>
          <div style={{ marginTop: 8 }}>
            <strong>Transfer Equation:</strong> <code>OUT[B] = e_GEN[B] ∪ (IN[B] − e_KILL[B])</code><br />
            <strong>Confluence (Meet):</strong> <code>IN[B] = ⋂_(P ∈ Pred(B)) OUT[P]</code><br />
            <strong>Boundary Condition:</strong> <code>OUT[ENTRY] = ∅</code>; for all other blocks, initial <code>OUT[B] = U</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
