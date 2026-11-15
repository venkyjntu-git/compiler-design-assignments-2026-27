import React from 'react';
import { ArrowRight, TrendingDown, TrendingUp, Activity, CheckCircle2 } from 'lucide-react';

export default function AnalysisTabs({
  activeType,
  onChangeType,
  analysisData
}) {
  const tabs = [
    {
      id: 'rd',
      label: 'Reaching Definitions',
      direction: 'Forward',
      meet: '∪ Union',
      icon: ArrowRight,
      colorClass: 'tab-rd'
    },
    {
      id: 'lv',
      label: 'Live Variables',
      direction: 'Backward',
      meet: '∪ Union',
      icon: TrendingDown,
      colorClass: 'tab-lv'
    },
    {
      id: 'ae',
      label: 'Available Expressions',
      direction: 'Forward',
      meet: '∩ Intersection',
      icon: TrendingUp,
      colorClass: 'tab-ae'
    }
  ];

  const currentData =
    activeType === 'rd'
      ? analysisData?.reaching_definitions
      : activeType === 'lv'
      ? analysisData?.live_variables
      : analysisData?.available_expressions;

  return (
    <div className="analysis-tabs-container">
      {/* Segmented Control */}
      <div className="segmented-tab-bar" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeType === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`segmented-tab-btn ${isActive ? 'active' : ''} ${tab.colorClass}`}
              onClick={() => onChangeType(tab.id)}
            >
              <Icon size={14} className="tab-btn-icon" />
              <span className="tab-title">{tab.label}</span>
              <span className="tab-direction-pill">{tab.direction}</span>
            </button>
          );
        })}
      </div>

      {/* Model Mathematical Specification Banner */}
      {currentData && (
        <div className="model-spec-banner">
          <div className="spec-meta-row">
            <div className="spec-title-group">
              <Activity size={16} className="spec-icon" />
              <h3 className="spec-heading">{currentData.analysis_type}</h3>
            </div>
            <div className="spec-tags">
              <span className={`spec-tag tag-dir ${currentData.direction === 'backward' ? 'tag-backward' : 'tag-forward'}`}>
                {currentData.direction.toUpperCase()} Direction
              </span>
              <span className="spec-tag tag-meet">
                Meet: {currentData.meet_operator}
              </span>
              <span className="spec-tag tag-status">
                <CheckCircle2 size={12} className="text-secondary" />
                Converged in {currentData.total_iterations} iters
              </span>
            </div>
          </div>

          <div className="spec-equations-grid">
            <div className="equation-card">
              <span className="equation-label">Confluence / Boundary Rule</span>
              <code className="equation-formula">{currentData.confluence_equation}</code>
            </div>
            <div className="equation-card">
              <span className="equation-label">Block Transfer Function</span>
              <code className="equation-formula">{currentData.transfer_equation}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
