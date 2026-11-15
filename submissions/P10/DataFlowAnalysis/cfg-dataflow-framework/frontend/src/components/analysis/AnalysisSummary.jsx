import React from 'react';
import { Layers, GitBranch, Hash, CheckCircle2, RotateCw } from 'lucide-react';

export default function AnalysisSummary({
  cfgData,
  analysisData,
  activeType = 'rd'
}) {
  if (!analysisData) return null;

  const userBlocks = cfgData?.blocks?.filter((b) => !b.is_entry && !b.is_exit) || [];
  const edgeCount = cfgData?.edges?.length || 0;

  const currentAnalysis =
    activeType === 'rd'
      ? analysisData.reaching_definitions
      : activeType === 'lv'
      ? analysisData.live_variables
      : analysisData.available_expressions;

  const totalIterations = currentAnalysis?.total_iterations ?? 0;
  const hasConverged = totalIterations > 0;

  // Tracked items count
  let trackedCount = 0;
  let trackedLabel = 'Definitions';

  if (activeType === 'rd') {
    trackedCount = currentAnalysis?.definitions_table?.length || 0;
    trackedLabel = 'Definitions';
  } else if (activeType === 'lv') {
    trackedCount = currentAnalysis?.variables?.length || 0;
    trackedLabel = 'Variables';
  } else if (activeType === 'ae') {
    trackedCount = currentAnalysis?.universal_set?.length || 0;
    trackedLabel = 'Expressions';
  }

  return (
    <div className="analysis-summary-strip" role="region" aria-label="Analysis Summary">
      <div className="summary-card">
        <div className="summary-icon-wrapper">
          <Layers size={14} className="text-accent" />
        </div>
        <div className="summary-details">
          <span className="summary-label">Basic Blocks</span>
          <span className="summary-val">{userBlocks.length}</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon-wrapper">
          <GitBranch size={14} className="text-secondary" />
        </div>
        <div className="summary-details">
          <span className="summary-label">CFG Edges</span>
          <span className="summary-val">{edgeCount}</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon-wrapper">
          <Hash size={14} className="text-muted" />
        </div>
        <div className="summary-details">
          <span className="summary-label">Tracked {trackedLabel}</span>
          <span className="summary-val">{trackedCount}</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon-wrapper">
          <RotateCw size={14} className="text-violet" />
        </div>
        <div className="summary-details">
          <span className="summary-label">Iterations to Fixpoint</span>
          <span className="summary-val">{totalIterations}</span>
        </div>
      </div>

      <div className="summary-card summary-convergence">
        <div className="summary-icon-wrapper">
          <CheckCircle2 size={14} className="text-secondary" />
        </div>
        <div className="summary-details">
          <span className="summary-label">Convergence Status</span>
          <span className="summary-val text-secondary">
            {hasConverged ? 'Fixed Point Reached' : 'Pending'}
          </span>
        </div>
      </div>
    </div>
  );
}
