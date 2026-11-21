import React, { useState } from 'react';
import { X, Sparkles, ChevronLeft, ChevronRight, MessageSquareQuote } from 'lucide-react';

interface StoryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StoryChapter {
  phase: string;
  avatar: string;
  title: string;
  color: string;
  quote: string;
  narrative: string;
  technicalSecret: string;
}

const CHAPTERS: StoryChapter[] = [
  {
    phase: 'Phase 1: Lexical Analyzer (Lexer)',
    avatar: '🔍',
    title: 'The Gatekeeper of Symbols',
    color: 'from-purple-600 to-indigo-600',
    quote: '"I break your raw source characters into meaningful atomic tokens."',
    narrative:
      'Hello, human developer! I am your compiler\'s first point of contact. To me, your code is just an ocean of raw ASCII characters and whitespace. I scan each character, strip away unneeded spaces and comments, and group characters into tokens like KEYWORD, IDENTIFIER, and NUMBER using deterministic finite automata (DFA) and Maximal Munch.',
    technicalSecret:
      'I track precise 1-based line numbers and character column offsets for every token so that if you make a mistake later, my teammates can point you right to it!',
  },
  {
    phase: 'Phase 2: Syntax Analyzer (Parser)',
    avatar: '📐',
    title: 'The Architect of Grammar',
    color: 'from-blue-600 to-cyan-600',
    quote: '"I verify that your sequence of tokens follows the sacred grammar rules."',
    narrative:
      'Once the Lexer gives me the token stream, I step in! Just because words exist doesn\'t mean they form a valid sentence. I apply Context-Free Grammar (CFG) rules using recursive-descent parsing. I verify operator precedence—ensuring multiplication tightly binds before addition—and construct the Concrete Parse Tree (CST).',
    technicalSecret:
      'If you forget a semicolon or unbalance a parenthesis, I halt the process with a clean syntax error before anything gets broken down the line.',
  },
  {
    phase: 'Phase 3: Abstract Syntax Tree (AST)',
    avatar: '🌳',
    title: 'The Sculptor of Semantics',
    color: 'from-emerald-600 to-teal-600',
    quote: '"I strip away syntactic fluff and sculpt your program into a pure hierarchical tree."',
    narrative:
      'While the Parser cares about every comma and semicolon, I care only about what your program *does*. I transform the verbose parse tree into an Abstract Syntax Tree (AST). In my world, an addition is simply a BinaryExpression node with a Left and Right child, stripping away extraneous punctuation.',
    technicalSecret:
      'Every AST node in CompilerVerse receives a stable ID (like ast_1, ast_2) so you can click any node and see its exact source code origin highlighted.',
  },
  {
    phase: 'Phase 4: Semantic Analyzer & Symbol Table',
    avatar: '🛡️',
    title: 'The Guardian of Logic',
    color: 'from-amber-600 to-yellow-600',
    quote: '"I check whether your program actually makes sense in the real world."',
    narrative:
      'Syntax is only skin deep! A sentence can be grammatically valid yet completely nonsensical. I inspect scopes, ensure you declare variables before reading them, check for duplicate declarations, prevent division by zero, and maintain the Scoped Symbol Table.',
    technicalSecret:
      'I track variable lifetimes across block scopes { ... } and record all references so the optimizer knows which variables are safe to modify.',
  },
  {
    phase: 'Phase 5: Intermediate Code (Three-Address Code)',
    avatar: '⚡',
    title: 'The Universal Linearizer',
    color: 'from-orange-600 to-rose-600',
    quote: '"I dismantle complex trees into simple, linear three-address instructions."',
    narrative:
      'Machines don\'t execute recursive trees—they execute linear instruction streams. I walk your AST and generate Three-Address Code (TAC), where each instruction has at most one operator and three addresses (e.g., t1 = b * 2; t2 = a + t1). Then, I identify leaders to partition your code into Basic Blocks.',
    technicalSecret:
      'A Basic Block has a single entry point and a single exit. This makes it safe for the Optimizer to manipulate code without altering your program\'s logic!',
  },
  {
    phase: 'Phase 6: Code Optimizer',
    avatar: '🔥',
    title: 'The Master of Efficiency',
    color: 'from-red-600 to-pink-600',
    quote: '"I simplify and speed up your code without changing its meaning."',
    narrative:
      'Why waste CPU cycles at runtime on math that can be solved right now? I look for constant arithmetic (10 + 20 -> 30), simplify algebraic identities (x * 1 -> x, x + 0 -> x), eliminate common subexpressions, and discard dead code that is never read.',
    technicalSecret:
      'I operate strictly within basic blocks and safe joins so that loops and conditionals never receive stale propagated values.',
  },
  {
    phase: 'Phase 7: Target Pseudo-Assembly Generator',
    avatar: '💻',
    title: 'The Machine Whisperer',
    color: 'from-violet-600 to-purple-600',
    quote: '"I produce the final target pseudo-assembly that the CPU can execute."',
    narrative:
      'My job is the grand finale! I map the optimized three-address instructions onto simulated RISC processor registers (R1 through R6). I emit LOAD, STORE, ADD, CMP, and JMP instructions, and finally append HALT to cleanly conclude execution.',
    technicalSecret:
      'Every single assembly instruction links directly back to its originating TAC instruction and AST node for complete full-stack traceability!',
  },
];

export const StoryModeModal: React.FC<StoryModeModalProps> = ({ isOpen, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);

  if (!isOpen) return null;

  const current = CHAPTERS[currentIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Banner */}
        <div className={`p-6 bg-gradient-to-r ${current.color} text-white flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <span className="text-4xl p-2 bg-white/10 rounded-2xl backdrop-blur-sm">
              {current.avatar}
            </span>
            <div>
              <div className="text-xs uppercase font-mono tracking-wider text-white/80">
                {current.phase}
              </div>
              <h2 className="text-xl font-bold">{current.title}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Body */}
        <div className="p-6 space-y-5 text-sm leading-relaxed text-slate-300">
          {/* Quote */}
          <div className="p-3.5 bg-surface-elevated rounded-2xl border border-border/80 text-primary-300 font-serif italic text-base flex items-center space-x-2">
            <MessageSquareQuote className="w-5 h-5 shrink-0 text-primary-400" />
            <span>{current.quote}</span>
          </div>

          {/* Narrative */}
          <p className="text-slate-200">{current.narrative}</p>

          {/* Behind the scenes technical note */}
          <div className="p-3 bg-surface-elevated/40 rounded-xl border border-border text-xs text-slate-400 font-mono">
            <span className="font-bold text-amber-400 font-sans">Under the Hood: </span>
            {current.technicalSecret}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-border bg-surface-elevated/30 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            {CHAPTERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentIdx ? 'w-6 bg-primary-500' : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="p-2 rounded-xl bg-surface hover:bg-slate-800 border border-border text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono text-slate-400 px-2">
              {currentIdx + 1} / {CHAPTERS.length}
            </span>

            <button
              onClick={() => setCurrentIdx(Math.min(CHAPTERS.length - 1, currentIdx + 1))}
              disabled={currentIdx === CHAPTERS.length - 1}
              className="p-2 rounded-xl bg-surface hover:bg-slate-800 border border-border text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
