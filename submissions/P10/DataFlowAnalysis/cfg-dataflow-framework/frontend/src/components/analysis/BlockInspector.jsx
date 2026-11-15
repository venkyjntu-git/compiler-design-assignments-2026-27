import React from 'react';
import {
  GitCommit,
  X,
  Layers,
  ArrowRight,
  Info,
  CornerDownRight,
  HelpCircle
} from 'lucide-react';

export default function BlockInspector({
  block,
  analysisData,
  activeType = 'rd',
  onClose,
  onSelectBlock
}) {
  if (!block) {
    return (
      <aside className="inspector-panel" aria-label="Contextual Block Inspector">
        <div className="inspector-header">
          <div className="inspector-title-group">
            <Layers size={14} className="text-muted" />
            <span className="inspector-title">Block Inspector</span>
          </div>
        </div>
        <div className="inspector-empty-body">
          <div className="inspector-empty-icon">
            <GitCommit size={24} className="text-muted" />
          </div>
          <h4 className="inspector-empty-heading">No Block Selected</h4>
          <p className="inspector-empty-text">
            Click any basic block in the Control Flow Graph or select a row in the data-flow table to inspect its instructions, predecessors, successors, and active sets.
          </p>
        </div>
      </aside>
    );
  }

  const bId = block.id;
  const isTerminal = block.is_entry || block.is_exit;

  const currentAnalysis =
    activeType === 'rd'
      ? analysisData?.reaching_definitions
      : activeType === 'lv'
      ? analysisData?.live_variables
      : analysisData?.available_expressions;

  const genSet = currentAnalysis?.block_gen?.[bId] || [];
  const killSet = currentAnalysis?.block_kill?.[bId] || [];
  const inSet = currentAnalysis?.final_in?.[bId] || [];
  const outSet = currentAnalysis?.final_out?.[bId] || [];

  const renderChips = (items) => {
    if (!items || items.length === 0) {
      return <span className="empty-set-notation">&#123;&#125;</span>;
    }
    return (
      <div className="set-chips-flow">
        {items.map((item) => (
          <span key={item} className="set-chip">
            {item}
          </span>
        ))}
      </div>
    );
  };

  // Academic explanation tailored to the analysis model
  let beginnerExplanation = '';
  if (activeType === 'rd') {
    beginnerExplanation =
      'IN[B] contains all variable definitions that reach the entry of this basic block along at least one path without being overwritten (killed).';
  } else if (activeType === 'lv') {
    beginnerExplanation =
      'OUT[B] contains all variables whose current values might be read along some future execution path before they are redefined.';
  } else if (activeType === 'ae') {
    beginnerExplanation =
      'IN[B] contains all expressions whose computed values are guaranteed to be available along every path entering this block without operand invalidation.';
  }

  return (
    <aside className="inspector-panel" aria-label="Contextual Block Inspector">
      {/* Header */}
      <div className="inspector-header">
        <div className="inspector-title-group">
          <GitCommit size={15} className="text-accent" />
          <span className="inspector-title">{bId} Block Inspector</span>
          <span className="inspector-type-tag">
            {block.is_entry ? 'ENTRY' : block.is_exit ? 'EXIT' : 'Basic Block'}
          </span>
        </div>
        {onClose && (
          <button className="btn-icon" onClick={onClose} title="Close Inspector">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="inspector-content">
        {/* Beginner friendly conceptual explanation */}
        <div className="inspector-concept-card">
          <div className="concept-header">
            <HelpCircle size={13} className="text-secondary" />
            <span className="concept-title">Data-Flow Semantics</span>
          </div>
          <p className="concept-text">{beginnerExplanation}</p>
        </div>

        {/* Connectivity: Predecessors & Successors */}
        <div className="inspector-group">
          <span className="inspector-group-title">Control-Flow Connectivity</span>
          <div className="conn-grid">
            <div className="conn-row">
              <span className="conn-label">Predecessors:</span>
              <div className="conn-pills">
                {block.predecessors?.length > 0 ? (
                  block.predecessors.map((p) => (
                    <button
                      key={p}
                      className="conn-pill"
                      onClick={() => onSelectBlock && onSelectBlock(p)}
                      title={`Jump to predecessor ${p}`}
                    >
                      {p}
                    </button>
                  ))
                ) : (
                  <span className="conn-none">None (Program Entry)</span>
                )}
              </div>
            </div>

            <div className="conn-row">
              <span className="conn-label">Successors:</span>
              <div className="conn-pills">
                {block.successors?.length > 0 ? (
                  block.successors.map((s) => (
                    <button
                      key={s}
                      className="conn-pill"
                      onClick={() => onSelectBlock && onSelectBlock(s)}
                      title={`Jump to successor ${s}`}
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <span className="conn-none">None (Program Exit)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statements / 3AC Instructions */}
        <div className="inspector-group">
          <div className="inspector-group-header">
            <span className="inspector-group-title">Instructions in Block</span>
            <span className="instr-count-badge">
              {block.instructions?.length || 0} instructions
            </span>
          </div>

          <div className="inspector-instr-list">
            {block.instructions && block.instructions.length > 0 ? (
              block.instructions.map((instr) => (
                <div
                  key={instr.id}
                  className={`inspector-instr-item ${instr.is_leader ? 'is-leader' : ''}`}
                >
                  <div className="instr-gutter">
                    {instr.is_leader ? (
                      <span className="leader-star" title="Block Leader">★</span>
                    ) : (
                      <span className="instr-num">{instr.id}</span>
                    )}
                  </div>
                  <code className="instr-code">{instr.raw}</code>
                </div>
              ))
            ) : (
              <div className="inspector-empty-instr">
                {isTerminal ? 'Terminal CFG boundary capsule' : 'No instructions in block'}
              </div>
            )}
          </div>
        </div>

        {/* Data-Flow Facts for Current Model */}
        {currentAnalysis && (
          <div className="inspector-group">
            <span className="inspector-group-title">
              {currentAnalysis.analysis_type} Facts
            </span>
            <div className="facts-grid">
              <div className="fact-item">
                <span className="fact-label">
                  {activeType === 'lv' ? 'USE[B] (Used Before Defined):' : 'GEN[B] (Generated Facts):'}
                </span>
                <div className="fact-value">{renderChips(genSet)}</div>
              </div>

              <div className="fact-item">
                <span className="fact-label">
                  {activeType === 'lv' ? 'DEF[B] (Defined In Block):' : 'KILL[B] (Killed Facts):'}
                </span>
                <div className="fact-value">{renderChips(killSet)}</div>
              </div>

              <div className="fact-item fact-highlight">
                <span className="fact-label">IN[B] (Entry Set):</span>
                <div className="fact-value">{renderChips(inSet)}</div>
              </div>

              <div className="fact-item fact-highlight">
                <span className="fact-label">OUT[B] (Exit Set):</span>
                <div className="fact-value">{renderChips(outSet)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
