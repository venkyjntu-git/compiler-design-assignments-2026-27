import React from 'react';
import { X, GitCommit, Layers, Code, ArrowRight } from 'lucide-react';

export default function BlockInspector({ block, analysisData, onClose }) {
  if (!block) return null;

  const bId = block.id;
  const rd = analysisData?.reaching_definitions;
  const lv = analysisData?.live_variables;
  const ae = analysisData?.available_expressions;

  const rdIn = rd?.final_in?.[bId] || [];
  const rdOut = rd?.final_out?.[bId] || [];
  const rdGen = rd?.block_gen?.[bId] || [];
  const rdKill = rd?.block_kill?.[bId] || [];

  const lvIn = lv?.final_in?.[bId] || [];
  const lvOut = lv?.final_out?.[bId] || [];
  const lvUse = lv?.block_gen?.[bId] || [];
  const lvDef = lv?.block_kill?.[bId] || [];

  const aeIn = ae?.final_in?.[bId] || [];
  const aeOut = ae?.final_out?.[bId] || [];
  const aeGen = ae?.block_gen?.[bId] || [];
  const aeKill = ae?.block_kill?.[bId] || [];

  return (
    <aside className="inspector-drawer open">
      <div className="drawer-header">
        <h4>
          <GitCommit size={16} style={{ color: 'var(--accent-cyan)' }} />
          <span>{bId} Block Inspector</span>
        </h4>
        <button className="btn-icon" onClick={onClose} title="Close Inspector">
          <X size={16} />
        </button>
      </div>

      <div className="drawer-body">
        {/* Predecessors & Successors */}
        <div className="drawer-group">
          <h5>Flow Connectivity</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', width: 70 }}>
                Preds:
              </span>
              <div className="drawer-pills">
                {block.predecessors?.length > 0 ? (
                  block.predecessors.map((p) => (
                    <span key={p} className="drawer-pill">
                      {p}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>None (Entry point)</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', width: 70 }}>
                Succs:
              </span>
              <div className="drawer-pills">
                {block.successors?.length > 0 ? (
                  block.successors.map((s) => (
                    <span key={s} className="drawer-pill">
                      {s}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>None (Exit point)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statements */}
        <div className="drawer-group">
          <h5>Intermediate 3-Address Instructions</h5>
          {block.instructions && block.instructions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {block.instructions.map((instr) => (
                <div
                  key={instr.id}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: instr.is_leader ? '#fde047' : '#cbd5e1',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {instr.is_leader && <span style={{ color: '#fde047' }}>★</span>}
                    <span>{instr.raw}</span>
                  </div>
                  {instr.c_stmt && (
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 2 }}>
                      C Line {instr.c_line}: {instr.c_stmt}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>
              {block.is_entry ? 'Program Entrypoint' : 'Program Termination'}
            </span>
          )}
        </div>

        {/* Reaching Definitions Sets */}
        {rd && (
          <div className="drawer-group">
            <h5 style={{ color: 'var(--accent-cyan)' }}>Reaching Definitions</h5>
            <div className="drawer-set-box">
              <div>
                <strong>GEN[B]:</strong> {`{ ${rdGen.join(', ') || '∅'} }`}
              </div>
              <div>
                <strong>KILL[B]:</strong> {`{ ${rdKill.join(', ') || '∅'} }`}
              </div>
              <div style={{ marginTop: 4, color: 'var(--accent-cyan)' }}>
                <strong>IN[B]:</strong> {`{ ${rdIn.join(', ') || '∅'} }`}
              </div>
              <div style={{ color: 'var(--accent-cyan)' }}>
                <strong>OUT[B]:</strong> {`{ ${rdOut.join(', ') || '∅'} }`}
              </div>
            </div>
          </div>
        )}

        {/* Live Variables Sets */}
        {lv && (
          <div className="drawer-group">
            <h5 style={{ color: 'var(--accent-purple)' }}>Live Variables</h5>
            <div className="drawer-set-box">
              <div>
                <strong>USE[B]:</strong> {`{ ${lvUse.join(', ') || '∅'} }`}
              </div>
              <div>
                <strong>DEF[B]:</strong> {`{ ${lvDef.join(', ') || '∅'} }`}
              </div>
              <div style={{ marginTop: 4, color: 'var(--accent-purple)' }}>
                <strong>OUT[B]:</strong> {`{ ${lvOut.join(', ') || '∅'} }`}
              </div>
              <div style={{ color: 'var(--accent-purple)' }}>
                <strong>IN[B]:</strong> {`{ ${lvIn.join(', ') || '∅'} }`}
              </div>
            </div>
          </div>
        )}

        {/* Available Expressions Sets */}
        {ae && (
          <div className="drawer-group">
            <h5 style={{ color: 'var(--accent-amber)' }}>Available Expressions</h5>
            <div className="drawer-set-box">
              <div>
                <strong>e_GEN[B]:</strong> {`{ ${aeGen.join(', ') || '∅'} }`}
              </div>
              <div>
                <strong>e_KILL[B]:</strong> {`{ ${aeKill.join(', ') || '∅'} }`}
              </div>
              <div style={{ marginTop: 4, color: 'var(--accent-amber)' }}>
                <strong>IN[B]:</strong> {`{ ${aeIn.join(', ') || '∅'} }`}
              </div>
              <div style={{ color: 'var(--accent-amber)' }}>
                <strong>OUT[B]:</strong> {`{ ${aeOut.join(', ') || '∅'} }`}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
