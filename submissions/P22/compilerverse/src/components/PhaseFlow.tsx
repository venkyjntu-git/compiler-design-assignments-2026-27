import React from 'react';
import {
  FileCode,
  ListOrdered,
  Network,
  Binary,
  CheckCircle,
  Cpu,
  Flame,
  Terminal,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useCompiler } from '../hooks/useCompilerContext';
import { CompilerPhase } from '../compiler/pipeline';

export interface PhaseInfo {
  id: CompilerPhase | 'SOURCE';
  label: string;
  short: string;
  icon: React.ElementType;
  description: string;
}

export const PHASES: PhaseInfo[] = [
  {
    id: 'SOURCE',
    label: 'Source Code',
    short: 'Source',
    icon: FileCode,
    description: 'Human-readable high-level C-like mini-language program.',
  },
  {
    id: 'LEXICAL_ANALYSIS',
    label: 'Lexical Analysis',
    short: 'Lexer',
    icon: ListOrdered,
    description: 'Decomposes source character stream into typed tokens.',
  },
  {
    id: 'SYNTAX_ANALYSIS',
    label: 'Syntax Analysis',
    short: 'Parser',
    icon: Network,
    description: 'Validates token sequences against context-free grammar to build CST.',
  },
  {
    id: 'AST_GENERATION',
    label: 'Abstract Syntax Tree',
    short: 'AST',
    icon: Binary,
    description: 'Condenses concrete syntax into structured hierarchical AST nodes.',
  },
  {
    id: 'SEMANTIC_ANALYSIS',
    label: 'Semantic Analysis',
    short: 'Semantics',
    icon: CheckCircle,
    description: 'Enforces type rules, scope boundaries, and manages symbol table.',
  },
  {
    id: 'TAC_GENERATION',
    label: 'Intermediate Code (TAC)',
    short: 'TAC',
    icon: Cpu,
    description: 'Linearizes AST into three-address code and partitions basic blocks.',
  },
  {
    id: 'CODE_OPTIMIZATION',
    label: 'Code Optimization',
    short: 'Optimizer',
    icon: Flame,
    description: 'Performs constant folding, propagation, CSE, and algebraic simplification.',
  },
  {
    id: 'TARGET_CODE_GENERATION',
    label: 'Target Code Generation',
    short: 'Assembly',
    icon: Terminal,
    description: 'Allocates CPU registers and produces executable pseudo-assembly.',
  },
];

interface PhaseFlowProps {
  activePhase?: string;
  onSelectPhase?: (phaseId: string) => void;
}

export const PhaseFlow: React.FC<PhaseFlowProps> = ({ activePhase, onSelectPhase }) => {
  const { result } = useCompiler();

  const getPhaseStatus = (phaseId: string) => {
    if (!result) return 'idle';
    if (phaseId === 'SOURCE') return 'success';

    if (!result.success && result.failedPhase === phaseId) {
      return 'error';
    }

    const order = PHASES.map((p) => p.id);
    const failedIndex = result.failedPhase ? order.indexOf(result.failedPhase) : 999;
    const currentIndex = order.indexOf(phaseId as any);

    if (currentIndex < failedIndex) {
      return 'success';
    }
    return 'idle';
  };

  return (
    <div className="w-full bg-surface-elevated/50 border border-border rounded-2xl p-4 overflow-x-auto">
      <div className="flex items-center min-w-max space-x-2">
        {PHASES.map((phase, idx) => {
          const Icon = phase.icon;
          const status = getPhaseStatus(phase.id);
          const isSelected = activePhase === phase.id;

          return (
            <React.Fragment key={phase.id}>
              <button
                onClick={() => onSelectPhase?.(phase.id)}
                className={`group flex items-center space-x-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-primary-600/20 border-primary-500 shadow-md shadow-primary-500/10'
                    : status === 'error'
                    ? 'bg-rose-950/30 border-rose-800/80 hover:bg-rose-950/50'
                    : status === 'success'
                    ? 'bg-surface border-border hover:border-slate-600 hover:bg-surface-elevated'
                    : 'bg-surface/60 border-border/60 opacity-60 hover:opacity-100'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    status === 'error'
                      ? 'bg-rose-500/20 text-rose-400'
                      : status === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      0{idx}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      {phase.short}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block max-w-[110px] truncate">
                    {phase.label}
                  </span>
                </div>
              </button>

              {idx < PHASES.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
