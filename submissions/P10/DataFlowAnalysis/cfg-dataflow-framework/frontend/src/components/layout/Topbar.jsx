import React from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  Server
} from 'lucide-react';

export default function Topbar({
  isServerHealthy,
  isAnalyzing,
  onAnalyze,
  onReset,
  blockCount = 0,
  edgeCount = 0
}) {
  return (
    <header className="app-topbar" role="banner">
      {/* Left: Breadcrumbs & Page Title */}
      <div className="topbar-left">
        <div className="topbar-breadcrumbs">
          <span className="crumb-segment">Compiler Tools</span>
          <ChevronRight size={13} className="crumb-separator" />
          <span className="crumb-active">CFG Studio</span>
        </div>
        <div className="topbar-title-row">
          <h1 className="page-title">Program Analysis</h1>
          <span className="page-desc">
            Explore control flow and data-flow facts across your program.
          </span>
        </div>
      </div>

      {/* Center: Live Telemetry telemetry pills */}
      <div className="topbar-center">
        {blockCount > 0 && (
          <div className="topbar-telemetry-pill">
            <span className="telemetry-item">
              <strong className="telemetry-value">{blockCount}</strong> Blocks
            </span>
            <span className="telemetry-divider">•</span>
            <span className="telemetry-item">
              <strong className="telemetry-value">{edgeCount}</strong> Edges
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="topbar-actions">
        <button
          className="btn btn-secondary topbar-reset-btn"
          onClick={onReset}
          title="Reset editor to benchmark code template"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>

        <button
          className="btn btn-primary topbar-analyze-btn"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          title="Analyze C program (Ctrl+Enter)"
        >
          {isAnalyzing ? (
            <>
              <span className="spinner-border" />
              <span>Analyzing…</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>Analyze Program</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
