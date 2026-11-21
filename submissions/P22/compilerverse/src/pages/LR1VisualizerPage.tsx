import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  GitCommit,
} from 'lucide-react';
import { LR1Engine, LR1ParsingStep, StateItemSet } from '../parsing/lr1/lr1Engine';

export const LR1VisualizerPage: React.FC = () => {
  const [engine] = useState(() => new LR1Engine());
  const [inputString, setInputString] = useState('id + id * id');
  const [steps, setSteps] = useState<LR1ParsingStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(800);
  const [selectedStateId, setSelectedStateId] = useState(0);

  const lr1Result = engine.buildTables();

  const runSimulation = () => {
    const tokens = ['id', '+', 'id', '*', 'id']; // default input tokens
    // Simple tokenizer for inputString
    const userTokens: string[] = [];
    const raw = inputString.trim().split(/\s+/);
    for (const piece of raw) {
      if (piece === '+' || piece === '*' || piece === '(' || piece === ')' || piece === 'id') {
        userTokens.push(piece);
      } else if (piece.length > 0) {
        userTokens.push('id');
      }
    }

    const res = engine.parse(userTokens.length > 0 ? userTokens : tokens);
    setSteps(res.steps);
    setCurrentStepIdx(0);
    setIsPlaying(false);
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
  const currentStateSet = lr1Result.states[selectedStateId] || lr1Result.states[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Title & Introduction Banner */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-mono mb-1">
            <Cpu className="w-4 h-4" />
            <span>Canonical LR(1) Bottom-Up Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Canonical LR(1) Parser Visualizer</h1>
          <p className="text-xs text-slate-300 leading-relaxed mt-1 max-w-2xl">
            Algorithmic bottom-up parser generator. Constructs LR(1) item sets via CLOSURE and
            GOTO, generates ACTION and GOTO tables, and performs shift-reduce parsing tracing
            rightmost derivation in reverse.
          </p>
        </div>

        {/* Input String Selector */}
        <div className="flex items-center space-x-2 bg-surface-elevated p-2 rounded-xl border border-border">
          <span className="text-xs font-mono text-slate-400">Tokens:</span>
          <input
            type="text"
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500 w-48"
          />
          <button
            onClick={runSimulation}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
          >
            Parse
          </button>
        </div>
      </div>

      {/* Item Sets Explorer & Transitions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* State Item Sets Selector List */}
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
          <div className="text-xs font-bold text-white pb-2 border-b border-border flex items-center justify-between">
            <span>Canonical Item Sets (I0 .. I{lr1Result.states.length - 1})</span>
            <span className="text-[10px] font-mono text-purple-400">
              {lr1Result.states.length} States
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-xs pr-1">
            {lr1Result.states.map((st) => (
              <button
                key={st.stateId}
                onClick={() => setSelectedStateId(st.stateId)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left border transition-all ${
                  selectedStateId === st.stateId
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold'
                    : 'bg-surface-elevated/40 border-border/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>State I{st.stateId}</span>
                <span className="text-[10px] text-slate-500">{st.items.length} items</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected State Items Detail */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border p-4 space-y-3">
          <div className="text-xs font-bold text-white pb-2 border-b border-border flex items-center justify-between">
            <span>State I{currentStateSet.stateId} Detailed Items &amp; Transitions</span>
            <span className="text-[10px] font-mono text-emerald-400">CLOSURE Computed</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LR(1) Items in this state */}
            <div className="space-y-1 font-mono text-xs max-h-56 overflow-y-auto">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                Items [A → α • β, a]
              </div>
              {currentStateSet.items.map((item, idx) => (
                <div key={idx} className="p-1.5 rounded bg-surface-elevated/60 border border-border/60 text-slate-200">
                  <span className="text-purple-400 font-bold">{item.lhs}</span>
                  <span className="text-slate-400"> → </span>
                  <span className="text-amber-300 font-semibold">
                    {item.rhs.slice(0, item.dotIndex).join(' ')}{' '}
                    <span className="text-white text-sm">•</span>{' '}
                    {item.rhs.slice(item.dotIndex).join(' ')}
                  </span>
                  <span className="text-cyan-400 font-mono ml-2">, {item.lookahead}</span>
                </div>
              ))}
            </div>

            {/* GOTO Transitions out of this state */}
            <div className="space-y-1 font-mono text-xs max-h-56 overflow-y-auto">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                GOTO Transitions
              </div>
              {Object.keys(currentStateSet.transitions).length > 0 ? (
                Object.entries(currentStateSet.transitions).map(([sym, targetState]) => (
                  <div
                    key={sym}
                    onClick={() => setSelectedStateId(targetState)}
                    className="p-1.5 rounded bg-surface-elevated/60 border border-border/60 flex items-center justify-between cursor-pointer hover:border-purple-500 transition-colors"
                  >
                    <span className="text-slate-300">
                      On <strong className="text-cyan-300">{sym}</strong>
                    </span>
                    <span className="text-purple-400 font-bold flex items-center space-x-1">
                      <span>Goto I{targetState}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-xs italic py-4 text-center">
                  No outgoing transitions (Complete state)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive LR(1) Shift-Reduce Simulation */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xl">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-border bg-surface-elevated/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentStepIdx(0)}
              className="p-2 rounded-xl bg-surface hover:bg-slate-800 border border-border text-slate-300"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentStepIdx(Math.max(0, currentStepIdx - 1))}
              disabled={currentStepIdx === 0}
              className="p-2 rounded-xl bg-surface hover:bg-slate-800 border border-border text-slate-300 disabled:opacity-40"
              title="Prev"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-all"
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
              title="Next"
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

        {/* Live Simulation Cards */}
        {currentStep && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
            {/* States Stack */}
            <div className="bg-surface-elevated/30 border border-border rounded-xl p-3 space-y-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">State Stack</div>
              <div className="p-2.5 bg-surface rounded-lg border border-border/80 flex flex-wrap gap-1 min-h-[42px] items-center">
                {currentStep.stateStack.map((st, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-[11px] font-bold"
                  >
                    I{st}
                  </span>
                ))}
              </div>
            </div>

            {/* Symbols Stack */}
            <div className="bg-surface-elevated/30 border border-border rounded-xl p-3 space-y-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Symbol Stack</div>
              <div className="p-2.5 bg-surface rounded-lg border border-border/80 flex flex-wrap gap-1 min-h-[42px] items-center">
                {currentStep.symbolStack.map((sym, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-[11px] font-bold"
                  >
                    {sym}
                  </span>
                ))}
              </div>
            </div>

            {/* Remaining Input */}
            <div className="bg-surface-elevated/30 border border-border rounded-xl p-3 space-y-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Input Buffer</div>
              <div className="p-2.5 bg-surface rounded-lg border border-border/80 flex flex-wrap gap-1 min-h-[42px] items-center text-emerald-300 font-bold">
                {currentStep.remainingInput.join(' ')}
              </div>
            </div>

            {/* Action */}
            <div className="bg-surface-elevated/30 border border-border rounded-xl p-3 space-y-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Action</div>
              <div
                className={`p-2.5 rounded-lg border min-h-[42px] flex items-center text-xs ${
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

        {/* History Trace Table */}
        <div className="border-t border-border max-h-64 overflow-y-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead className="bg-surface-elevated sticky top-0 text-[11px] uppercase tracking-wider text-slate-400 border-b border-border">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Step</th>
                <th className="py-2.5 px-4 font-semibold">State Stack</th>
                <th className="py-2.5 px-4 font-semibold">Symbol Stack</th>
                <th className="py-2.5 px-4 font-semibold">Input Buffer</th>
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
                      ? 'bg-purple-950/50 border-l-2 border-purple-400 text-white font-bold'
                      : 'hover:bg-surface-elevated/30 text-slate-300'
                  }`}
                >
                  <td className="py-2 px-4 text-slate-500">{st.step}</td>
                  <td className="py-2 px-4 text-purple-300 font-bold">
                    {st.stateStack.map((s) => `I${s}`).join(' ')}
                  </td>
                  <td className="py-2 px-4 text-cyan-300 font-bold">{st.symbolStack.join(' ')}</td>
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
