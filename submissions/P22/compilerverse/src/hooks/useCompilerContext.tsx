/**
 * Compiler Context & State Hook
 * Manages reactive compiler state, execution pipeline, and cross-phase synchronized highlights.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CompilationResult, compile } from '../compiler/pipeline';
import { EXAMPLE_PROGRAMS } from '../utils/examples';
import { globalProgressTracker } from '../progress/progressTracker';

export interface HighlightTarget {
  type: 'token' | 'ast' | 'tac' | 'asm';
  id: string;
  sourceSpan?: { line: number; column: number; start: number; end: number };
}

interface CompilerContextType {
  sourceCode: string;
  setSourceCode: (code: string) => void;
  result: CompilationResult | null;
  isCompiling: boolean;
  activeHighlight: HighlightTarget | null;
  setActiveHighlight: (target: HighlightTarget | null) => void;
  runCompilation: (codeOverride?: string) => void;
  resetCompilation: () => void;
  loadExample: (exampleId: string) => void;
}

const CompilerContext = createContext<CompilerContextType | undefined>(undefined);

export const CompilerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sourceCode, setSourceCode] = useState<string>(EXAMPLE_PROGRAMS[0].code);
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [activeHighlight, setActiveHighlight] = useState<HighlightTarget | null>(null);

  // Auto-run compilation on initial mount with Example A
  useEffect(() => {
    const res = compile(EXAMPLE_PROGRAMS[0].code);
    setResult(res);
  }, []);

  const runCompilation = useCallback(
    (codeOverride?: string) => {
      const codeToRun = codeOverride !== undefined ? codeOverride : sourceCode;
      setIsCompiling(true);
      setActiveHighlight(null);

      // Short timeout to allow UI loading spinner render cleanly
      setTimeout(() => {
        try {
          const compilationRes = compile(codeToRun);
          setResult(compilationRes);
          if (compilationRes.success) {
            globalProgressTracker.recordCompilation();
          }
        } catch (err: any) {
          console.error('Compilation failed unexpectedly:', err);
        } finally {
          setIsCompiling(false);
        }
      }, 150);
    },
    [sourceCode]
  );

  const resetCompilation = useCallback(() => {
    setResult(null);
    setActiveHighlight(null);
  }, []);

  const loadExample = useCallback(
    (exampleId: string) => {
      const ex = EXAMPLE_PROGRAMS.find((p) => p.id === exampleId);
      if (ex) {
        setSourceCode(ex.code);
        runCompilation(ex.code);
      }
    },
    [runCompilation]
  );

  return (
    <CompilerContext.Provider
      value={{
        sourceCode,
        setSourceCode,
        result,
        isCompiling,
        activeHighlight,
        setActiveHighlight,
        runCompilation,
        resetCompilation,
        loadExample,
      }}
    >
      {children}
    </CompilerContext.Provider>
  );
};

export function useCompiler() {
  const context = useContext(CompilerContext);
  if (!context) {
    throw new Error('useCompiler must be used within a CompilerProvider');
  }
  return context;
}
