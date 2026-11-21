import React, { useRef, useState } from 'react';
import {
  Play,
  RotateCcw,
  Trash2,
  FolderOpen,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useCompiler } from '../hooks/useCompilerContext';
import { EXAMPLE_PROGRAMS } from '../utils/examples';

export const CodeEditor: React.FC = () => {
  const {
    sourceCode,
    setSourceCode,
    result,
    isCompiling,
    runCompilation,
    resetCompilation,
    loadExample,
    activeHighlight,
    setActiveHighlight,
  } = useCompiler();

  const [selectedExampleId, setSelectedExampleId] = useState<string>(EXAMPLE_PROGRAMS[0].id);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = sourceCode.split('\n');

  // Handle Tab key in code editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = sourceCode.substring(0, start) + '    ' + sourceCode.substring(end);
      setSourceCode(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleClear = () => {
    setSourceCode('');
    resetCompilation();
  };

  const handleExampleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const exId = e.target.value;
    setSelectedExampleId(exId);
    loadExample(exId);
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border shadow-xl overflow-hidden">
      {/* Editor Header Toolbar */}
      <div className="h-14 border-b border-border bg-surface-elevated/40 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-mono font-semibold text-slate-300 pl-2 border-l border-border">
            main.cv
          </span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            (C-Like Mini-Language)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Example Loader Dropdown */}
          <div className="flex items-center space-x-1.5 bg-surface border border-border rounded-lg px-2.5 py-1 text-xs">
            <FolderOpen className="w-3.5 h-3.5 text-primary-400 shrink-0" />
            <select
              value={selectedExampleId}
              onChange={handleExampleSelect}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              {EXAMPLE_PROGRAMS.map((ex) => (
                <option key={ex.id} value={ex.id} className="bg-surface text-slate-200">
                  {ex.title}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Editor */}
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-surface hover:bg-slate-800 border border-border text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear Editor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Reset Pipeline */}
          <button
            onClick={resetCompilation}
            className="p-1.5 rounded-lg bg-surface hover:bg-slate-800 border border-border text-slate-400 hover:text-white transition-colors"
            title="Reset Pipeline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Run Pipeline Button */}
          <button
            onClick={() => runCompilation()}
            disabled={isCompiling}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-primary-600/30 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isCompiling ? 'Running...' : 'Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Code Editor Body with Line Numbers */}
      <div className="flex-1 flex overflow-hidden relative font-mono text-xs leading-relaxed">
        {/* Line Numbers */}
        <div className="w-12 bg-surface-elevated/20 border-r border-border/60 py-3 select-none text-right pr-3 text-slate-600 shrink-0 font-mono">
          {lines.map((_, i) => (
            <div
              key={i}
              className={`h-5 ${
                result?.errors.some((err) => err.line === i + 1)
                  ? 'text-rose-400 font-bold bg-rose-500/10'
                  : ''
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area Input */}
        <textarea
          ref={textareaRef}
          value={sourceCode}
          onChange={(e) => setSourceCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 bg-transparent p-3 text-slate-200 resize-none focus:outline-none font-mono text-xs leading-5 whitespace-pre selection:bg-primary-500/30"
          placeholder="// Write your CompilerVerse mini-language code here...&#10;int a = 10;&#10;print(a);"
        />

        {/* Active Highlight Marker (when token/AST is selected in other panels) */}
        {activeHighlight?.sourceSpan && (
          <div className="absolute top-2 right-4 px-2.5 py-1 rounded bg-primary-950/90 border border-primary-500 text-primary-300 text-[11px] font-mono shadow-lg pointer-events-none flex items-center space-x-1.5">
            <Sparkles className="w-3 h-3 text-primary-400 animate-spin" />
            <span>
              Linked to Line {activeHighlight.sourceSpan.line}, Col {activeHighlight.sourceSpan.column}
            </span>
          </div>
        )}
      </div>

      {/* Editor Status / Diagnostics Footer */}
      <div className="h-10 border-t border-border bg-surface-elevated/30 px-4 flex items-center justify-between text-xs text-slate-400 shrink-0 font-mono">
        <div className="flex items-center space-x-3">
          {result?.success ? (
            <span className="flex items-center space-x-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Compilation Succeeded</span>
            </span>
          ) : result && !result.success ? (
            <span className="flex items-center space-x-1.5 text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>
                {result.errors[0]?.message || 'Compilation failed'} (Line{' '}
                {result.errors[0]?.line || 1})
              </span>
            </span>
          ) : (
            <span className="text-slate-500">Ready to compile</span>
          )}
        </div>

        <div className="flex items-center space-x-4 text-[11px] text-slate-500">
          <span>{lines.length} lines</span>
          <span>{sourceCode.length} chars</span>
          {result?.success && (
            <span className="text-primary-400">
              {result.targetAssembly.length} target instructions
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
