import React from 'react';
import { GitBranch, Layers, Play } from 'lucide-react';

export default function EmptyState({
  title = "No Analysis Results",
  description = "Write C source code and click 'Analyze Program' to generate CFG and data-flow equations.",
  icon: Icon = GitBranch,
  actionLabel = "Run Analysis",
  onAction,
}) {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon-wrap">
        <Icon size={32} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {onAction && (
        <button className="btn btn-primary empty-state-btn" onClick={onAction}>
          <Play size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
}
