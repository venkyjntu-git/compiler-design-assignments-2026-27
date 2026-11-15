import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Activity } from 'lucide-react';

export default function DataFlowPanel({ analysisData, activeType = 'rd', onHighlightBlock }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const data =
    activeType === 'rd'
      ? analysisData?.reaching_definitions
      : activeType === 'lv'
      ? analysisData?.live_variables
      : analysisData?.available_expressions;

  const steps = data?.steps || [];

  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [analysisData, activeType]);

  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 750);
    }
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  useEffect(() => {
    if (steps.length > 0 && steps[currentStepIndex]) {
      const step = steps[currentStepIndex];
      if (onHighlightBlock) {
        onHighlightBlock(step.block_id);
      }
    }
  }, [currentStepIndex, steps]);

  if (!data) {
    return (
      <div className="empty-state">
        <p>Run analysis to view data-flow results.</p>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];

  return (
    <div className="analysis-container">
      {/* Mathematical Theory & Equation Card */}
      <div className="theory-card">
        <div className="theory-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={18} style={{ color: 'var(--accent-cyan)' }} />
            <h4>{data.analysis_type} Framework</h4>
          </div>
          <div className="equation-badges">
            <span
              className={`eq-tag ${
                data.direction === 'backward' ? 'badge-backward' : ''
              }`}
            >
              {data.direction.toUpperCase()} Direction
            </span>
            <span
              className={`eq-tag ${
                data.meet_operator.includes('∩') ? 'badge-intersect' : ''
              }`}
            >
              Meet: {data.meet_operator}
            </span>
          </div>
        </div>
        <div className="equation-display">
          <div className="eq-box">
            <span className="eq-label">Confluence:</span>
            <code>{data.confluence_equation}</code>
          </div>
          <div className="eq-box">
            <span className="eq-label">Transfer:</span>
            <code>{data.transfer_equation}</code>
          </div>
        </div>
      </div>

      {/* Program Definitions Table for Reaching Defs */}
      {activeType === 'rd' && data.definitions_table && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Program Definitions Mapping (d<sub>i</sub>)
          </h4>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Def ID</th>
                  <th>Variable</th>
                  <th>Intermediate 3AC</th>
                  <th>Original C Statement</th>
                  <th>Block</th>
                </tr>
              </thead>
              <tbody>
                {data.definitions_table.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong style={{ color: 'var(--accent-cyan)' }}>{d.id}</strong>
                    </td>
                    <td>
                      <code>{d.var}</code>
                    </td>
                    <td>
                      <code>{d.code}</code>
                    </td>
                    <td>
                      {d.c_line ? `Line ${d.c_line}: ${d.c_stmt || ''}` : '—'}
                    </td>
                    <td>
                      <span className="drawer-pill">{d.block}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Available Expressions Universal Set */}
      {activeType === 'ae' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Universal Set of Binary Expressions (U)
          </h4>
          <div className="chips-container">
            {data.universal_set && data.universal_set.length > 0 ? (
              data.universal_set.map((e) => (
                <span key={e} className="expr-chip">
                  {e}
                </span>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No non-trivial binary expressions found.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Block Local Sets: GEN/KILL or USE/DEF */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          {activeType === 'lv'
            ? 'Block Local Sets: USE & DEF'
            : 'Block Local Sets: GEN & KILL'}
        </h4>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Block ID</th>
                <th>
                  {activeType === 'lv'
                    ? 'USE[B] (Used Before Defined)'
                    : 'GEN[B] (Generated Defs)'}
                </th>
                <th>
                  {activeType === 'lv'
                    ? 'DEF[B] (Defined Before Used)'
                    : 'KILL[B] (Killed Defs)'}
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(data.block_gen || {}).map((bId) => {
                const gen = data.block_gen[bId] || [];
                const kill = data.block_kill[bId] || [];
                return (
                  <tr key={bId}>
                    <td>
                      <strong style={{ color: 'var(--accent-cyan)' }}>{bId}</strong>
                    </td>
                    <td>
                      <code>{`{ ${gen.join(', ') || '∅'} }`}</code>
                    </td>
                    <td>
                      <code>{`{ ${kill.join(', ') || '∅'} }`}</code>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step-by-Step Convergence Scrubber */}
      <div className="step-controller-card">
        <div className="controller-header">
          <div>
            <h4>Iterative Convergence Walkthrough</h4>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Step through iterations until fixed point convergence is achieved
            </div>
          </div>
          <div className="step-playback-buttons">
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentStepIndex((p) => Math.max(0, p - 1))}
              disabled={currentStepIndex === 0}
            >
              <SkipBack size={12} /> Prev
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                if (currentStepIndex >= steps.length - 1) {
                  setCurrentStepIndex(0);
                }
                setIsPlaying(!isPlaying);
              }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() =>
                setCurrentStepIndex((p) => Math.min(steps.length - 1, p + 1))
              }
              disabled={currentStepIndex >= steps.length - 1}
            >
              Next <SkipForward size={12} />
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(0);
              }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>

        <div className="step-slider-row">
          <input
            type="range"
            className="step-slider"
            min={0}
            max={Math.max(0, steps.length - 1)}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(parseInt(e.target.value, 10));
            }}
          />
          <span className="step-counter">
            Step {steps.length > 0 ? currentStepIndex + 1 : 0} / {steps.length}
          </span>
        </div>

        {currentStep && (
          <div className="step-details-box">
            <span className="step-highlight-tag">
              Iter {currentStep.iteration} ({currentStep.block_id})
            </span>
            <span style={{ lineHeight: 1.45 }}>{currentStep.explanation}</span>
          </div>
        )}
      </div>

      {/* Full Fixed-Point Iteration Matrix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Fixed-Point Iteration Matrix
        </h4>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Iteration</th>
                <th>Block</th>
                <th>{activeType === 'lv' ? 'OUT[B]' : 'IN[B]'}</th>
                <th>{activeType === 'lv' ? 'IN[B]' : 'OUT[B]'}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, idx) => (
                <tr
                  key={idx}
                  style={{
                    background:
                      idx === currentStepIndex ? 'rgba(0, 242, 254, 0.08)' : undefined,
                  }}
                >
                  <td>Iter {s.iteration}</td>
                  <td>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{s.block_id}</strong>
                  </td>
                  <td>
                    <code>
                      {`{ ${
                        (activeType === 'lv' ? s.out_set : s.in_set).join(', ') || '∅'
                      } }`}
                    </code>
                  </td>
                  <td>
                    <code>
                      {`{ ${
                        (activeType === 'lv' ? s.in_set : s.out_set).join(', ') || '∅'
                      } }`}
                    </code>
                  </td>
                  <td>
                    <span
                      className={
                        s.has_changed
                          ? 'status-badge-changed'
                          : 'status-badge-unchanged'
                      }
                    >
                      {s.has_changed ? '▲ Changed' : '— Unchanged'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
