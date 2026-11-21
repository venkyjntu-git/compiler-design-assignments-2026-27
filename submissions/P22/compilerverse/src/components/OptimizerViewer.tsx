import React from 'react';
import { Flame, ArrowRight, TrendingDown, Check, Zap, Info } from 'lucide-react';
import { TACInstruction } from '../compiler/tac';
import { OptimizationLogEntry } from '../compiler/optimizer';

interface OptimizerViewerProps {
  originalTac: TACInstruction[];
  optimizedTac: TACInstruction[];
  optimizations: OptimizationLogEntry[];
  countBefore: number;
  countAfter: number;
  reductionPercentage: number;
}

export const OptimizerViewer: React.FC<OptimizerViewerProps> = ({
  originalTac,
  optimizedTac,
  optimizations,
  countBefore,
  countAfter,
  reductionPercentage,
}) => {
  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Top Metrics Cards */}
      <div className="p-4 border-b border-border bg-surface-elevated/40 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <div className="bg-surface p-3 rounded-xl border border-border flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-mono">TAC Before</div>
            <div className="text-xl font-bold text-slate-200">{countBefore} instrs</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-800 text-slate-400 font-mono text-xs">
            Original
          </div>
        </div>

        <div className="bg-surface p-3 rounded-xl border border-border flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-mono">TAC After</div>
            <div className="text-xl font-bold text-emerald-400">{countAfter} instrs</div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-mono text-xs">
            Optimized
          </div>
        </div>

        <div className="bg-surface p-3 rounded-xl border border-border flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-mono">Code Reduction</div>
            <div className="text-xl font-bold text-cyan-400">{reductionPercentage}%</div>
          </div>
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-300">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Split View & Log */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Side-by-side TAC Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original TAC */}
          <div className="border border-border rounded-xl bg-surface-elevated/20 p-3">
            <div className="text-xs font-semibold text-slate-400 pb-2 mb-2 border-b border-border flex items-center justify-between">
              <span>Unoptimized Three-Address Code</span>
              <span className="text-[10px] font-mono text-slate-500">{originalTac.length} lines</span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              {originalTac.map((instr) => (
                <div key={instr.id} className="px-2 py-1 rounded bg-surface border border-border/50 text-slate-300 flex items-center justify-between">
                  <span className="text-slate-500 text-[10px]">{instr.id}</span>
                  <span className="text-slate-200">{instr.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optimized TAC */}
          <div className="border border-emerald-900/40 rounded-xl bg-emerald-950/10 p-3">
            <div className="text-xs font-semibold text-emerald-400 pb-2 mb-2 border-b border-emerald-900/40 flex items-center justify-between">
              <span>Optimized Three-Address Code</span>
              <span className="text-[10px] font-mono text-emerald-500">{optimizedTac.length} lines</span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              {optimizedTac.map((instr) => (
                <div key={instr.id} className="px-2 py-1 rounded bg-surface border border-emerald-800/40 text-emerald-200 flex items-center justify-between">
                  <span className="text-slate-500 text-[10px]">{instr.id}</span>
                  <span className="font-semibold text-emerald-300">{instr.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transformation Log */}
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Applied Optimization Passes Log ({optimizations.length} Transformations)</span>
          </div>

          {optimizations.length > 0 ? (
            <div className="border border-border rounded-xl overflow-hidden bg-surface-elevated/20">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-surface-elevated text-[11px] uppercase tracking-wider text-slate-400 border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Pass Type</th>
                    <th className="py-2.5 px-4 font-semibold">Before</th>
                    <th className="py-2.5 px-4 font-semibold">After</th>
                    <th className="py-2.5 px-4 font-semibold">Pedagogical Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {optimizations.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-surface-elevated/40 text-slate-300">
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-[10px] font-bold">
                          {entry.pass}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-rose-300 line-through">
                        {entry.before}
                      </td>
                      <td className="py-2.5 px-4 text-emerald-300 font-bold">
                        {entry.after}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                        {entry.explanation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 bg-surface rounded-xl border border-border text-center text-xs text-slate-500 italic">
              No algebraic simplifications or constant folding applied for this program. Code is already canonical.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
