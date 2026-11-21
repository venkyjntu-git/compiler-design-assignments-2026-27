import React, { useState } from 'react';
import {
  Video,
  Play,
  Terminal,
  Download,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  RotateCcw,
  SkipForward,
  Info,
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  scriptPath: string;
  sceneName: string;
  duration: string;
  grammar: string;
  input: string;
  keyTopics: string[];
  renderCommand: string;
  videoSrc: string;
  frames: { title: string; subtitle: string; content: string; highlight: string }[];
}

const LESSONS: Lesson[] = [
  {
    id: 'll1',
    title: 'Lesson 1: LL(1) Predictive Parsing',
    subtitle: 'Top-Down Parsing, FIRST & FOLLOW Sets, and Predictive M-Table',
    scriptPath: 'animations/ll1_parsing.py',
    sceneName: 'LL1ParsingScene',
    duration: '3:45 min',
    grammar: "E -> T E' | E' -> + T E' | ε | T -> F T' | T' -> * F T' | ε | F -> ( E ) | id",
    input: 'id + id * id',
    keyTopics: [
      'Top-down leftmost derivation concept',
      'Computation of FIRST sets via fixed-point iterations',
      'Computation of FOLLOW sets with start symbol $',
      'Construction and conflict-free verification of M-table',
      'Predictive stack matching and string acceptance',
    ],
    renderCommand:
      'manim -pql animations/ll1_parsing.py LL1ParsingScene -o ../public/videos/ll1_parsing.mp4',
    videoSrc: '/videos/ll1_parsing.mp4',
    frames: [
      {
        title: 'Scene 1: Grammar Presentation',
        subtitle: 'Context-Free Grammar G for Expressions',
        content:
          "E → T E'\nE' → + T E' | ε\nT → F T'\nT' → * F T' | ε\nF → ( E ) | id",
        highlight: 'Eliminates left-recursion to enable deterministic top-down parsing.',
      },
      {
        title: 'Scene 2: FIRST and FOLLOW Sets',
        subtitle: 'Computing Lookahead Guidance',
        content:
          "FIRST(F) = FIRST(T) = FIRST(E) = { (, id }\nFIRST(T') = { *, ε }\nFIRST(E') = { +, ε }\n\nFOLLOW(E) = FOLLOW(E') = { ), $ }\nFOLLOW(T) = FOLLOW(T') = { +, ), $ }\nFOLLOW(F) = { *, +, ), $ }",
        highlight: 'FOLLOW sets guide epsilon productions in table construction.',
      },
      {
        title: 'Scene 3: Predictive Table M[A, a]',
        subtitle: 'Conflict-Free Deterministic Mapping',
        content:
          "M[E, id] = E → T E'\nM[E', +] = E' → + T E'\nM[E', $] = E' → ε\nM[T, id] = T → F T'\nM[T', *] = T' → * F T'\nM[T', +] = T' → ε\nM[F, id] = F → id",
        highlight: 'Every cell contains at most ONE production rule (Proof that G is LL(1)).',
      },
      {
        title: 'Scene 4: Stack Simulation for id + id * id',
        subtitle: 'Step-by-step Consumption & Derivation',
        content:
          "Stack: [$, E]           Input: id + id * id $\nStack: [$, E', T]       Input: id + id * id $\nStack: [$, E', T', F]   Input: id + id * id $\nStack: [$, E', T', id]  Input: id + id * id $ (Matched id!)\nStack: [$, E', T']      Input: + id * id $    (T' -> ε applied)",
        highlight: 'Top of stack drives expansion until terminal matches current input token.',
      },
      {
        title: 'Scene 5: Final Acceptance',
        subtitle: 'Leftmost Derivation Verified',
        content: 'Stack: [$]             Input: $\n\nSTATUS: ACCEPTED with 0 Syntax Errors!',
        highlight: 'String parsed successfully into AST representation.',
      },
    ],
  },
  {
    id: 'lr1',
    title: 'Lesson 2: Canonical LR(1) Parsing',
    subtitle: 'Bottom-Up Parsing, LR(1) Items, and Shift-Reduce Automaton',
    scriptPath: 'animations/lr1_parsing.py',
    sceneName: 'LR1ParsingScene',
    duration: '4:15 min',
    grammar: "S' -> E | E -> T E' | E' -> + T E' | ε | T -> F T' | T' -> * F T' | ε | F -> ( E ) | id",
    input: 'id + id * id',
    keyTopics: [
      'Bottom-up parsing and reverse rightmost derivation',
      'Structure of LR(1) items [A -> α • β, a]',
      'CLOSURE operation and lookahead propagation',
      'GOTO transitions across terminal and non-terminal symbols',
      'ACTION (shift/reduce/acc) and GOTO table generation',
    ],
    renderCommand:
      'manim -pql animations/lr1_parsing.py LR1ParsingScene -o ../public/videos/lr1_parsing.mp4',
    videoSrc: '/videos/lr1_parsing.mp4',
    frames: [
      {
        title: 'Scene 1: Augmented Grammar & Item Definition',
        subtitle: 'Progress Marker & Lookahead',
        content:
          "Augmented Rule: S' → E\n\nLR(1) Item: [A → α • β, a]\n• Indicates how much of RHS has been parsed\na indicates valid lookahead terminal",
        highlight: 'Augmenting prevents premature acceptance in state machine.',
      },
      {
        title: 'Scene 2: CLOSURE & GOTO Algorithms',
        subtitle: 'State Discovery Functions',
        content:
          'CLOSURE(I):\nIf [A → α • B β, a] ∈ I:\n  Add [B → • γ, b] for each b ∈ FIRST(β a)\n\nGOTO(I, X):\nShift dot over symbol X and compute CLOSURE of resulting items.',
        highlight: 'Computes complete canonical collection of states I0 .. In.',
      },
      {
        title: 'Scene 3: Shift-Reduce Table Rules',
        subtitle: 'ACTION and GOTO Matrix',
        content:
          '1. [A → α • a β, b] in I_i and GOTO(I_i, a) = I_j  ==> ACTION[i, a] = shift j\n2. [A → α •, a] in I_i (A != S\')                  ==> ACTION[i, a] = reduce A → α\n3. [S\' → E •, $] in I_i                           ==> ACTION[i, $] = accept\n4. GOTO(I_i, A) = I_j                             ==> GOTO[i, A] = j',
        highlight: 'Canonical LR(1) handles larger grammar classes without merge conflicts.',
      },
      {
        title: 'Scene 4: Shift-Reduce Simulation on id + id * id',
        subtitle: 'Bottom-Up Handle Pruning',
        content:
          'State Stack: [0]               Symbols: [$]            Input: id + id * id $\nShift id (State I5)           Symbols: [$, id]        Input: + id * id $\nReduce F → id (State I3)      Symbols: [$, F]         Input: + id * id $\nReduce T → F T\' (State I2)    Symbols: [$, T]         Input: + id * id $\nShift +                       Symbols: [$, T, +]      Input: id * id $',
        highlight: 'Reductions replace RHS handles with LHS non-terminals.',
      },
      {
        title: 'Scene 5: String Accepted',
        subtitle: 'Reconstructed Rightmost Derivation in Reverse',
        content: 'State Stack: [0, 1]          Symbols: [$, E]         Input: $\n\nACTION: ACCEPT!',
        highlight: 'Expression verified and parse tree root node generated.',
      },
    ],
  },
];

export const AnimatedLessonsPage: React.FC = () => {
  const [activeLessonId, setActiveLessonId] = useState('ll1');
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);

  const lesson = LESSONS.find((l) => l.id === activeLessonId) || LESSONS[0];
  const frame = lesson.frames[activeFrameIdx] || lesson.frames[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono mb-1">
          <Video className="w-4 h-4" />
          <span>Manim Community Edition Python Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Animated Parsing Lessons</h1>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Visual educational animations authored using <strong>Manim Community Edition</strong>.
          Explore the interactive animated walkthrough below or render high-resolution 1080p
          MP4 videos using the provided Python scripts.
        </p>
      </div>

      {/* Lesson Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LESSONS.map((l) => (
          <button
            key={l.id}
            onClick={() => {
              setActiveLessonId(l.id);
              setActiveFrameIdx(0);
            }}
            className={`p-5 rounded-2xl border text-left transition-all ${
              activeLessonId === l.id
                ? 'bg-surface-elevated border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                : 'bg-surface border-border hover:bg-surface-elevated/60 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/80">
              <span className="text-xs font-mono font-bold text-emerald-400">{l.id.toUpperCase()} MODULE</span>
              <span className="text-[11px] font-mono text-slate-500 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{l.duration}</span>
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">{l.title}</h3>
            <p className="text-xs text-slate-300">{l.subtitle}</p>
          </button>
        ))}
      </div>

      {/* Interactive Web-Based Animated Player Card */}
      <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-border bg-surface-elevated/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white font-mono">
              Live Animated Scene Viewer: {lesson.title}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span>
              Scene {activeFrameIdx + 1} / {lesson.frames.length}
            </span>
          </div>
        </div>

        {/* Animated Presentation Screen */}
        <div className="p-8 min-h-[380px] bg-gradient-to-b from-slate-950 via-[#0a0d14] to-surface flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-white">{frame.title}</h2>
                <p className="text-xs text-emerald-400 font-mono mt-0.5">{frame.subtitle}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono">
                Frame 0{activeFrameIdx + 1}
              </span>
            </div>

            <div className="p-5 bg-surface/80 rounded-2xl border border-border/80 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre overflow-x-auto">
              {frame.content}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-border/60">
            <div className="text-xs text-cyan-300 font-mono flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{frame.highlight}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveFrameIdx(Math.max(0, activeFrameIdx - 1))}
                disabled={activeFrameIdx === 0}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
              >
                Previous Scene
              </button>
              <button
                onClick={() =>
                  setActiveFrameIdx(Math.min(lesson.frames.length - 1, activeFrameIdx + 1))
                }
                disabled={activeFrameIdx === lesson.frames.length - 1}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-40 transition-colors"
              >
                Next Scene
              </button>
            </div>
          </div>
        </div>

        {/* Scene Navigation Strip */}
        <div className="p-3 bg-surface-elevated/40 border-t border-border flex items-center space-x-2 overflow-x-auto">
          {lesson.frames.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveFrameIdx(i)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all ${
                i === activeFrameIdx
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-surface text-slate-400 hover:text-white border border-border'
              }`}
            >
              Scene {i + 1}: {f.title.split(':')[1]?.trim() || f.title}
            </button>
          ))}
        </div>
      </div>

      {/* Manim Community Python Script & Local Rendering Guide */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center space-x-2 text-white font-bold text-sm">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Local Python Manim Rendering Guide</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Both animations are implemented as complete, self-contained Python scripts adhering to
          Manim Community Edition standards. You can render native high-definition MP4 videos
          directly to your computer using your terminal.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-elevated/40 p-4 rounded-xl border border-border space-y-2">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">
              Script Location
            </span>
            <div className="font-mono text-xs text-emerald-300 font-bold">{lesson.scriptPath}</div>
            <div className="text-[11px] text-slate-400">Class: {lesson.sceneName}</div>
          </div>

          <div className="bg-surface-elevated/40 p-4 rounded-xl border border-border space-y-2">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">
              Exact Terminal Command
            </span>
            <div className="font-mono text-xs text-cyan-300 bg-surface p-2.5 rounded-lg border border-border overflow-x-auto">
              {lesson.renderCommand}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-elevated border border-border text-xs text-slate-400 flex items-center space-x-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Requirement:</strong> Python 3.9+ with <code>pip install manim</code> and{' '}
            <code>ffmpeg</code> installed. Rendered output is automatically saved to{' '}
            <code>public/videos/</code>.
          </span>
        </div>
      </div>
    </div>
  );
};
