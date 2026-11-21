import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Code2,
  Binary,
  Cpu,
  Video,
  Award,
  BarChart3,
  Layers,
  CheckCircle2,
  Activity,
  Flame,
  Terminal,
} from 'lucide-react';
import { PageId } from '../components/Sidebar';
import { PhaseFlow, PHASES } from '../components/PhaseFlow';
import { useCompiler } from '../hooks/useCompilerContext';
import { globalProgressTracker, UserProgressData } from '../progress/progressTracker';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
  onOpenGuide: () => void;
  onOpenStory: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenGuide,
  onOpenStory,
}) => {
  const { result } = useCompiler();
  const [progressData, setProgressData] = useState<UserProgressData>(() =>
    globalProgressTracker.getData()
  );

  useEffect(() => {
    setProgressData(globalProgressTracker.getData());
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-surface via-surface-elevated to-primary-950/40 border border-border p-8 overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary-950/80 border border-primary-800/80 text-primary-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            <span>Problem 22 Active • Visual &amp; Educational Tooling</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Compiler<span className="text-primary-400">Verse</span>
          </h1>

          <p className="text-base text-slate-300 leading-relaxed">
            Understand Every Step. Visualize Every Transformation. Learn modern compiler design
            through interactive execution, real 7-phase pipelines, predictive LL(1) and canonical
            LR(1) parsers, adaptive quizzes, and animated lessons.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('playground')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm shadow-lg shadow-primary-600/30 transition-all hover:scale-105"
            >
              <Code2 className="w-4 h-4" />
              <span>Launch Playground</span>
            </button>

            <button
              onClick={() => onNavigate('ll1')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-surface-elevated hover:bg-slate-800 border border-border text-slate-200 font-medium text-sm transition-all"
            >
              <Binary className="w-4 h-4 text-cyan-400" />
              <span>LL(1) Visualizer</span>
            </button>

            <button
              onClick={() => onNavigate('lr1')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-surface-elevated hover:bg-slate-800 border border-border text-slate-200 font-medium text-sm transition-all"
            >
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>LR(1) Visualizer</span>
            </button>

            <button
              onClick={onOpenGuide}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-slate-400 hover:text-white text-sm transition-all"
            >
              <span>First Time? Read Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive 7 Compiler Phases Visual Flow */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">The Seven Compiler Phases</h2>
            <p className="text-xs text-slate-400">
              Interactive end-to-end data pipeline. Click any phase to inspect its transformation.
            </p>
          </div>
          <button
            onClick={() => onNavigate('explorer')}
            className="text-xs font-semibold text-primary-400 hover:text-primary-300 flex items-center space-x-1"
          >
            <span>Open Phase Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <PhaseFlow onSelectPhase={() => onNavigate('explorer')} />
      </div>

      {/* Key Stats Bar from Real User Data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-4 flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-primary-950/60 border border-primary-800 text-primary-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-mono">Compilations Run</div>
            <div className="text-xl font-bold text-white font-mono">
              {progressData.compilationsRun}
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-mono">Quiz Attempts</div>
            <div className="text-xl font-bold text-white font-mono">
              {progressData.totalAttempts}
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-mono">Accuracy Rate</div>
            <div className="text-xl font-bold text-white font-mono">
              {progressData.overallAccuracy}%
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 flex items-center space-x-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-mono">Difficulty Tier</div>
            <div className="text-xl font-bold text-amber-300 font-mono">
              {progressData.highestDifficulty}
            </div>
          </div>
        </div>
      </div>

      {/* Main Educational Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Learning Modules</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Playground */}
          <div
            onClick={() => onNavigate('playground')}
            className="group cursor-pointer bg-surface rounded-2xl border border-border p-5 hover:border-primary-500/50 hover:bg-surface-elevated transition-all flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1 group-hover:text-primary-300 transition-colors">
                Compiler Playground
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Code editor with line numbers, syntax highlighting, sample loader, and cross-phase synchronized inspector.
              </p>
            </div>
            <div className="pt-4 flex items-center space-x-1 text-xs font-semibold text-primary-400 group-hover:translate-x-1 transition-transform">
              <span>Open Code Editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: LL(1) Visualizer */}
          <div
            onClick={() => onNavigate('ll1')}
            className="group cursor-pointer bg-surface rounded-2xl border border-border p-5 hover:border-cyan-500/50 hover:bg-surface-elevated transition-all flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Binary className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1 group-hover:text-cyan-300 transition-colors">
                LL(1) Predictive Parser
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Algorithmic FIRST/FOLLOW sets, predictive M-table verification, and interactive stack simulation playback.
              </p>
            </div>
            <div className="pt-4 flex items-center space-x-1 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Inspect LL(1) Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: LR(1) Visualizer */}
          <div
            onClick={() => onNavigate('lr1')}
            className="group cursor-pointer bg-surface rounded-2xl border border-border p-5 hover:border-purple-500/50 hover:bg-surface-elevated transition-all flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1 group-hover:text-purple-300 transition-colors">
                Canonical LR(1) Parser
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                LR(1) item sets, CLOSURE &amp; GOTO operations, ACTION/GOTO tables, and step-by-step Shift-Reduce trace.
              </p>
            </div>
            <div className="pt-4 flex items-center space-x-1 text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Inspect LR(1) Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 4: Animated Lessons */}
          <div
            onClick={() => onNavigate('lessons')}
            className="group cursor-pointer bg-surface rounded-2xl border border-border p-5 hover:border-emerald-500/50 hover:bg-surface-elevated transition-all flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1 group-hover:text-emerald-300 transition-colors">
                Animated Lessons (Manim)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Python Manim Community scripts, video rendering instructions, and interactive animated web simulations.
              </p>
            </div>
            <div className="pt-4 flex items-center space-x-1 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Watch Animations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 5: Adaptive Quiz */}
          <div
            onClick={() => onNavigate('quiz')}
            className="group cursor-pointer bg-surface rounded-2xl border border-border p-5 hover:border-amber-500/50 hover:bg-surface-elevated transition-all flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1 group-hover:text-amber-300 transition-colors">
                Adaptive Quiz Engine
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Topic-wise quizzes with automatic difficulty adjustment based on consecutive streaks and mistakes.
              </p>
            </div>
            <div className="pt-4 flex items-center space-x-1 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Take Quiz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 6: Learning Progress */}
          <div
            onClick={() => onNavigate('progress')}
            className="group cursor-pointer bg-surface rounded-2xl border border-border p-5 hover:border-indigo-500/50 hover:bg-surface-elevated transition-all flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1 group-hover:text-indigo-300 transition-colors">
                Progress &amp; Analytics
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Persistent local performance tracking, topic mastery charts, accuracy metrics, and recent activity log.
              </p>
            </div>
            <div className="pt-4 flex items-center space-x-1 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>View Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
