import React from 'react';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useCompiler } from '../hooks/useCompilerContext';

interface NavbarProps {
  currentPage: string;
  onOpenGuide: () => void;
  onOpenStory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onOpenGuide,
  onOpenStory,
}) => {
  const { result, isCompiling, runCompilation, resetCompilation } = useCompiler();

  return (
    <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-primary-500/20 text-white font-mono font-bold text-lg">
            CV
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-white">
                Compiler<span className="text-primary-400">Verse</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-950/80 border border-primary-800/60 text-primary-300 font-mono">
                v1.0 • Problem 22
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Understand Every Step. Visualize Every Transformation.
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500 pl-4 border-l border-border">
          <span>Track F</span>
          <span>/</span>
          <span className="text-slate-300 font-medium capitalize">{currentPage}</span>
        </div>
      </div>

      {/* Compiler Status & Actions */}
      <div className="flex items-center space-x-3">
        {/* Compilation Status Pill */}
        <div className="hidden sm:flex items-center">
          {isCompiling ? (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-mono">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Compiling Pipeline...</span>
            </div>
          ) : result?.success ? (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pipeline Verified (7/7 Phases)</span>
            </div>
          ) : result && !result.success ? (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Phase Error: {result.failedPhase}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-border text-slate-400 text-xs font-mono">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Awaiting Input</span>
            </div>
          )}
        </div>

        {/* Story Mode Button */}
        <button
          onClick={onOpenStory}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-slate-800 border border-border text-xs text-slate-300 transition-colors"
          title="Open Compiler Story Mode"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary-400" />
          <span className="hidden md:inline">Story Mode</span>
        </button>

        {/* Execution Guide Button */}
        <button
          onClick={onOpenGuide}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-slate-800 border border-border text-xs text-slate-300 transition-colors"
          title="How to Run Your First Compilation"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Guide</span>
        </button>

        {/* Quick Run & Reset for convenience anywhere */}
        <button
          onClick={() => runCompilation()}
          disabled={isCompiling}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs shadow-md shadow-primary-600/20 transition-all disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run</span>
        </button>

        <button
          onClick={resetCompilation}
          className="p-1.5 rounded-lg bg-surface-elevated hover:bg-slate-800 border border-border text-slate-400 hover:text-white transition-colors"
          title="Reset Pipeline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
