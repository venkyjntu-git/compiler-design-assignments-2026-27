import React from 'react';
import { X, Play, RotateCcw, HelpCircle, CheckCircle, Code, Layers } from 'lucide-react';

interface ExecutionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutionGuideModal: React.FC<ExecutionGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-surface-elevated/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-primary-600/20 text-primary-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">How to Run Your First Compilation</h2>
              <p className="text-xs text-slate-400">Step-by-step beginner guide to CompilerVerse</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 leading-relaxed">
          {/* Steps */}
          <div className="space-y-4">
            <div className="flex space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Open Compiler Playground</h3>
                <p>
                  Navigate to the <strong>Compiler Playground</strong> tab from the sidebar. You will see the interactive code editor on the left and the phase inspectors on the right.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Enter a Valid Program or Choose an Example</h3>
                <p>
                  You can type your own C-like mini-language program or select from <strong>Example A, B, C, D, E, or F</strong> using the sample dropdown.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Click the "Run Pipeline" Button</h3>
                <p>
                  Click the prominent purple <strong>Run Pipeline</strong> button. The deterministic 7-phase compilation engine immediately processes your program without any backend dependencies.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Explore the Seven Compiler Phases</h3>
                <p>
                  Click across the 7 phase chips at the top to inspect Tokens, Parse Tree (CST), AST, Symbol Table, Three-Address Code, Optimizations, and Target Pseudo-Assembly.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                5
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Hover &amp; Select for Cross-Phase Linking</h3>
                <p>
                  Hover over tokens in the Token Table, or click AST nodes, to see the matching source line, TAC instructions, and target assembly highlighted simultaneously.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                6
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Understand Errors if Compilation Fails</h3>
                <p>
                  If an error occurs (such as an undeclared variable or missing semicolon), the pipeline halts safely, highlights the exact faulty line, and explains the error.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                7
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Modify Your Code &amp; Re-run</h3>
                <p>
                  Edit the code and click Run Pipeline again. The pipeline executes cleanly without stale caches or duplicated outputs.
                </p>
              </div>
            </div>
          </div>

          {/* Reset Guide */}
          <div className="p-3 bg-surface-elevated rounded-xl border border-border">
            <h4 className="font-semibold text-white flex items-center space-x-1.5 mb-1">
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>How to Reset the Pipeline</span>
            </h4>
            <p className="text-slate-400">
              Click the circular arrow icon next to the Run button to clear all cached phase outputs and restore the compiler to a clean idle state.
            </p>
          </div>

          {/* Supported Syntax Reference */}
          <div className="p-3 bg-surface-elevated rounded-xl border border-border font-mono text-[11px] space-y-2">
            <div className="font-bold text-primary-300 font-sans text-xs">Supported Mini-Language Syntax:</div>
            <div>• <span className="text-emerald-300">int x = 10;</span> (Variable declaration with optional initialization)</div>
            <div>• <span className="text-emerald-300">x = a + b * 2;</span> (Assignment with +, -, *, /, % and precedence)</div>
            <div>• <span className="text-emerald-300">print(x);</span> (Built-in output function)</div>
            <div>• <span className="text-emerald-300">if (x &gt; 5) &#123; ... &#125; else &#123; ... &#125;</span> (Branching)</div>
            <div>• <span className="text-emerald-300">while (i &lt; 10) &#123; ... &#125;</span> (Loops)</div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-elevated/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs transition-colors"
          >
            Got it, Let's Compile!
          </button>
        </div>
      </div>
    </div>
  );
};
