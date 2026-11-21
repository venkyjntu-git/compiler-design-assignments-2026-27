import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Binary,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  ArrowRight,
} from 'lucide-react';
import { LL1Engine, ParsingStep } from '../parsing/ll1/ll1Engine';

export const LL1VisualizerPage: React.FC = () => {
  const [engine] = useState(() => new LL1Engine());
  const [inputString, setInputString] = useState('id + id * id');
  const [steps, setSteps] = useState<ParsingStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(800); // ms
  const [parseSuccess, setParseSuccess] = useState(true);
  const [parseError, setParseError] = useState<string | undefined>(undefined);

  const fullAnalysis = engine.getFullAnalysis();

  // Re-run parsing simulation when inputString changes
  const runSimulation = () => {
    const tokens = engine.tokenizeInput(inputString);
    const res = engine.parse(tokens);
    setSteps(res.steps);
    setCurrentStepIdx(0);
    setIsPlaying(false);
    setParseSuccess(res.success);
    setParseError(res.error);
  };

  useEffect(() => {
    runSimulation();
  }, [inputString]);

  // Autoplay timer
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, playSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, steps.length, playSpeed]);

  const currentStep = steps[currentStepIdx] || steps[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Title & Introduction Banner */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono mb-1">
            <Binary className="w-4 h-4" />
            <span>Top-Down Leftmost Derivation Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white">LL(1) Predictive Parsing Visualizer</h1>
          <p className="text-xs text-slate-300 leading-relaxed mt-1 max-w-2xl">
            Simulates a non-recursive predictive parser. At each step, the parser consults the top
            of the stack and the next input token to apply unique grammar productions without
            backtracking.
          </p>
        </div>

        {/* Input String Selector */}
        <div className="flex items-center space-x-2 bg-surface-elevated p-2 rounded-xl border border-border">
          <span className="text-xs font-mono text-slate-400">Input:</span>
          <input
            type="text"
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 w-48"
          />
          <button
            onClick={runSimulation}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
          >
            Parse
          </button>
        </div>
      </div>

      {/* Grammar, FIRST, FOLLOW and M-Table Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Grammar */}
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
          <div className="text-xs font-bold text-white pb-2 border-b border-border flex items-center justify-between">
            <span>Grammar Productions</span>
            <span className="text-[10px] font-mono text-cyan-400">LL(1) Certified</span>
          </div>
          <div className="font-mono text-xs space-y-1.5 text-slate-300">
            {fullAnalysis.productions.map((p) => (
              <div key={p.id} className="p-1.5 rounded bg-surface-elevated/40 border border-border/60">
                <span className="text-slate-500 mr-2">[{p.id}]</span>
                <span className="font-semibold text-cyan-300">{p.lhs}</span>
                <span className="text-slate-400"> → </span>
                <span className="text-slate-200">{p.rhs.join(' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: FIRST and FOLLOW Sets */}
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
          <div className="text-xs font-bold text-white pb-2 border-b border-border flex items-center justify-between">
            <span>FIRST &amp; FOLLOW Sets</span>
            <span className="text-[10px] font-mono text-slate-500">Fixed Point Computation</span>
          </div>
          <div className="space-y-2 font-mono text-xs">
            {fullAnalysis.nonTerminals.map((nt) => (
              <div key={nt} className="p-2 rounded bg-surface-elevated/40 border border-border/60 space-y-1">
                <div className="font-bold text-primary-300">{nt}</div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-emerald-400">FIRST({nt}):</span>{' '}
                  &#123; {fullAnalysis.firstSets[nt]?.join(', ')} &#125;
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-purple-400">FOLLOW({nt}):</span>{' '}
                  &#123; {fullAnalysis.followSets[nt]?.join(', ')} &#125;
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: LL(1) Table Overview */}
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-3 overflow-x-auto">
          <div className="text-xs font-bold text-white pb-2 border-b border-border flex items-center justify-between">
            <span>Predictive Table M[A, a]</span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>0 Conflicts</span>
            </span>
          </div>
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-border text-slate-400">
                <th className="p-1">NT</th>
                {fullAnalysis.terminals.map((t) => (
                  <th key={t} className="p-1 text-center font-bold text-cyan-300">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {fullAnalysis.nonTerminals.map((nt) => (
                <tr key={nt} className="hover:bg-surface-elevated/40">
                  <td className="p-1 font-bold text-primary-300">{nt}</td>
                  {fullAnalysis.terminals.map((t) => {
                    const prod = fullAnalysis.parsingTable.table[nt]?.[t];
                    return (
                      <td key={t} className="p-1 text-center text-[10px] text-slate-300">
                        {prod ? prod.rhs.join('') : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Stack Simulation Player */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xl">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-border bg-surface-elevated/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentStepIdx(0)}
              className="p-2 rounded-xl bg-surface hover:bg-slate-800 border border-border text-slate-300"
              title="Reset to Step 1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentStepIdx(Math.max(0, currentStepIdx - 1))}
              disabled={currentStepIdx === 0}
              className="p-2 rounded-xl bg-surface hover:bg-slate-800 border border-border text-slate-300 disabled:opacity-40"
              title="Step Backward"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={() => setCurrentStepIdx(Math.min(steps.length - 1, currentStepIdx + 1))}
              disabled={currentStepIdx === steps.length - 1}
              className="p-2 rounded-xl bg-surface hover:bg-slate-800 border border-border text-slate-300 disabled:opacity-40"
              title="Step Forward"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <span className="text-slate-400">
              Step <strong className="text-white">{currentStepIdx + 1}</strong> of{' '}
              <strong className="text-slate-300">{steps.length}</strong>
            </span>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Speed:</span>
              <select
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="bg-surface border border-border rounded-lg px-2 py-1 text-slate-300 text-xs"
              >
                <option value={1200}>0.5x</option>
                <option value={800}>1.0x</option>
                <option value={400}>2.0x</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Simulation Display */}
        {currentStep && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            {/* Parser Stack */}
            <div className="bg-surface-elevated/30 border border-border rounded-xl p-4 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Parsing Stack</span>
                <span className="text-cyan-400">Top → Right</span>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-border/80 flex flex-wrap gap-1.5 min-h-[48px] items-center">
                {currentStep.stack.map((sym, i) => (
                  <span
                    key={i}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      i === currentStep.stack.length - 1
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 scale-105'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {sym}
                  </span>
                ))}
              </div>
            </div>

            {/* Input Buffer */}
            <div className="bg-surface-elevated/30 border border-border rounded-xl p-4 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Remaining Input Buffer</span>
                <span className="text-emerald-400">Next → Left</span>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-border/80 flex flex-wrap gap-1.5 min-h-[48px] items-center">
                {currentStep.remainingInput.map((sym, i) => (
                  <span
                    key={i}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      i === 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 scale-105'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {sym}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Card */}
            <div className="bg-surface-elevated/30 border border-border rounded-xl p-4 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Parser Action
              </div>
              <div
                className={`p-3 rounded-xl border min-h-[48px] flex items-center text-xs leading-relaxed ${
                  currentStep.status === 'accepted'
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 font-bold'
                    : currentStep.status === 'error'
                    ? 'bg-rose-950/60 border-rose-700 text-rose-300 font-bold'
                    : 'bg-surface border-border/80 text-slate-200'
                }`}
              >
                {currentStep.action}
              </div>
            </div>
          </div>
        )}

        {/* Step-by-Step History Log Table */}
        <div className="border-t border-border max-h-64 overflow-y-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead className="bg-surface-elevated sticky top-0 text-[11px] uppercase tracking-wider text-slate-400 border-b border-border">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Step</th>
                <th className="py-2.5 px-4 font-semibold">Stack Contents</th>
                <th className="py-2.5 px-4 font-semibold">Remaining Input</th>
                <th className="py-2.5 px-4 font-semibold">Action Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {steps.map((st, idx) => (
                <tr
                  key={st.step}
                  onClick={() => setCurrentStepIdx(idx)}
                  className={`cursor-pointer transition-colors ${
                    idx === currentStepIdx
                      ? 'bg-cyan-950/50 border-l-2 border-cyan-400 text-white font-bold'
                      : 'hover:bg-surface-elevated/30 text-slate-300'
                  }`}
                >
                  <td className="py-2 px-4 text-slate-500">{st.step}</td>
                  <td className="py-2 px-4 text-cyan-300">[{st.stack.join(', ')}]</td>
                  <td className="py-2 px-4 text-emerald-300">{st.remainingInput.join(' ')}</td>
                  <td className="py-2 px-4">{st.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
