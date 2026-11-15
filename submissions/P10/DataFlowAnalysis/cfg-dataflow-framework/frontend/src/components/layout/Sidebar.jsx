import React from 'react';
import {
  Workflow,
  FileCode2,
  GitBranch,
  Layers,
  Activity,
  BookOpen,
  Server,
  Info,
  Sliders
} from 'lucide-react';

export default function Sidebar({
  activeSection,
  onSelectSection,
  isServerHealthy,
  collapsed = false,
  onToggleCollapse
}) {
  const navItems = [
    {
      id: 'graph',
      label: 'Control Flow Graph',
      shortLabel: 'CFG',
      icon: GitBranch,
      desc: 'Interactive basic block graph'
    },
    {
      id: 'analysis',
      label: 'Data-Flow Analysis',
      shortLabel: 'Data-Flow',
      icon: Layers,
      desc: 'RD, Live Variables & Available Expressions'
    },
    {
      id: 'trace',
      label: 'Iteration Trace',
      shortLabel: 'Trace',
      icon: Activity,
      desc: 'Step-by-step fixed point convergence'
    },
    {
      id: 'editor',
      label: 'Source Editor',
      shortLabel: 'Editor',
      icon: FileCode2,
      desc: 'C Subset compiler source code'
    },
    {
      id: 'docs',
      label: 'Documentation & Theory',
      shortLabel: 'Docs',
      icon: BookOpen,
      desc: 'Compiler theory and equations'
    }
  ];

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Sidebar Navigation">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo-icon">
          <Workflow size={20} className="brand-icon-svg" />
        </div>
        <div className="brand-text-block">
          <span className="brand-title">CFG Studio</span>
          <span className="brand-subtitle">Compiler Analysis Workbench</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav" role="navigation">
        <div className="nav-group-label">WORKFLOW</div>
        <ul className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <li key={item.id} className="nav-item">
                <button
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectSection(item.id)}
                  title={item.desc}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="nav-icon">
                    <Icon size={17} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {isActive && <span className="nav-active-pill" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Telemetry Footer */}
      <div className="sidebar-footer">
        {/* Backend Live Indicator */}
        <div className={`server-beacon-box ${isServerHealthy ? 'online' : 'offline'}`} title={isServerHealthy ? 'FastAPI Compiler Backend Connected (127.0.0.1:8000)' : 'Backend offline or reconnecting'}>
          <div className="beacon-indicator">
            <span className="beacon-ping"></span>
            <span className="beacon-dot"></span>
          </div>
          <div className="beacon-info">
            <span className="beacon-label">Backend Status</span>
            <span className="beacon-status-text">
              {isServerHealthy ? 'Active (Port 8000)' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Version Badge & Engine Info */}
        <div className="sidebar-meta">
          <span className="version-pill">v2.0.0-core</span>
          <span className="meta-engine-tag">C-TAC IR</span>
        </div>
      </div>
    </aside>
  );
}
