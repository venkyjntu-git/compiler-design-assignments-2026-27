import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Activity,
  CheckCircle2,
  GitCommit
} from 'lucide-react';
import EmptyState from '../common/EmptyState';

export default function IterationTrace({
  analysisData,
  activeType = 'rd',
  onHighlightBlock
}) {
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

  // Auto-play interval
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
      }, 850);
    }
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // Sync highlighted block with active step
  useEffect(() => {
    if (steps.length > 0 && steps[currentStepIndex]) {
      const step = steps[currentStepIndex];
      if (onHighlightBlock && step.block_id) {
        onHighlightBlock(step.block_id);
      }
    }
  }, [currentStepIndex, steps, onHighlightBlock]);

  if (!data || steps.length === 0) {
    return (
      <EmptyState
        title="No Iteration Trace Available"
        description="Compile and run data-flow analysis to record step-by-step fixed-point transitions."
        icon={Activity}
      />
    );
  }

  const currentStep = steps[currentStepIndex];
  const isFinalStep = currentStepIndex === steps.length - 1;

  const renderChipList = (arr) => {
    if (!arr || arr.length === 0) {
      return <span className="empty-set-notation">&#123;&#125;</span>;
    }
    return (
      <div className="set-chips-flow">
        {arr.map((item) => (
          <span key={item} className="set-chip">
            {item}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="iteration-trace-section">
      {/* Playback Controls & Progress Scrubber */}
      <div className="trace-scrubber-card">
        <div className="scrubber-header">
          <div className="scrubber-title-col">
            <div className="scrubber-title-group">
              <Activity size={16} className="text-accent" />
              <h4 className="scrubber-title">Iterative Convergence Timeline</h4>
            </div>
            <span className="scrubber-subtitle">
              Walk through each block transfer evaluation until fixed-point stabilization
            </span>
          </div>

          <div className="scrubber-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentStepIndex((p) => Math.max(0, p - 1))}
              disabled={currentStepIndex === 0}
              title="Previous Step"
            >
              <SkipBack size={13} />
              <span>Prev</span>
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (currentStepIndex >= steps.length - 1) {
                  setCurrentStepIndex(0);
                }
                setIsPlaying(!isPlaying);
              }}
              title={isPlaying ? 'Pause auto-play' : 'Play auto-advance'}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() =>
                setCurrentStepIndex((p) => Math.min(steps.length - 1, p + 1))
              }
              disabled={currentStepIndex >= steps.length - 1}
              title="Next Step"
            >
              <span>Next</span>
              <SkipForward size={13} />
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(0);
              }}
              title="Reset to Step 1"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="scrubber-timeline-row">
          <input
            type="range"
            className="timeline-slider"
            min={0}
            max={Math.max(0, steps.length - 1)}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(parseInt(e.target.value, 10));
            }}
          />
          <div className="timeline-counter">
            Step <strong>{currentStepIndex + 1}</strong> of {steps.length}
          </div>
        </div>

        {/* Selected Step Explanation Callout */}
        {currentStep && (
          <div className="step-callout-card">
            <div className="callout-header">
              <div className="callout-badges">
                <span className="step-iter-badge">
                  Iteration {currentStep.iteration}
                </span>
                <span className="step-block-badge">
                  Block {currentStep.block_id}
                </span>
                <span className={`step-delta-badge ${currentStep.has_changed ? 'delta-changed' : 'delta-fixed'}`}>
                  {currentStep.has_changed ? '▲ State Changed' : '✓ Unchanged'}
                </span>
                {isFinalStep && (
                  <span className="step-converged-badge">
                    <CheckCircle2 size={12} /> Fixed Point Reached
                  </span>
                )}
              </div>
            </div>
            <p className="callout-explanation-text">
              {currentStep.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Full Fixed-Point Step Iteration Matrix */}
      <div className="iteration-matrix-card">
        <div className="matrix-header">
          <h4 className="matrix-title">Fixed-Point Transition Matrix</h4>
          <span className="matrix-hint">
            Each row records one transfer-function application on the block
          </span>
        </div>

        <div className="table-responsive matrix-table-wrapper">
          <table className="analysis-table matrix-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Iter</th>
                <th style={{ width: '80px' }}>Block</th>
                <th>{activeType === 'lv' ? 'OUT[B] (Meet)' : 'IN[B] (Meet)'}</th>
                <th>{activeType === 'lv' ? 'IN[B] (Transfer)' : 'OUT[B] (Transfer)'}</th>
                <th style={{ width: '130px' }}>Transition</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, idx) => {
                const isSelected = idx === currentStepIndex;
                const inSet = s.in_set || [];
                const outSet = s.out_set || [];

                return (
                  <tr
                    key={idx}
                    className={`matrix-row ${isSelected ? 'row-active-step' : ''}`}
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIndex(idx);
                    }}
                  >
                    <td>
                      <span className="matrix-iter-num">Iter {s.iteration}</span>
                    </td>
                    <td>
                      <div className="block-cell-inner">
                        <GitCommit size={11} className="text-accent" />
                        <strong>{s.block_id}</strong>
                      </div>
                    </td>
                    <td>{renderChipList(activeType === 'lv' ? outSet : inSet)}</td>
                    <td>{renderChipList(activeType === 'lv' ? inSet : outSet)}</td>
                    <td>
                      <span className={`matrix-status-pill ${s.has_changed ? 'pill-changed' : 'pill-unchanged'}`}>
                        {s.has_changed ? '▲ Changed' : '— Unchanged'}
                      </span>
                    </td>
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
