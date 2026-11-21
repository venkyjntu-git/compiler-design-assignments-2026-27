import React, { useState } from 'react';
import { Cpu, Layers, ArrowDownRight, GitBranch, ArrowRight } from 'lucide-react';
import { TACInstruction, BasicBlock } from '../compiler/tac';
import { useCompiler } from '../hooks/useCompilerContext';

interface TACViewerProps {
  instructions: TACInstruction[];
  basicBlocks: BasicBlock[];
}

export const TACViewer: React.FC<TACViewerProps> = ({ instructions, basicBlocks }) => {
  const { activeHighlight, setActiveHighlight } = useCompiler();
  const [viewMode, setViewMode] = useState<'linear' | 'blocks'>('blocks');

  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-border bg-surface-elevated/40 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('blocks')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'blocks'
                ? 'bg-primary-600/20 border border-primary-500/40 text-primary-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Basic Blocks &amp; Control Flow ({basicBlocks.length} Blocks)</span>
          </button>

          <button
            onClick={() => setViewMode('linear')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'linear'
                ? 'bg-primary-600/20 border border-primary-500/40 text-primary-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Linear TAC ({instructions.length} Instructions)</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
          Classical Leader Detection Partitioning
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'blocks' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {basicBlocks.map((block) => (
              <div
                key={block.id}
                className="bg-surface-elevated/40 border border-border rounded-xl p-3 flex flex-col justify-between hover:border-primary-500/50 transition-all shadow-sm"
              >
                <div>
                  {/* Block Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/80">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-primary-950 border border-primary-700 text-primary-300 font-bold">
                        {block.name}
                      </span>
                      {block.isEntry && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                          Entry
                        </span>
                      )}
                      {block.isExit && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800 text-amber-300">
                          Exit
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {block.instructions.length} instr(s)
                    </span>
                  </div>

                  {/* Instructions inside Block */}
                  <div className="space-y-1">
                    {block.instructions.map((instr) => {
                      const isHighlighted =
                        activeHighlight?.id === instr.id ||
                        activeHighlight?.id === instr.astNodeId;

                      return (
                        <div
                          key={instr.id}
                          onMouseEnter={() =>
                            setActiveHighlight({
                              type: 'tac',
                              id: instr.id,
                              sourceSpan: instr.loc,
                            })
                          }
                          onMouseLeave={() => setActiveHighlight(null)}
                          className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-primary-950 text-white border-l-2 border-primary-400 font-bold'
                              : 'bg-surface/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-[10px] text-slate-500 mr-2">{instr.id}:</span>
                          <span className="text-cyan-300 font-semibold">{instr.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Predecessors and Successors Footer */}
                <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500">Pred:</span>
                    {block.predecessors.length > 0 ? (
                      block.predecessors.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-surface border border-border text-slate-300">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-600">none</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500">Succ:</span>
                    {block.successors.length > 0 ? (
                      block.successors.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-surface border border-border text-slate-300">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-600">none</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-surface-elevated text-[11px] uppercase tracking-wider text-slate-400 border-b border-border">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">ID</th>
                  <th className="py-2.5 px-4 font-semibold">Operator</th>
                  <th className="py-2.5 px-4 font-semibold">Arg 1</th>
                  <th className="py-2.5 px-4 font-semibold">Arg 2</th>
                  <th className="py-2.5 px-4 font-semibold">Result</th>
                  <th className="py-2.5 px-4 font-semibold">Linear Representation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {instructions.map((instr) => (
                  <tr
                    key={instr.id}
                    onMouseEnter={() =>
                      setActiveHighlight({
                        type: 'tac',
                        id: instr.id,
                        sourceSpan: instr.loc,
                      })
                    }
                    onMouseLeave={() => setActiveHighlight(null)}
                    className="hover:bg-surface-elevated/40 text-slate-300"
                  >
                    <td className="py-2 px-4 text-slate-500 font-bold">{instr.id}</td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-border text-[10px]">
                        {instr.op}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-400">{instr.arg1 || '-'}</td>
                    <td className="py-2 px-4 text-slate-400">{instr.arg2 || '-'}</td>
                    <td className="py-2 px-4 text-emerald-300 font-bold">{instr.result || '-'}</td>
                    <td className="py-2 px-4 text-cyan-300 font-bold">{instr.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
