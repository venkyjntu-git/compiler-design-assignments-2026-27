import React, { useState } from 'react';
import { Terminal, Copy, Check, BookOpen, Cpu } from 'lucide-react';
import { TargetInstruction, INSTRUCTION_SET_DOC } from '../compiler/targetCode';
import { useCompiler } from '../hooks/useCompilerContext';

interface TargetCodeViewerProps {
  instructions: TargetInstruction[];
  registersUsed: string[];
  assemblyText: string;
}

export const TargetCodeViewer: React.FC<TargetCodeViewerProps> = ({
  instructions,
  registersUsed,
  assemblyText,
}) => {
  const { activeHighlight, setActiveHighlight } = useCompiler();
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(assemblyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-border bg-surface-elevated/40 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Target Pseudo-Assembly (RISC-Style)</span>
          </div>

          <div className="flex items-center space-x-1 pl-2 border-l border-border">
            <span className="text-[11px] text-slate-500 font-mono">Registers:</span>
            {registersUsed.map((r) => (
              <span
                key={r}
                className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-[10px]"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              showDocs
                ? 'bg-primary-600 text-white'
                : 'bg-surface border border-border text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{showDocs ? 'Hide ISA Reference' : 'ISA Reference'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface border border-border text-slate-300 hover:text-white text-xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy ASM'}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-auto p-4 flex flex-col lg:flex-row gap-4">
        {/* Assembly Code Listing */}
        <div className="flex-1 bg-surface-elevated/20 border border-border rounded-xl p-3 font-mono text-xs overflow-auto">
          <div className="space-y-1">
            {instructions.map((instr, idx) => {
              const isHighlighted =
                activeHighlight?.id === instr.id ||
                activeHighlight?.id === instr.tacId;

              const isLabel = instr.op === 'LABEL';
              const isHalt = instr.op === 'HALT';

              return (
                <div
                  key={instr.id}
                  onMouseEnter={() =>
                    setActiveHighlight({
                      type: 'asm',
                      id: instr.id,
                      sourceSpan: instr.loc,
                    })
                  }
                  onMouseLeave={() => setActiveHighlight(null)}
                  className={`px-3 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer ${
                    isHighlighted
                      ? 'bg-primary-950 text-white border-l-2 border-primary-400 font-bold'
                      : isLabel
                      ? 'text-amber-300 font-bold bg-amber-950/20'
                      : isHalt
                      ? 'text-rose-300 font-bold bg-rose-950/20'
                      : 'hover:bg-surface-elevated/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-slate-600 select-none text-[10px] w-6 text-right">
                      {idx + 1}
                    </span>
                    <span className="font-semibold">{instr.text}</span>
                  </div>

                  {instr.comment && (
                    <span className="text-[10px] text-slate-500 italic pl-4 font-sans">
                      ; {instr.comment}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ISA Documentation Sidebar Drawer */}
        {showDocs && (
          <div className="w-full lg:w-80 bg-surface-elevated/40 border border-border rounded-xl p-3 overflow-y-auto shrink-0">
            <div className="text-xs font-semibold text-slate-300 pb-2 mb-2 border-b border-border flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary-400" />
              <span>Instruction Set Architecture (ISA)</span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              {INSTRUCTION_SET_DOC.map((item) => (
                <div key={item.mnemonic} className="p-2.5 rounded-lg bg-surface border border-border/70 space-y-1">
                  <div className="font-bold text-cyan-300">{item.mnemonic}</div>
                  <div className="text-[11px] text-slate-400 font-sans leading-snug">
                    {item.description}
                  </div>
                  <div className="text-[10px] text-emerald-400/90 pt-0.5">
                    eg: {item.example}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
