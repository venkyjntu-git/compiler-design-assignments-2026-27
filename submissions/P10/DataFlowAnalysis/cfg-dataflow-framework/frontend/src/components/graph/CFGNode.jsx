import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitCommit, Play, Square, GitBranch, ArrowDown } from 'lucide-react';

// Custom Basic Block Node
export const CustomBlockNode = ({ data, selected }) => {
  const block = data?.block || {};
  const isSelected = selected || data?.isSelected;
  const isEvaluating = data?.isEvaluating;

  // Determine block classification badge
  const isDecision = (block.successors && block.successors.length > 1);
  const isMerge = (block.predecessors && block.predecessors.length > 1);

  return (
    <div className={`cfg-node-card ${isSelected ? 'selected' : ''} ${isEvaluating ? 'evaluating-pulse' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="cfg-handle handle-top"
      />

      {/* Node Header */}
      <div className="cfg-node-header">
        <div className="cfg-node-id-badge">
          <GitCommit size={13} className="node-icon" />
          <span className="node-id-text">{block.id}</span>
          {isEvaluating && <span className="evaluating-tag" title="Currently being evaluated in fixed-point iteration">Evaluating</span>}
        </div>

        <div className="cfg-node-badges">
          {isDecision && <span className="node-type-pill pill-branch">Decision</span>}
          {isMerge && <span className="node-type-pill pill-merge">Merge</span>}
          {!isDecision && !isMerge && <span className="node-type-pill pill-basic">Block</span>}
        </div>
      </div>

      {/* Node Body: Instructions */}
      <div className="cfg-node-instructions">
        {block.instructions && block.instructions.length > 0 ? (
          block.instructions.map((instr) => (
            <div
              key={instr.id}
              className={`cfg-instr-row ${instr.is_leader ? 'is-leader' : ''}`}
              title={instr.leader_reason ? `Leader: ${instr.leader_reason}` : instr.raw}
            >
              <div className="instr-id-col">
                {instr.is_leader ? (
                  <span className="leader-badge-star" title="Block Leader (3AC Rule)">★</span>
                ) : (
                  <span className="instr-num">{instr.id}</span>
                )}
              </div>
              <code className="instr-code-text">{instr.raw}</code>
            </div>
          ))
        ) : (
          <div className="cfg-empty-instructions">No instructions</div>
        )}
      </div>

      {/* Node Footer: Predecessor and Successor counts */}
      <div className="cfg-node-footer">
        <span className="footer-conn" title={`Predecessors: ${(block.predecessors || []).join(', ') || 'None'}`}>
          Pred: <strong>{block.predecessors?.length || 0}</strong>
        </span>
        <span className="footer-conn" title={`Successors: ${(block.successors || []).join(', ') || 'None'}`}>
          Succ: <strong>{block.successors?.length || 0}</strong>
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="cfg-handle handle-bottom"
      />
    </div>
  );
};

// Custom Terminal Capsule Node (ENTRY / EXIT)
export const CustomTerminalNode = ({ data, selected }) => {
  const isEntry = data?.type === 'ENTRY';
  const isSelected = selected || data?.isSelected;

  return (
    <div className={`cfg-terminal-capsule ${isEntry ? 'terminal-entry' : 'terminal-exit'} ${isSelected ? 'selected' : ''}`}>
      {!isEntry && (
        <Handle
          type="target"
          position={Position.Top}
          className="cfg-handle handle-top"
        />
      )}

      <div className="terminal-content">
        {isEntry ? (
          <Play size={12} fill="currentColor" className="terminal-icon" />
        ) : (
          <Square size={11} fill="currentColor" className="terminal-icon" />
        )}
        <span className="terminal-label">{data?.label || (isEntry ? 'ENTRY' : 'EXIT')}</span>
      </div>

      {isEntry && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="cfg-handle handle-bottom"
        />
      )}
    </div>
  );
};

export const nodeTypes = {
  blockNode: CustomBlockNode,
  terminalNode: CustomTerminalNode,
};
