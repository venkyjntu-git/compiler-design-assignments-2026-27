import React from 'react';
import { Layers, ArrowRight, GitCommit, GitBranch, Terminal } from 'lucide-react';

export default function BlockExplorer({ cfgData, onSelectBlock }) {
  if (!cfgData || !cfgData.blocks || cfgData.blocks.length === 0) {
    return (
      <div className="empty-state">
        <Layers size={40} />
        <h3>No Basic Blocks Generated</h3>
        <p>Run analysis on a C program to inspect the partitioned basic blocks and leaders.</p>
      </div>
    );
  }

  const userBlocks = cfgData.blocks.filter((b) => !b.is_entry && !b.is_exit);
  const totalInstructions = cfgData.total_instructions || 0;
  const loopCount = cfgData.edges?.filter((e) => e.type === 'back_edge').length || 0;
  const leadersCount = userBlocks.length;

  return (
    <div className="analysis-container">
      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        <div className="theory-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Basic Blocks
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: 2 }}>
            {userBlocks.length}
          </div>
        </div>
        <div className="theory-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Instructions
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            {totalInstructions}
          </div>
        </div>
        <div className="theory-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Leaders Detected
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fde047', marginTop: 2 }}>
            {leadersCount}
          </div>
        </div>
        <div className="theory-card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Loop Back-Edges
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: 2 }}>
            {loopCount}
          </div>
        </div>
      </div>

      {/* Leader Rules Card */}
      <div className="theory-card">
        <div className="theory-header">
          <h4>Basic Block Partitioning: The 3 Leader Rules</h4>
          <span className="eq-tag">Dragon Book Chapter 8</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
          A <strong>Basic Block</strong> is a sequence of consecutive Three-Address Code instructions where control enters only at the beginning and leaves only at the end. Leaders mark the start of each block:
          <br />• <strong>Rule 1:</strong> The first intermediate instruction of the program.
          <br />• <strong>Rule 2:</strong> Any instruction that is the target of a conditional or unconditional jump.
          <br />• <strong>Rule 3:</strong> Any instruction immediately following a conditional or unconditional jump.
        </p>
      </div>

      {/* Blocks Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Block ID</th>
              <th>Predecessors</th>
              <th>Successors</th>
              <th>Leader Instruction & Identification Reason</th>
              <th>Statements</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {userBlocks.map((block) => {
              const leader = block.instructions?.[0];
              return (
                <tr key={block.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <GitCommit size={14} style={{ color: 'var(--accent-cyan)' }} />
                      <strong style={{ color: 'var(--accent-cyan)' }}>{block.id}</strong>
                    </div>
                  </td>
                  <td>
                    {block.predecessors?.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {block.predecessors.map((p) => (
                          <span key={p} className="drawer-pill">
                            {p}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {block.successors?.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {block.successors.map((s) => (
                          <span key={s} className="drawer-pill">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {leader ? (
                      <div>
                        <code style={{ color: '#fde047', fontWeight: 600 }}>
                          ★ {leader.raw}
                        </code>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {leader.leader_reason}
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className="stat-badge">{block.instructions?.length || 0} instrs</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => onSelectBlock(block)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
