import React, { useState } from 'react';
import {
  FileCode,
  ListOrdered,
  Network,
  Binary,
  CheckCircle,
  Cpu,
  Flame,
  Terminal,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useCompiler } from '../hooks/useCompilerContext';
import { PHASES } from '../components/PhaseFlow';
import { CompilerPhase } from '../compiler/pipeline';
import { TokenTable } from '../components/TokenTable';
import { ParseTreeViewer } from '../components/ParseTreeViewer';
import { ASTViewer } from '../components/ASTViewer';
import { SymbolTableViewer } from '../components/SymbolTableViewer';
import { TACViewer } from '../components/TACViewer';
import { OptimizerViewer } from '../components/OptimizerViewer';
import { TargetCodeViewer } from '../components/TargetCodeViewer';

export const PipelineExplorerPage: React.FC = () => {
  const { result } = useCompiler();
  const [selectedPhase, setSelectedPhase] = useState<string>('LEXICAL_ANALYSIS');

  const phaseMeta: Record<
    string,
    {
      title: string;
      role: string;
      inputDesc: string;
      outputDesc: string;
      algorithm: string;
    }
  > = {
    LEXICAL_ANALYSIS: {
      title: 'Phase 1: Lexical Analysis (Scanning)',
      role: 'Translates unstructured character streams into structured token streams.',
      inputDesc: 'Raw program text (characters, spaces, newlines, comments).',
      outputDesc: 'Ordered list of Token structures with IDs, types, lexemes, and source locations.',
      algorithm: 'Deterministic Finite Automaton (DFA) with Maximal Munch longest-match rule.',
    },
    SYNTAX_ANALYSIS: {
      title: 'Phase 2: Syntax Analysis (Parsing)',
      role: 'Validates that token sequences conform to the formal Context-Free Grammar.',
      inputDesc: 'Stream of tokens produced by the Lexical Analyzer.',
      outputDesc: 'Concrete Parse Tree (CST) and full derivation trace.',
      algorithm: 'Top-down recursive-descent parsing with operator precedence binding.',
    },
    AST_GENERATION: {
      title: 'Phase 3: Abstract Syntax Tree Generation',
      role: 'Eliminates concrete punctuation and creates a concise hierarchical tree.',
      inputDesc: 'Concrete parse tree nodes.',
      outputDesc: 'Typed AST nodes with stable IDs (Program, VarDecl, BinaryExpr, etc.).',
      algorithm: 'Tree simplification and semantic node construction.',
    },
    SEMANTIC_ANALYSIS: {
      title: 'Phase 4: Semantic Analysis & Symbol Management',
      role: 'Enforces type checking, variable declaration rules, and manages lexical scopes.',
      inputDesc: 'Abstract Syntax Tree.',
      outputDesc: 'Scoped Symbol Table and semantic validation diagnostic logs.',
      algorithm: 'Scoped symbol resolution and recursive AST type traversal.',
    },
    TAC_GENERATION: {
      title: 'Phase 5: Intermediate Code Generation (Three-Address Code)',
      role: 'Linearizes recursive AST expressions into intermediate code and builds basic blocks.',
      inputDesc: 'Type-checked Abstract Syntax Tree.',
      outputDesc: 'Three-Address Code (TAC) and Control Flow Basic Blocks (CFG).',
      algorithm: 'Post-order expression traversal and classical Leader Detection.',
    },
    CODE_OPTIMIZATION: {
      title: 'Phase 6: Code Optimization',
      role: 'Improves execution efficiency without changing program semantics.',
      inputDesc: 'Original Three-Address Code instructions and basic block boundaries.',
      outputDesc: 'Optimized TAC with dead code, constant expressions, and redundancies removed.',
      algorithm: 'Constant Folding, Constant & Copy Propagation, CSE, and DCE.',
    },
    TARGET_CODE_GENERATION: {
      title: 'Phase 7: Target Code Generation',
      role: 'Maps optimized intermediate code onto simulated machine hardware instructions.',
      inputDesc: 'Optimized Three-Address Code instructions.',
      outputDesc: 'RISC-style pseudo-assembly text with simulated CPU register allocations.',
      algorithm: 'Round-robin virtual register allocation and instruction mapping.',
    },
  };

  const meta = phaseMeta[selectedPhase] || phaseMeta['LEXICAL_ANALYSIS'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Pipeline Explorer</h1>
        <p className="text-xs text-slate-400">
          In-depth architectural inspection of every compiler transformation phase.
        </p>
      </div>

      {/* Horizontal Phase Selector Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {PHASES.filter((p) => p.id !== 'SOURCE').map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPhase(p.id)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedPhase === p.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'bg-surface hover:bg-surface-elevated text-slate-400 hover:text-white border border-border'
            }`}
          >
            <p.icon className="w-3.5 h-3.5" />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Theory & Architecture Header for Selected Phase */}
      <div className="bg-surface rounded-2xl border border-border p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 space-y-1">
          <h2 className="text-base font-bold text-white">{meta.title}</h2>
          <p className="text-xs text-slate-300 leading-relaxed">{meta.role}</p>
          <div className="pt-2 text-[11px] font-mono text-cyan-400">
            <strong>Key Algorithm:</strong> {meta.algorithm}
          </div>
        </div>

        <div className="bg-surface-elevated/40 p-3 rounded-xl border border-border/70 space-y-1 text-xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Input Data</span>
          <p className="text-slate-300">{meta.inputDesc}</p>
        </div>

        <div className="bg-surface-elevated/40 p-3 rounded-xl border border-border/70 space-y-1 text-xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Output Data</span>
          <p className="text-slate-300">{meta.outputDesc}</p>
        </div>
      </div>

      {/* Interactive Phase Viewer */}
      <div className="h-[600px] bg-surface rounded-2xl border border-border overflow-hidden">
        {result?.success ? (
          selectedPhase === 'LEXICAL_ANALYSIS' ? (
            <TokenTable tokens={result.tokens} />
          ) : selectedPhase === 'SYNTAX_ANALYSIS' ? (
            <ParseTreeViewer parseTree={result.parseTree} trace={result.parsingTrace} />
          ) : selectedPhase === 'AST_GENERATION' ? (
            <ASTViewer ast={result.ast} />
          ) : selectedPhase === 'SEMANTIC_ANALYSIS' ? (
            <SymbolTableViewer
              symbolTable={result.symbolTable}
              errors={result.semanticErrors}
              warnings={result.semanticWarnings}
            />
          ) : selectedPhase === 'TAC_GENERATION' ? (
            <TACViewer instructions={result.originalTac} basicBlocks={result.basicBlocks} />
          ) : selectedPhase === 'CODE_OPTIMIZATION' ? (
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
        ) : (
          <div className="h-full flex items-center justify-center p-6 text-center text-slate-500 text-xs">
            Run the compilation pipeline in the Playground to populate data for this phase.
          </div>
        )}
      </div>
    </div>
  );
};
