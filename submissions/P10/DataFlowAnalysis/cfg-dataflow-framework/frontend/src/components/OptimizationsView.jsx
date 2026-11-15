import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';

export default function OptimizationsView({ optimizations = [] }) {
  const warningCount = optimizations.filter((o) => o.severity === 'warning').length;
  const oppCount = optimizations.filter((o) => o.severity === 'success' || o.severity === 'info').length;

  return (
    <div className="analysis-container">
      {/* Optimization Hero Card */}
      <div className="theory-card">
        <div className="theory-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={18} style={{ color: 'var(--accent-emerald)' }} />
            <h4>Compiler Diagnostics & Optimization Opportunities</h4>
          </div>
          <div className="equation-badges">
            <span className="eq-tag" style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              {oppCount} Optimizations
            </span>
            {warningCount > 0 && (
              <span className="eq-tag" style={{ color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                {warningCount} Warnings
              </span>
            )}
          </div>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
          Our static analysis directly surfaces compiler transformations: <strong>Reaching Definitions</strong> identifies potential reads of uninitialized memory, <strong>Live Variable Analysis</strong> detects dead assignments for dead-code elimination, and <strong>Available Expressions</strong> spots Common Subexpression Elimination (CSE) candidates.
        </p>
      </div>

      {optimizations.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={44} style={{ color: 'var(--accent-emerald)' }} />
          <h3>Clean Intermediate Code</h3>
          <p>
            No dead assignments, uninitialized variables, or redundant common subexpressions detected!
          </p>
        </div>
      ) : (
        <div className="optimizations-grid">
          {optimizations.map((opt, idx) => {
            let Icon = Info;
            if (opt.severity === 'warning') Icon = AlertTriangle;
            else if (opt.severity === 'success') Icon = Sparkles;

            return (
              <div key={idx} className={`opt-card ${opt.severity}`}>
                <div className="opt-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={14} />
                    <span className="opt-type-tag">
                      {opt.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="opt-source">{opt.source}</span>
                </div>
                <p className="opt-msg">{opt.message}</p>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Location: Block <strong>{opt.block}</strong>
                  {opt.line && <>, C Line <strong>#{opt.line}</strong></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
