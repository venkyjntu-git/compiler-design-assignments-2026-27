import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Award,
  Flame,
  RotateCcw,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import { globalProgressTracker, UserProgressData, TopicProgress } from '../progress/progressTracker';

export const ProgressPage: React.FC = () => {
  const [data, setData] = useState<UserProgressData>(() => globalProgressTracker.getData());
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>(() =>
    globalProgressTracker.getTopicBreakdown()
  );

  const refreshData = () => {
    setData(globalProgressTracker.getData());
    setTopicProgress(globalProgressTracker.getTopicBreakdown());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all quiz progress and learning history?')) {
      globalProgressTracker.resetProgress();
      refreshData();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Persistent Learning Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Learning Progress Dashboard</h1>
          <p className="text-xs text-slate-300 leading-relaxed mt-1">
            Tracks genuine user interaction, quiz attempts, and topic mastery stored locally in your browser.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-rose-950/40 hover:border-rose-800 text-slate-400 hover:text-rose-300 border border-border text-xs transition-colors self-start md:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset History</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-mono uppercase text-slate-500">Total Quiz Attempts</span>
          <div className="text-2xl font-extrabold text-white font-mono">{data.totalAttempts}</div>
          <div className="text-[10px] text-slate-400">
            {data.correctCount} correct • {data.incorrectCount} incorrect
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-mono uppercase text-slate-500">Overall Accuracy</span>
          <div className="text-2xl font-extrabold text-cyan-400 font-mono">{data.overallAccuracy}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all"
              style={{ width: `${data.overallAccuracy}%` }}
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-mono uppercase text-slate-500">Compilations Run</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {data.compilationsRun}
          </div>
          <div className="text-[10px] text-slate-400">Pipeline executions recorded</div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-mono uppercase text-slate-500">Peak Difficulty</span>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">
            {data.highestDifficulty}
          </div>
          <div className="text-[10px] text-slate-400">Adaptive tier reached</div>
        </div>
      </div>

      {/* Topic Mastery Progress Bars */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <h2 className="text-base font-bold text-white">Topic-Wise Performance Breakdown</h2>
            <p className="text-xs text-slate-400">Accuracy and attempt statistics across all 11 topics.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topicProgress.map((tp) => (
            <div
              key={tp.topic}
              className="p-3 bg-surface-elevated/40 border border-border/80 rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-200">{tp.topic}</span>
                <span className="font-mono text-slate-400">
                  {tp.correct} / {tp.attempts} ({tp.accuracy}%)
                </span>
              </div>

              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    tp.accuracy >= 75
                      ? 'bg-emerald-500'
                      : tp.accuracy >= 40
                      ? 'bg-amber-500'
                      : tp.attempts > 0
                      ? 'bg-rose-500'
                      : 'bg-slate-700'
                  }`}
                  style={{ width: `${tp.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Learning History Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xl">
        <div className="p-4 border-b border-border bg-surface-elevated/40 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Recent Quiz Attempts History ({data.history.length})</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Live LocalStorage Journal</span>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {data.history.length > 0 ? (
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-surface-elevated sticky top-0 text-[11px] uppercase tracking-wider text-slate-400 border-b border-border">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Time</th>
                  <th className="py-2.5 px-4 font-semibold">Topic</th>
                  <th className="py-2.5 px-4 font-semibold">Difficulty</th>
                  <th className="py-2.5 px-4 font-semibold">Your Answer</th>
                  <th className="py-2.5 px-4 font-semibold">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.history.map((att, idx) => (
                  <tr key={idx} className="hover:bg-surface-elevated/30 text-slate-300">
                    <td className="py-2 px-4 text-slate-500">
                      {new Date(att.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-4 text-slate-200">{att.topic}</td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-0.5 rounded bg-surface border border-border text-[10px]">
                        {att.difficulty}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-300 truncate max-w-xs">{att.userAnswer}</td>
                    <td className="py-2 px-4">
                      {att.isCorrect ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-400 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Incorrect</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              No quiz attempts recorded yet. Head over to Adaptive Quiz to test your knowledge!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
