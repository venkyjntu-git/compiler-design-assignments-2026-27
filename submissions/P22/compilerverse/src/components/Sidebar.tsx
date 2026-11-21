import React from 'react';
import {
  LayoutDashboard,
  Code2,
  GitFork,
  Binary,
  Cpu,
  Video,
  Award,
  BarChart3,
  Info,
  ChevronRight,
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'playground'
  | 'explorer'
  | 'll1'
  | 'lr1'
  | 'lessons'
  | 'quiz'
  | 'progress'
  | 'about';

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
  badge?: string;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'System overview & quick actions',
  },
  {
    id: 'playground',
    label: 'Compiler Playground',
    icon: Code2,
    badge: 'Core',
    description: 'Write, compile & inspect code',
  },
  {
    id: 'explorer',
    label: 'Pipeline Explorer',
    icon: GitFork,
    description: 'Deep-dive into the 7 phases',
  },
  {
    id: 'll1',
    label: 'LL(1) Visualizer',
    icon: Binary,
    badge: 'Top-Down',
    description: 'Predictive parsing & FIRST/FOLLOW',
  },
  {
    id: 'lr1',
    label: 'LR(1) Visualizer',
    icon: Cpu,
    badge: 'Bottom-Up',
    description: 'Canonical items & Shift-Reduce',
  },
  {
    id: 'lessons',
    label: 'Animated Lessons',
    icon: Video,
    badge: 'Manim',
    description: 'Video lectures & animations',
  },
  {
    id: 'quiz',
    label: 'Adaptive Quiz',
    icon: Award,
    description: 'Dynamic difficulty challenges',
  },
  {
    id: 'progress',
    label: 'Learning Progress',
    icon: BarChart3,
    description: 'Analytics, accuracy & history',
  },
  {
    id: 'about',
    label: 'About Project',
    icon: Info,
    description: 'Documentation & Problem 22',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onSelectPage }) => {
  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col h-[calc(100vh-4rem)] sticky top-16 select-none shrink-0 overflow-y-auto">
      {/* Navigation Links */}
      <div className="p-3 space-y-1 flex-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase font-mono">
          Main Modules
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? 'bg-primary-600/15 border border-primary-500/30 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/70 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-elevated text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-medium leading-none mb-1">{item.label}</div>
                  <div className="text-[10px] text-slate-500 truncate leading-none">
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge ? (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                      : 'bg-slate-800 text-slate-400 border border-border'
                  }`}
                >
                  {item.badge}
                </span>
              ) : isActive ? (
                <ChevronRight className="w-3.5 h-3.5 text-primary-400 shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer Info */}
      <div className="p-4 border-t border-border bg-surface-elevated/30">
        <div className="rounded-xl p-3 bg-surface border border-border/80">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Problem 22 Active</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            3rd-Year B.Tech Compiler Design Visual &amp; Educational Tooling
          </p>
        </div>
      </div>
    </aside>
  );
};
