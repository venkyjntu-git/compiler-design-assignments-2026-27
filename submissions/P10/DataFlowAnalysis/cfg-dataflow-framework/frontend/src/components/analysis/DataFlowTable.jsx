import React from 'react';
import { GitCommit, Layers, Hash } from 'lucide-react';
import EmptyState from '../common/EmptyState';

export default function DataFlowTable({
  analysisData,
  activeType = 'rd',
  selectedBlockId,
  onSelectBlock
}) {
  const data =
    activeType === 'rd'
      ? analysisData?.reaching_definitions
      : activeType === 'lv'
      ? analysisData?.live_variables
      : analysisData?.available_expressions;

  if (!data) {
    return (
      <EmptyState
        title="No Data-Flow Facts Available"
        description="Run analysis to compute GEN, KILL, IN, and OUT sets."
        icon={Layers}
      />
    );
  }

  const blockGen = data.block_gen || {};
  const blockKill = data.block_kill || {};
  const finalIn = data.final_in || {};
  const finalOut = data.final_out || {};

  // Extract all block keys deterministically (sort them: B1, B2, ...)
  const blockKeys = Object.keys(blockGen).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  const renderSetChips = (items) => {
    if (!items || items.length === 0) {
      return <span className="empty-set-notation">&#123;&#125;</span>;
    }
    const sorted = [...items].sort();
    return (
      <div className="set-chips-flow">
        {sorted.map((item) => (
          <span key={item} className="set-chip">
            {item}
          </span>
        ))}
      </div>
    );
  };

  const isLiveVars = activeType === 'lv';
  const genColHeader = isLiveVars ? 'USE[B]' : 'GEN[B]';
  const killColHeader = isLiveVars ? 'DEF[B]' : 'KILL[B]';

  return (
    <div className="dataflow-table-section">
      {/* Definitions mapping table for Reaching Definitions */}
      {activeType === 'rd' && data.definitions_table && data.definitions_table.length > 0 && (
        <div className="aux-table-card">
          <div className="aux-table-header">
            <Hash size={13} className="aux-icon" />
            <span className="aux-title">Program Definitions Mapping (d<sub>i</sub>)</span>
          </div>
          <div className="table-responsive">
            <table className="analysis-table def-mapping-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Def ID</th>
                  <th style={{ width: '120px' }}>Variable</th>
                  <th>Intermediate 3AC</th>
                  <th>C Source Statement</th>
                  <th style={{ width: '80px' }}>Block</th>
                </tr>
              </thead>
              <tbody>
                {data.definitions_table.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="def-id-badge">{d.id}</span>
                    </td>
                    <td>
                      <code className="var-token">{d.var}</code>
                    </td>
                    <td>
                      <code className="tac-token">{d.code}</code>
                    </td>
                    <td>
                      <span className="c-source-cell">
                        {d.c_line ? `Line ${d.c_line}: ${d.c_stmt || ''}` : '—'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="block-jump-link"
                        onClick={() => onSelectBlock && onSelectBlock(d.block)}
                        title={`Select block ${d.block}`}
                      >
                        {d.block}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Universal expression set for Available Expressions */}
      {activeType === 'ae' && data.universal_set && (
        <div className="aux-universal-card">
          <span className="aux-universal-label">Universal Binary Expressions Set (U):</span>
          <div className="universal-chips-list">
            {data.universal_set.length > 0 ? (
              data.universal_set.map((expr) => (
                <span key={expr} className="expr-chip">
                  {expr}
                </span>
              ))
            ) : (
              <span className="text-muted-empty">No non-trivial binary expressions found.</span>
            )}
          </div>
        </div>
      )}

      {/* Main Canonical IN/OUT Table */}
      <div className="main-inout-card">
        <div className="inout-header-row">
          <h4 className="inout-title">
            Fixed-Point IN / OUT Solutions
          </h4>
          <span className="inout-hint">
            Click any row to inspect and highlight in the CFG canvas
          </span>
        </div>

        <div className="table-responsive inout-table-wrapper">
          <table className="analysis-table canonical-inout-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Block</th>
                <th>{genColHeader}</th>
                <th>{killColHeader}</th>
                <th>IN[B]</th>
                <th>OUT[B]</th>
              </tr>
            </thead>
            <tbody>
              {blockKeys.map((bId) => {
                const isSelected = selectedBlockId === bId;
                const gen = blockGen[bId] || [];
                const kill = blockKill[bId] || [];
                const inSet = finalIn[bId] || [];
                const outSet = finalOut[bId] || [];

                return (
                  <tr
                    key={bId}
                    className={`inout-row ${isSelected ? 'row-selected' : ''}`}
                    onClick={() => onSelectBlock && onSelectBlock(bId)}
                  >
                    <td className="block-cell">
                      <div className="block-cell-inner">
                        <GitCommit size={12} className="block-cell-icon" />
                        <strong>{bId}</strong>
                      </div>
                    </td>
                    <td>{renderSetChips(gen)}</td>
                    <td>{renderSetChips(kill)}</td>
                    <td>{renderSetChips(inSet)}</td>
                    <td>{renderSetChips(outSet)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
