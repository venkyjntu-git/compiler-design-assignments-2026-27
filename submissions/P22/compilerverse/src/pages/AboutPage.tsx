import React from 'react';
import {
  Info,
  ShieldCheck,
  CheckCircle2,
  FileCode2,
  Binary,
  Layers,
  Cpu,
  Award,
  Video,
  ExternalLink,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="bg-surface rounded-3xl border border-border p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary-950 border border-primary-800 text-primary-300 text-xs font-mono">
          <Info className="w-3.5 h-3.5" />
          <span>Academic Assignment Specification</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">About CompilerVerse</h1>
        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
          CompilerVerse is a modern visual educational platform engineered for 3rd-Year B.Tech
          Computer Science students. Designed under <strong>Problem 22 (Track F: Visual and Educational Compiler Tooling)</strong>,
          it transforms theoretical compiler concepts into an interactive, observable experience.
        </p>
      </div>

      {/* Track & Problem Specification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Problem Specification</span>
          </h2>
          <div className="space-y-2 text-slate-300 font-mono text-[11px]">
            <div><strong>Problem Number:</strong> 22</div>
            <div><strong>Track:</strong> F – Visual and Educational Compiler Tooling</div>
            <div><strong>Course:</strong> Compiler Design (B.Tech Computer Science Year 3)</div>
            <div><strong>Paradigm:</strong> Zero External Compiler Dependencies (Pure TypeScript Engine)</div>
            <div><strong>Storage:</strong> Offline LocalStorage (No Paid APIs or Backend Server)</div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Core Objectives Achieved</span>
          </h2>
          <ul className="space-y-1.5 text-slate-300">
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Deterministic 7-phase compilation pipeline with source span linking</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Genuine FIRST &amp; FOLLOW sets and conflict-free LL(1) parsing</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Canonical LR(1) items, CLOSURE, GOTO, and Shift-Reduce trace</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Runnable Manim Community Edition Python scripts with video cards</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Adaptive Quiz engine with streak difficulty scaling</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Academic Integrity & Usability Testing Note */}
      <div className="p-6 rounded-2xl bg-surface-elevated/40 border border-border space-y-3">
        <div className="flex items-center space-x-2 text-primary-300 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-primary-400" />
          <span>Academic Integrity &amp; Usability Evaluation Protocol</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          In strict accordance with academic guidelines, all compiler and parsing outputs are
          computed algorithmically at runtime. No artificial delays, fake outputs, or fabricated
          user scores are presented.
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          The complete usability testing protocol featuring five anonymous classmate study rows,
          pre-test/post-test quizzes, and normalized learning gain calculation
          <code>(Post - Pre) / (Max - Pre) * 100%</code> is documented in
          <code className="text-cyan-300 mx-1">docs/usability-test.md</code> ready for live evaluation.
        </p>
      </div>

      {/* Technology Stack Table */}
      <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <h2 className="text-sm font-bold text-white">Technology Stack</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-surface-elevated rounded-xl border border-border">
            <span className="text-[10px] text-slate-500 uppercase block">Frontend</span>
            <span className="text-white font-bold">React 18 &amp; TypeScript</span>
          </div>
          <div className="p-3 bg-surface-elevated rounded-xl border border-border">
            <span className="text-[10px] text-slate-500 uppercase block">Bundler</span>
            <span className="text-white font-bold">Vite 5</span>
          </div>
          <div className="p-3 bg-surface-elevated rounded-xl border border-border">
            <span className="text-[10px] text-slate-500 uppercase block">Styling</span>
            <span className="text-white font-bold">Tailwind CSS</span>
          </div>
          <div className="p-3 bg-surface-elevated rounded-xl border border-border">
            <span className="text-[10px] text-slate-500 uppercase block">Animations</span>
            <span className="text-white font-bold">Python Manim (CE)</span>
          </div>
          <div className="p-3 bg-surface-elevated rounded-xl border border-border">
            <span className="text-[10px] text-slate-500 uppercase block">Test Framework</span>
            <span className="text-white font-bold">Vitest 2.1</span>
          </div>
          <div className="p-3 bg-surface-elevated rounded-xl border border-border">
            <span className="text-[10px] text-slate-500 uppercase block">Icons</span>
            <span className="text-white font-bold">Lucide React</span>
          </div>
          <div className="p-3 bg-surface-elevated rounded-xl border border-border">
            <span className="text-[10px] text-slate-500 uppercase block">Persistence</span>
            <span className="text-white font-bold">Web LocalStorage</span>
          </div>
          <div className="p-3 bg-surface-elevated rounded-xl border border-border">
            <span className="text-[10px] text-slate-500 uppercase block">Deployment</span>
            <span className="text-white font-bold">Vercel Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
