import React, { useState } from 'react';
import {
  ListOrdered,
  Network,
  Binary,
  Database,
  Cpu,
  Flame,
  Terminal,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { CodeEditor } from '../components/CodeEditor';
import { TokenTable } from '../components/TokenTable';
import { ParseTreeViewer } from '../components/ParseTreeViewer';
import { ASTViewer } from '../components/ASTViewer';
import { SymbolTableViewer } from '../components/SymbolTableViewer';
import { TACViewer } from '../components/TACViewer';
import { OptimizerViewer } from '../components/OptimizerViewer';
import { TargetCodeViewer } from '../components/TargetCodeViewer';
import { useCompiler } from '../hooks/useCompilerContext';

type InspectorTab = 'tokens' | 'cst' | 'ast' | 'symbols' | 'tac' | 'optimizer' | 'target';

export const PlaygroundPage: React.FC = () => {
  const { result, isCompiling, activeHighlight } = useCompiler();
  const [activeTab, setActiveTab] = useState<InspectorTab>('tokens');

  return (
    <div className="p-6 max-w-[1700px] mx-auto h-[calc(100vh-4rem)] flex flex-col space-y-4 animate-in fade-in duration-300">
      {/* Top Notification if Active Cross-Phase Link is selected */}
      {activeHighlight && (
        <div className="bg-primary-950/80 border border-primary-500/80 px-4 py-2 rounded-xl text-xs font-mono text-primary-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-primary-400 animate-spin" />
            <span>
              <strong>Cross-Phase Link Active:</strong> Highlighted {activeHighlight.type.toUpperCase()}{' '}
              {activeHighlight.id}{' '}
              {activeHighlight.sourceSpan &&
                `-> Source Line ${activeHighlight.sourceSpan.line}:${activeHighlight.sourceSpan.column}`}
            </span>
          </div>
          <span className="text-[11px] text-primary-400/80">
            Hover out to clear highlight
          </span>
        </div>
      )}

      {/* Main 2-Column Split: Editor (Left) & Synchronized Inspector (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Code Editor (5 columns) */}
        <div className="lg:col-span-5 h-full min-h-[450px]">
          <CodeEditor />
        </div>

        {/* Right Column: Synchronized Phase Inspector (7 columns) */}
        <div className="lg:col-span-7 h-full min-h-[450px] flex flex-col bg-surface rounded-2xl border border-border shadow-xl overflow-hidden">
          {/* Phase Selector Tabs */}
          <div className="h-14 border-b border-border bg-surface-elevated/40 px-3 flex items-center justify-between shrink-0 overflow-x-auto">
            <div className="flex items-center space-x-1.5 min-w-max">
              <button
                onClick={() => setActiveTab('tokens')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'tokens'
                    ? 'bg-primary-600/20 border border-primary-500 text-primary-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5 text-purple-400" />
                <span>Tokens</span>
                {result?.tokens && (
                  <span className="text-[10px] font-mono text-slate-500">
                    ({result.tokens.filter((t) => t.type !== 'EOF').length})
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('cst')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'cst'
                    ? 'bg-primary-600/20 border border-primary-500 text-primary-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                <Network className="w-3.5 h-3.5 text-blue-400" />
                <span>Parse Tree</span>
              </button>

              <button
                onClick={() => setActiveTab('ast')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'ast'
                    ? 'bg-primary-600/20 border border-primary-500 text-primary-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                <Binary className="w-3.5 h-3.5 text-emerald-400" />
                <span>AST</span>
              </button>

              <button
                onClick={() => setActiveTab('symbols')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'symbols'
                    ? 'bg-primary-600/20 border border-primary-500 text-primary-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Symbols</span>
                {result?.symbolTable && (
                  <span className="text-[10px] font-mono text-slate-500">
                    ({result.symbolTable.length})
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('tac')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'tac'
                    ? 'bg-primary-600/20 border border-primary-500 text-primary-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-orange-400" />
                <span>TAC</span>
                {result?.originalTac && (
                  <span className="text-[10px] font-mono text-slate-500">
                    ({result.originalTac.length})
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('optimizer')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'optimizer'
                    ? 'bg-primary-600/20 border border-primary-500 text-primary-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Optimizer</span>
                {result?.optimizations && result.optimizations.length > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400">
                    (-{result.reductionPercentage}%)
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('target')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'target'
                    ? 'bg-primary-600/20 border border-primary-500 text-primary-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Target Code</span>
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="flex-1 overflow-hidden relative">
            {isCompiling ? (
              <div className="h-full flex flex-col items-center justify-center space-y-3 text-slate-400">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">Transforming code across 7 phases...</span>
              </div>
            ) : result?.success ? (
              activeTab === 'tokens' ? (
                <TokenTable tokens={result.tokens} />
              ) : activeTab === 'cst' ? (
                <ParseTreeViewer parseTree={result.parseTree} trace={result.parsingTrace} />
              ) : activeTab === 'ast' ? (
                <ASTViewer ast={result.ast} />
              ) : activeTab === 'symbols' ? (
                <SymbolTableViewer
                  symbolTable={result.symbolTable}
                  errors={result.semanticErrors}
                  warnings={result.semanticWarnings}
                />
              ) : activeTab === 'tac' ? (
                <TACViewer
                  instructions={result.originalTac}
                  basicBlocks={result.basicBlocks}
                />
              ) : activeTab === 'optimizer' ? (
                <OptimizerViewer
                  originalTac={result.originalTac}
                  optimizedTac={result.optimizedTac}
                  optimizations={result.optimizations}
                  countBefore={result.tacCountBefore}
                  countAfter={result.tacCountAfter}
                  reductionPercentage={result.reductionPercentage}
                />
              ) : (
                <TargetCodeViewer
                  instructions={result.targetAssembly}
                  registersUsed={result.registersUsed}
                  assemblyText={result.assemblyText}
                />
              )
            ) : result && !result.success ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-rose-300">
                  Compilation Halted at {result.failedPhase}
                </div>
                <div className="text-xs text-slate-400 max-w-md font-mono bg-surface-elevated p-3 rounded-xl border border-border">
                  {result.errors[0]?.message} (Line {result.errors[0]?.line || 1}:
                  {result.errors[0]?.column || 1})
                </div>
                <p className="text-xs text-slate-500">
                  Fix the error in the editor and click "Run Pipeline" to resume.
                </p>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Click "Run Pipeline" in the editor to inspect compiler phases.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
