import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Workflow,
  Play,
  RotateCcw,
  Trash2,
  GitBranch,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle2,
  Info,
  Sun,
  Moon,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  FileCode,
  Layers,
  GraduationCap,
  PlayCircle,
  PauseCircle,
  Zap,
  CheckCheck,
  ListOrdered,
  X
} from 'lucide-react';

import CFGCanvas from './components/graph/CFGCanvas';
import { useAnalysis } from './hooks/useAnalysis';

export default function App() {
  const {
    code,
    setCode,
    samples,
    selectedSampleId,
    selectSample,
    isServerHealthy,
    activeEngine,
    isAnalyzing,
    error,
    toast,
    showToast,
    analysisData,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    runAnalysis,
    resetCode,
    clearCode,
  } = useAnalysis();

  // Theme: 'dark' (default) or 'light'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('cfg_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cfg_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // View Mode: 'split' | 'graph' | 'table' | 'tac'
  const [rightViewMode, setRightViewMode] = useState('split');
  const [tableFilter, setTableFilter] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const SNIPPETS = [
    { label: '+ If-Else', code: 'if (x > 0) {\n    y = x + 1;\n} else {\n    y = x - 1;\n}' },
    { label: '+ While Loop', code: 'while (i < 5) {\n    sum = sum + i;\n    i = i + 1;\n}' },
    { label: '+ For Loop', code: 'for (int j = 0; j < 3; j++) {\n    total += j;\n}' },
    { label: '+ Redefinition (Kill)', code: 'x = 10;\ny = x * 2;\nx = 20;' },
    { label: '+ Common Expr (CSE)', code: 'u = (a + b) * 2;\nv = (a + b) * 2;' },
  ];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    showToast('Source code copied to clipboard!', 'success');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleInsertSnippet = (snippet) => {
    const newCode = code.trim() ? `${code.trim()}\n\n${snippet}` : snippet;
    setCode(newCode);
    runAnalysis(newCode);
    showToast('Code snippet inserted & analyzed!', 'success');
  };

  // Language Subset Selection
  const [selectedLanguageSubset, setSelectedLanguageSubset] = useState('c_subset');

  // Active Data-Flow Analysis Tab: 'rd' | 'lv' | 'ae'
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('rd');

  // Step scrubber state
  const [showIterationSteps, setShowIterationSteps] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000); // 1000ms

  // Viva modal open state
  const [isVivaModalOpen, setIsVivaModalOpen] = useState(false);

  // Copy buttons feedback
  const [copiedType, setCopiedType] = useState(null);

  const textareaRef = useRef(null);
  const lineGutterRef = useRef(null);
  const autoPlayTimerRef = useRef(null);

  const lines = code.split('\n');
  const lineCount = Math.max(1, lines.length);

  // Sync scroll between textarea and line gutter
  const handleEditorScroll = () => {
    if (textareaRef.current && lineGutterRef.current) {
      lineGutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard shortcut: Tab indents 4 spaces, Ctrl+Enter runs analysis
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runAnalysis(code);
    }
  };

  const handleSelectBlock = (blockOrId) => {
    if (!blockOrId) {
      setSelectedBlockId(null);
      return;
    }
    const bId = typeof blockOrId === 'string' ? blockOrId : blockOrId.id;
    setSelectedBlockId(bId);
  };

  // Active data-flow model data
  const currentAnalysis =
    activeAnalysisTab === 'rd'
      ? analysisData?.reaching_definitions
      : activeAnalysisTab === 'lv'
      ? analysisData?.live_variables
      : analysisData?.available_expressions;

  const steps = currentAnalysis?.steps || [];

  useEffect(() => {
    setCurrentStepIdx(0);
    setIsAutoPlaying(false);
  }, [analysisData, activeAnalysisTab]);

  // Auto-play scrubber logic
  useEffect(() => {
    if (isAutoPlaying && steps.length > 0) {
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= steps.length - 1) {
            setIsAutoPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    } else {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    }
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, steps.length, playSpeed]);

  // Synchronize scrubber block highlight with selected block
  useEffect(() => {
    if (showIterationSteps && steps[currentStepIdx]) {
      const stepBlock = steps[currentStepIdx].block_id;
      if (stepBlock && stepBlock !== 'ENTRY' && stepBlock !== 'EXIT') {
        setSelectedBlockId(stepBlock);
      }
    }
  }, [currentStepIdx, showIterationSteps, steps]);

  const blockGen = currentAnalysis?.block_gen || {};
  const blockKill = currentAnalysis?.block_kill || {};
  const finalIn = currentAnalysis?.final_in || {};
  const finalOut = currentAnalysis?.final_out || {};

  const sortedBlockIds = Object.keys(blockGen).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  const filteredBlockIds = sortedBlockIds.filter((bId) => {
    if (!tableFilter.trim()) return true;
    const q = tableFilter.toLowerCase();
    if (bId.toLowerCase().includes(q)) return true;
    const gen = (blockGen[bId] || []).join(' ').toLowerCase();
    const kill = (blockKill[bId] || []).join(' ').toLowerCase();
    const inS = (finalIn[bId] || []).join(' ').toLowerCase();
    const outS = (finalOut[bId] || []).join(' ').toLowerCase();
    return gen.includes(q) || kill.includes(q) || inS.includes(q) || outS.includes(q);
  });

  const renderSet = (items) => {
    if (!items || items.length === 0) {
      return <span className="empty-set-symbol">&#123;&#125;</span>;
    }
    const sorted = [...items].sort();
    return (
      <span className="set-chips-wrapper">
        {sorted.map((item) => (
          <span key={item} className="set-chip-item">
            {item}
          </span>
        ))}
      </span>
    );
  };

  // Plain-English beginner explanations tailored to active tab
  let analysisExplanation = '';
  if (activeAnalysisTab === 'rd') {
    analysisExplanation =
      'Reaching Definitions determines which variable definitions (dᵢ) may reach each basic block without being killed along an intervening path. GEN[B] contains definitions made inside B. KILL[B] contains older definitions overwritten in B. Because execution can follow any path, IN[B] is the union (∪) of OUT sets from all predecessor blocks. The transfer equation is: OUT[B] = GEN[B] ∪ (IN[B] - KILL[B]).';
  } else if (activeAnalysisTab === 'lv') {
    analysisExplanation =
      'Live Variables finds which variables hold values that may be read later along some future execution path before being redefined. USE[B] contains variables read before definition in B. DEF[B] contains variables assigned in B. Because Live Variables is a backward analysis, OUT[B] is the union (∪) of IN sets of all successor blocks. The transfer equation is: IN[B] = USE[B] ∪ (OUT[B] - DEF[B]).';
  } else if (activeAnalysisTab === 'ae') {
    analysisExplanation =
      'Available Expressions finds expressions whose computed values are guaranteed to be available on all paths reaching a block without being invalidated by operand updates. Because this is a must-analysis, an expression must reach through EVERY incoming path (using intersection ∩) to be in IN[B]. The transfer equation is: OUT[B] = GEN[B] ∪ (IN[B] - KILL[B]).';
  }

  // Dynamic explanation for "Why is this block connected here?"
  const getWhyConnectedText = (block) => {
    if (!block || !analysisData?.cfg?.edges) return '';
    const bId = block.id;
    const inEdges = analysisData.cfg.edges.filter((e) => e.target === bId);
    const outEdges = analysisData.cfg.edges.filter((e) => e.source === bId);

    const inReasons = inEdges.map((e) => {
      if (e.type === 'conditional_true') return `from ${e.source} when condition evaluates to True`;
      if (e.type === 'conditional_false') return `from ${e.source} when condition evaluates to False`;
      if (e.type === 'back_edge') return `from loop body ${e.source} (loop repeat)`;
      return `sequentially from ${e.source}`;
    });

    const outReasons = outEdges.map((e) => {
      if (e.type === 'conditional_true') return `to ${e.target} on True branch`;
      if (e.type === 'conditional_false') return `to ${e.target} on False branch`;
      if (e.type === 'back_edge') return `loops back to ${e.target}`;
      return `to ${e.target}`;
    });

    let text = '';
    if (inReasons.length > 0) {
      text += `Control flows into this block ${inReasons.join(', and ')}. `;
    } else {
      text += 'This is the initial entry point of the program. ';
    }

    if (outReasons.length > 0) {
      text += `After executing this block, control transitions ${outReasons.join(', or ')}.`;
    } else {
      text += 'Execution completes here and exits the program.';
    }

    return text;
  };

  // Dynamic semantic role description for selected block
  const getSemanticRoleDescription = (block) => {
    if (!block) return '';
    if (block.is_entry) return 'Program Entry Capsule: Starting boundary node of execution.';
    if (block.is_exit) return 'Program Exit Capsule: Termination boundary node where control leaves the program.';
    const isDecision = block.successors && block.successors.length > 1;
    const isMerge = block.predecessors && block.predecessors.length > 1;

    if (isDecision && isMerge) {
      return `Decision & Merge Block (${block.id}): Reconverges multiple control paths and evaluates branch conditions to split execution.`;
    }
    if (isDecision) {
      return `Conditional Decision Block (${block.id}): Contains a branch condition that splits execution into True and False paths.`;
    }
    if (isMerge) {
      return `Join / Merge Block (${block.id}): Confluence point where multiple alternative control paths reunite.`;
    }
    return `Sequential Basic Block (${block.id}): Group of straight-line instructions executed sequentially without branching in the middle.`;
  };

  // Export handlers
  const handleCopyMarkdown = () => {
    if (!currentAnalysis) return;
    const isLv = activeAnalysisTab === 'lv';
    const colGen = isLv ? 'USE[B]' : 'GEN[B]';
    const colKill = isLv ? 'DEF[B]' : 'KILL[B]';
    let md = `### ${currentAnalysis.analysis_type} — Data-Flow Results\n\n`;
    md += `| Block | ${colGen} | ${colKill} | IN[B] | OUT[B] |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const bId of sortedBlockIds) {
      const g = (blockGen[bId] || []).length > 0 ? `{${blockGen[bId].join(', ')}}` : '∅';
      const k = (blockKill[bId] || []).length > 0 ? `{${blockKill[bId].join(', ')}}` : '∅';
      const i = (finalIn[bId] || []).length > 0 ? `{${finalIn[bId].join(', ')}}` : '∅';
      const o = (finalOut[bId] || []).length > 0 ? `{${finalOut[bId].join(', ')}}` : '∅';
      md += `| **${bId}** | \`${g}\` | \`${k}\` | \`${i}\` | \`${o}\` |\n`;
    }
    navigator.clipboard.writeText(md);
    setCopiedType('markdown');
    showToast('Copied Markdown table to clipboard!', 'success');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyLatex = () => {
    if (!currentAnalysis) return;
    const isLv = activeAnalysisTab === 'lv';
    const colGen = isLv ? 'USE[B]' : 'GEN[B]';
    const colKill = isLv ? 'DEF[B]' : 'KILL[B]';
    let tex = `% Generated by CFG & Data-Flow Analysis Framework\n`;
    tex += `\\begin{table}[htbp]\n\\centering\n`;
    tex += `\\caption{Canonical IN/OUT Results for ${currentAnalysis.analysis_type}}\n`;
    tex += `\\begin{tabular}{|c|c|c|c|c|}\n\\hline\n`;
    tex += `\\textbf{Block} & \\textbf{${colGen}} & \\textbf{${colKill}} & \\textbf{IN[B]} & \\textbf{OUT[B]} \\\\ \\hline\n`;
    for (const bId of sortedBlockIds) {
      const fmt = (items) => (items && items.length > 0 ? `\\{${items.join(', ')}\\}` : `\\emptyset`);
      tex += `${bId} & ${fmt(blockGen[bId])} & ${fmt(blockKill[bId])} & ${fmt(finalIn[bId])} & ${fmt(finalOut[bId])} \\\\ \\hline\n`;
    }
    tex += `\\end{tabular}\n\\end{table}\n`;
    navigator.clipboard.writeText(tex);
    setCopiedType('latex');
    showToast('Copied LaTeX table to clipboard!', 'success');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const userBlockCount = analysisData?.cfg?.blocks?.filter((b) => !b.is_entry && !b.is_exit).length || 0;
  const edgeCount = analysisData?.cfg?.edges?.length || 0;
  const allInstructions = analysisData?.cfg?.blocks?.flatMap((b) => b.instructions || []) || [];

  // Tracked count for results summary
  let trackedCount = 0;
  let trackedLabel = 'Definitions';
  if (activeAnalysisTab === 'rd') {
    trackedCount = currentAnalysis?.definitions_table?.length || 0;
    trackedLabel = 'Definitions';
  } else if (activeAnalysisTab === 'lv') {
    trackedCount = currentAnalysis?.universal_set?.length || 0;
    trackedLabel = 'Variables';
  } else if (activeAnalysisTab === 'ae') {
    trackedCount = currentAnalysis?.universal_set?.length || 0;
    trackedLabel = 'Expressions';
  }

  const optimizations = analysisData?.optimizations || [];

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`simple-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`} role="alert">
          {toast.type === 'error' ? <AlertCircle size={15} color="var(--accent-coral)" /> : <CheckCircle2 size={15} color="var(--accent-emerald)" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Header with Title, Theme Toggle, & Engine Status */}
      <header className="simple-header">
        <div className="header-brand">
          <div className="header-logo-icon">
            <Workflow size={22} />
          </div>
          <div className="header-title-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1>CFG &amp; Data-Flow Analysis Framework</h1>
              <span className="version-pill">v2.0 • Submission Ready</span>
            </div>
            <p>An interactive, educational compiler analysis platform for Control Flow Graphs and iterative data-flow algorithms.</p>
          </div>
        </div>

        <div className="header-right-tools">
          {/* Viva Theory Button */}
          <button
            className="btn btn-secondary header-btn"
            onClick={() => setIsVivaModalOpen(true)}
            title="Open Viva & Theory Guide (Definitions, Equations, Leader Rules)"
          >
            <GraduationCap size={15} color="var(--accent-purple)" />
            <span>Viva &amp; Theory Guide</span>
          </button>

          {/* Theme Toggle */}
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Light / Dark Theme">
            {theme === 'dark' ? <Sun size={14} color="var(--accent-amber)" /> : <Moon size={14} color="var(--accent-blue)" />}
            <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
          </button>

          {/* Dual Engine Indicator */}
          <div
            className={`header-status-badge ${isServerHealthy ? 'online' : 'client-engine'}`}
            title={
              isServerHealthy
                ? 'Connected to Python FastAPI compiler backend on port 8000'
                : 'Python backend offline; seamless In-Browser Client Compiler Engine is running active analysis!'
            }
          >
            <span className={`status-dot ${isServerHealthy ? 'dot-online' : 'dot-client'}`}></span>
            <span>
              {isServerHealthy ? 'Backend: FastAPI (Port 8000)' : 'Engine: In-Browser (Offline Mode)'}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Step Indicator Workflow Bar */}
      <nav className="workflow-stepper" aria-label="Workflow Steps">
        <div className={`step-item ${!analysisData ? 'active' : ''}`}>
          <span className="step-num">1</span>
          <span>Write Program</span>
        </div>
        <ChevronRight size={13} className="step-arrow" />
        <div className={`step-item ${analysisData ? 'active' : ''}`}>
          <span className="step-num">2</span>
          <span>Detect Leaders (Rules 1, 2, 3)</span>
        </div>
        <ChevronRight size={13} className="step-arrow" />
        <div className={`step-item ${analysisData ? 'active' : ''}`}>
          <span className="step-num">3</span>
          <span>Build CFG</span>
        </div>
        <ChevronRight size={13} className="step-arrow" />
        <div className={`step-item ${analysisData ? 'active' : ''}`}>
          <span className="step-num">4</span>
          <span>Solve Fixed-Point (RD / LV / AE)</span>
        </div>
        <ChevronRight size={13} className="step-arrow" />
        <div className={`step-item ${selectedBlock ? 'active' : ''}`}>
          <span className="step-num">5</span>
          <span>Inspect Results &amp; Optimize</span>
        </div>
      </nav>

      {/* 3. Beginner Glossary Strip */}
      <section className="glossary-strip" aria-label="Technical Terms Glossary">
        <div className="glossary-lead">
          <HelpCircle size={14} />
          <span>Quick Terms:</span>
        </div>
        <div className="glossary-items">
          <div className="glossary-pill" title="Control Flow Graph">
            <span className="glossary-term">CFG</span>: Graph of possible execution paths
          </div>
          <div className="glossary-pill" title="Basic Block">
            <span className="glossary-term">Basic Block</span>: Straight-line code sequence with 1 entry, 1 exit
          </div>
          <div className="glossary-pill" title="Leader Instruction">
            <span className="glossary-term">Leader</span>: First statement of a basic block (3AC partition)
          </div>
          <div className="glossary-pill" title="GEN Set">
            <span className="glossary-term">GEN</span>: Facts newly generated inside block
          </div>
          <div className="glossary-pill" title="KILL Set">
            <span className="glossary-term">KILL</span>: Facts invalidated by assignments
          </div>
          <div className="glossary-pill" title="IN Set">
            <span className="glossary-term">IN</span>: Facts entering block boundary
          </div>
          <div className="glossary-pill" title="OUT Set">
            <span className="glossary-term">OUT</span>: Facts leaving block boundary
          </div>
          <div className="glossary-pill" title="Fixed Point">
            <span className="glossary-term">Fixed Point</span>: Stable state where repeated iteration produces no changes
          </div>
        </div>
      </section>

      {/* Results Summary Strip (shown when analysis is computed) */}
      {analysisData && (
        <div className="summary-strip-card">
          <div className="summary-metrics-group">
            <div className="summary-metric-item">
              <span className="summary-metric-label">Basic Blocks</span>
              <span className="summary-metric-val">{userBlockCount}</span>
            </div>
            <div className="summary-metric-item">
              <span className="summary-metric-label">CFG Edges</span>
              <span className="summary-metric-val">{edgeCount}</span>
            </div>
            <div className="summary-metric-item">
              <span className="summary-metric-label">Tracked {trackedLabel}</span>
              <span className="summary-metric-val">{trackedCount}</span>
            </div>
            <div className="summary-metric-item">
              <span className="summary-metric-label">Iterations to Fixpoint</span>
              <span className="summary-metric-val" style={{ color: 'var(--accent-purple)' }}>
                {currentAnalysis?.total_iterations || 0}
              </span>
            </div>
            <div className="summary-metric-item">
              <span className="summary-metric-label">Convergence Status</span>
              <span className="summary-metric-val" style={{ color: 'var(--accent-emerald)' }}>
                Fixed Point Reached ✓
              </span>
            </div>
            <div className="summary-metric-item">
              <span className="summary-metric-label">Active Engine</span>
              <span className="summary-metric-val" style={{ color: 'var(--accent-blue)', fontSize: '0.8rem' }}>
                {activeEngine === 'backend' ? 'Python FastAPI' : 'In-Browser JS'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCopyMarkdown} title="Copy IN/OUT Table as Markdown">
              {copiedType === 'markdown' ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
              <span>Copy Markdown Table</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleCopyLatex} title="Copy IN/OUT Table as LaTeX tabular code">
              {copiedType === 'latex' ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
              <span>Copy LaTeX Table</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Main Two-Column Layout */}
      <main className="main-layout">
        {/* ================= LEFT COLUMN: SOURCE CODE EDITOR ================= */}
        <div className="editor-column">
          <div className="section-panel" id="write-program-section">
            <div className="panel-header">
              <div className="panel-title-group">
                <FileCode size={16} color="var(--accent-blue)" />
                <span className="panel-title">Source Code Editor</span>
                <span className="panel-subtitle">• C subset or TAC</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleCopyCode} title="Copy source code to clipboard">
                {codeCopied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                <span>{codeCopied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Controls Bar: Load Example + Language Subset + Action Buttons */}
            <div className="editor-controls-bar">
              <div className="picker-row">
                <label htmlFor="sample-dropdown" className="picker-label">Load Example:</label>
                <select
                  id="sample-dropdown"
                  className="sample-select"
                  value={selectedSampleId}
                  onChange={(e) => selectSample(e.target.value)}
                >
                  {samples.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="picker-row">
                <label htmlFor="lang-subset-select" className="picker-label">Grammar:</label>
                <select
                  id="lang-subset-select"
                  className="sample-select"
                  value={selectedLanguageSubset}
                  onChange={(e) => setSelectedLanguageSubset(e.target.value)}
                >
                  <option value="c_subset">C Subset (Assignments, If-Else, While/For Loops)</option>
                  <option value="c_main">C Function (`int main() &#123; ... &#125;`)</option>
                </select>
              </div>

              <div className="editor-btn-row">
                <button
                  className="btn btn-primary"
                  onClick={() => runAnalysis(code)}
                  disabled={isAnalyzing}
                  title="Analyze program (Ctrl + Enter)"
                >
                  <Play size={14} fill="currentColor" />
                  <span>{isAnalyzing ? 'Analyzing…' : 'Analyze Program'}</span>
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={resetCode}
                  title="Reset to current example template"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={clearCode}
                  title="Clear editor code"
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Quick Snippets Insertion Bar */}
            <div className="snippets-bar">
              <span className="snippets-label">Insert Snippet:</span>
              {SNIPPETS.map((s) => (
                <button
                  key={s.label}
                  className="snippet-chip"
                  onClick={() => handleInsertSnippet(s.code)}
                  title={`Insert ${s.label} into program and re-analyze`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Code Input Box with Line Numbers */}
            <div className="editor-box">
              <div className="editor-line-gutter" ref={lineGutterRef} aria-hidden="true">
                {Array.from({ length: lineCount }, (_, i) => {
                  const lineNum = i + 1;
                  const isErr = error && error.line === lineNum;
                  return (
                    <div key={lineNum} className={`gutter-num ${isErr ? 'error-line' : ''}`}>
                      {lineNum}
                    </div>
                  );
                })}
              </div>

              <textarea
                ref={textareaRef}
                className="editor-textarea-field"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={handleEditorScroll}
                onKeyDown={handleKeyDown}
                spellCheck="false"
                placeholder="Write or paste your C program here...
Example:
a = 10;
b = 20;
if (a < b) {
    c = a + b;
} else {
    c = a - b;
}"
              />
            </div>

            {/* Syntax Error Message Display */}
            {error && (
              <div className="syntax-error-card" role="alert">
                <div className="syntax-error-header">
                  <AlertCircle size={14} />
                  <span>
                    {error.error_type || 'Syntax Error'}
                    {error.line ? ` (Line ${error.line}${error.col ? `, Col ${error.col}` : ''})` : ''}
                  </span>
                </div>
                <div className="syntax-error-body">{error.message}</div>
              </div>
            )}

            {/* Status Footer */}
            <div className="editor-footer-status">
              <span>{lineCount} lines • {code.length} characters</span>
              <span>Shortcuts: <kbd>Ctrl+Enter</kbd> to analyze • <kbd>Tab</kbd> to indent</span>
            </div>
          </div>

          {/* Compiler Optimization Opportunities & Diagnostics */}
          {optimizations.length > 0 && (
            <div className="section-panel" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Sparkles size={16} color="var(--accent-amber)" />
                <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                  Compiler Optimization Diagnostics ({optimizations.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {optimizations.map((diag, idx) => {
                  const isCse = diag.type === 'cse_opportunity';
                  const isDead = diag.type === 'dead_assignment';
                  const badgeColor = isCse ? 'var(--accent-emerald)' : isDead ? 'var(--accent-amber)' : 'var(--accent-coral)';
                  const badgeLabel = isCse ? 'CSE Opportunity' : isDead ? 'Dead Code' : 'Uninitialized';

                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: `3px solid ${badgeColor}`,
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: '0.74rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: badgeColor }}>
                          {badgeLabel}
                        </span>
                        <span style={{ color: 'var(--text-dim)' }}>•</span>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Line {diag.line} ({diag.block})
                        </span>
                        <span style={{ color: 'var(--text-dim)' }}>•</span>
                        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>{diag.source}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{diag.message}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Help & Examples: Supported Language Features Guide */}
          <div className="syntax-guide-card" id="help-examples-section">
            <span className="syntax-guide-title">
              <Info size={14} color="var(--accent-blue)" />
              Supported Language Grammar:
            </span>
            <div className="syntax-guide-list">
              <div>• <strong>Assignments:</strong> <code>a = 10; b = 20; c = a + b;</code></div>
              <div>• <strong>Declarations:</strong> <code>int x = 5; int y;</code></div>
              <div>• <strong>Conditionals:</strong> <code>if (x &gt; 5) &#123; ... &#125; else &#123; ... &#125;</code></div>
              <div>• <strong>Loops:</strong> <code>while (i &lt; 5) &#123; ... &#125;</code> and <code>for (int i=0; i&lt;5; i++)</code></div>
              <div>• <strong>Operators:</strong> Arithmetic <code>+ - * / %</code>, Relational <code>== != &lt; &lt;= &gt; &gt;=</code>, Logical <code>&amp;&amp; || !</code></div>
              <div>• <strong>Functions:</strong> Formal C main (<code>int main() &#123; ... &#125;</code>) or top-level statements</div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: GRAPH, 3AC & DATA-FLOW RESULTS ================= */}
        <div className="results-column">
          {/* Section A: Control Flow Graph (CFG) / 3AC Toggle */}
          {(rightViewMode === 'split' || rightViewMode === 'graph' || rightViewMode === 'tac') && (
            <div className="section-panel" id="cfg-section">
              <div className="panel-header">
                <div className="panel-title-group">
                  <GitBranch size={16} color="var(--accent-blue)" />
                  <span className="panel-title">
                    {rightViewMode === 'tac' ? 'Three-Address Code (3AC) Quadruples' : 'Control Flow Graph (CFG)'}
                  </span>
                  <span className="panel-subtitle">
                    {rightViewMode === 'tac'
                      ? '• Linear intermediate code & leader rules'
                      : '• Interactive execution topology'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* View Switcher Toggle */}
                  <div className="view-mode-pill-toggle">
                    <button
                      className={`view-pill ${rightViewMode === 'split' ? 'active' : ''}`}
                      onClick={() => setRightViewMode('split')}
                      title="Show both Graph and Tables stacked"
                    >
                      <Layers size={12} />
                      <span>Split All</span>
                    </button>
                    <button
                      className={`view-pill ${rightViewMode === 'graph' ? 'active' : ''}`}
                      onClick={() => setRightViewMode('graph')}
                      title="Focus on CFG Canvas"
                    >
                      <GitBranch size={12} />
                      <span>Focus Graph</span>
                    </button>
                    <button
                      className={`view-pill ${rightViewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setRightViewMode('table')}
                      title="Focus on Data-Flow Results & Equations"
                    >
                      <Activity size={12} />
                      <span>Focus Table</span>
                    </button>
                    <button
                      className={`view-pill ${rightViewMode === 'tac' ? 'active' : ''}`}
                      onClick={() => setRightViewMode('tac')}
                      title="View Linear Three-Address Code listing"
                    >
                      <ListOrdered size={12} />
                      <span>3AC Quadruples</span>
                    </button>
                  </div>

                  {analysisData && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Blocks: <strong style={{ color: 'var(--accent-blue)' }}>{userBlockCount}</strong> | Edges: <strong>{edgeCount}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* View A: Visual Interactive Graph */}
              {rightViewMode !== 'tac' ? (
                <div className="cfg-panel-body" style={{ minHeight: rightViewMode === 'graph' ? 580 : 440 }}>
                  <CFGCanvas
                    cfgData={analysisData?.cfg}
                    selectedBlockId={selectedBlockId}
                    evaluatingBlockId={showIterationSteps && steps[currentStepIdx] ? steps[currentStepIdx].block_id : null}
                    onSelectBlock={handleSelectBlock}
                    onAnalyze={() => runAnalysis(code)}
                  />
                </div>
              ) : (
                /* View B: Linear Three-Address Code Table */
                <div style={{ padding: '16px', overflowX: 'auto', background: 'var(--bg-input)', minHeight: 400 }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Three-Address Code (3AC) instructions partitioned into basic blocks using <strong>Rule 1 (First statement)</strong>, <strong>Rule 2 (Target of jump)</strong>, and <strong>Rule 3 (Following jump)</strong>.
                  </div>
                  <table className="results-table" style={{ fontSize: '0.74rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 45 }}>#</th>
                        <th style={{ width: 75 }}>Leader</th>
                        <th>Instruction (3AC Quadruple)</th>
                        <th>Type</th>
                        <th>Original Source</th>
                        <th style={{ width: 70 }}>Block</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allInstructions.map((instr) => (
                        <tr key={instr.id} className={instr.is_leader ? 'leader-row-highlight' : ''}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{instr.id}</td>
                          <td>
                            {instr.is_leader ? (
                              <span className="leader-rule-pill" title={instr.leader_reason || 'Block Leader'}>
                                ★ Leader
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)' }}>—</span>
                            )}
                          </td>
                          <td>
                            <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>{instr.raw}</code>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{instr.type}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {instr.c_stmt ? `Line ${instr.c_line}: ${instr.c_stmt}` : '—'}
                          </td>
                          <td>
                            <button
                              className="conn-tag"
                              onClick={() => {
                                setRightViewMode('graph');
                                const blk = analysisData?.cfg?.blocks?.find((b) =>
                                  b.instructions?.some((i) => i.id === instr.id)
                                );
                                if (blk) handleSelectBlock(blk);
                              }}
                            >
                              {analysisData?.cfg?.blocks?.find((b) =>
                                b.instructions?.some((i) => i.id === instr.id)
                              )?.id || '—'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Beginner-Friendly Contextual Block Inspector */}
              {selectedBlock ? (
                <div className="selected-block-banner">
                  <div className="selected-block-header">
                    <div className="selected-block-title">
                      <span>Block {selectedBlock.id}</span>
                      <span style={{ fontSize: '0.68rem', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', padding: '1px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>
                        {selectedBlock.is_entry ? 'ENTRY' : selectedBlock.is_exit ? 'EXIT' : 'Basic Block'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Click any node in graph or table row to inspect
                    </span>
                  </div>

                  {/* Plain-English Semantic Role */}
                  <div className="block-semantic-role">
                    {getSemanticRoleDescription(selectedBlock)}
                  </div>

                  {/* Predecessors & Successors */}
                  <div className="selected-conn-row">
                    <div>
                      <span>Predecessor Blocks: </span>
                      <span className="conn-tags">
                        {selectedBlock.predecessors?.length > 0 ? (
                          selectedBlock.predecessors.map((p) => (
                            <button key={p} className="conn-tag" onClick={() => handleSelectBlock(p)}>
                              {p}
                            </button>
                          ))
                        ) : (
                          <span>None (Program Entry)</span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span>Successor Blocks: </span>
                      <span className="conn-tags">
                        {selectedBlock.successors?.length > 0 ? (
                          selectedBlock.successors.map((s) => (
                            <button key={s} className="conn-tag" onClick={() => handleSelectBlock(s)}>
                              {s}
                            </button>
                          ))
                        ) : (
                          <span>None (Program Exit)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* "Why is this block connected here?" */}
                  <div className="why-connected-box">
                    <span className="why-title">Why is this block connected here?</span>
                    <p className="why-text">{getWhyConnectedText(selectedBlock)}</p>
                  </div>

                  {/* Block Instructions with Leader Notation */}
                  {selectedBlock.instructions && selectedBlock.instructions.length > 0 && (
                    <div className="selected-instr-list">
                      {selectedBlock.instructions.map((instr) => (
                        <div key={instr.id} className="selected-instr-item">
                          {instr.is_leader ? (
                            <span className="leader-tag" title={instr.leader_reason || 'Leader instruction (entry point of basic block)'}>★</span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', width: 14 }}>{instr.id}</span>
                          )}
                          <code>{instr.raw}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '10px 16px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  Click any basic block node above or row in the table below to inspect its statements, predecessors, successors, and role.
                </div>
              )}
            </div>
          )}

          {/* Section B: Data-Flow Analysis Results */}
          {(rightViewMode === 'split' || rightViewMode === 'table') && (
            <div className="section-panel" id="dataflow-section">
              <div className="panel-header" style={{ padding: 0 }}>
              <div className="analysis-tabs-bar" style={{ width: '100%' }}>
                <button
                  className={`analysis-tab-btn ${activeAnalysisTab === 'rd' ? 'active' : ''}`}
                  onClick={() => setActiveAnalysisTab('rd')}
                >
                  <ArrowRight size={14} />
                  <span>Reaching Definitions</span>
                  <span className="tab-badge-dir">Forward ∪</span>
                </button>

                <button
                  className={`analysis-tab-btn ${activeAnalysisTab === 'lv' ? 'active' : ''}`}
                  onClick={() => setActiveAnalysisTab('lv')}
                >
                  <TrendingDown size={14} />
                  <span>Live Variables</span>
                  <span className="tab-badge-dir backward">Backward ∪</span>
                </button>

                <button
                  className={`analysis-tab-btn ${activeAnalysisTab === 'ae' ? 'active' : ''}`}
                  onClick={() => setActiveAnalysisTab('ae')}
                >
                  <TrendingUp size={14} />
                  <span>Available Expressions</span>
                  <span className="tab-badge-dir">Forward ∩</span>
                </button>
              </div>
            </div>

            {/* Mathematical Model Info Header */}
            {currentAnalysis && (
              <div className="model-info-bar">
                <div className="model-info-row">
                  <span className="model-title-text">{currentAnalysis.analysis_type}</span>
                  <div className="model-meta-pills">
                    <span className="model-pill">Direction: <strong>{currentAnalysis.direction}</strong></span>
                    <span className="model-pill">Meet: <strong>{currentAnalysis.meet_operator}</strong></span>
                    <span className="model-pill converged">
                      Converged in <strong>{currentAnalysis.total_iterations}</strong> iterations
                    </span>
                  </div>
                </div>

                <div className="model-equations-row">
                  <span>Transfer Rule: <code>{currentAnalysis.transfer_equation}</code></span>
                  <span>Boundary Confluence: <code>{currentAnalysis.confluence_equation}</code></span>
                </div>
              </div>
            )}

            {/* Results Table & Explanations */}
            <div className="dataflow-table-container">
              {/* Short explanation card for beginners */}
              <div className="calc-explanation-card">
                <div className="calc-header">
                  <div className="calc-title">
                    <Info size={14} color="var(--accent-emerald)" />
                    <span>How This Analysis Works:</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {analysisExplanation}
                </p>
              </div>

              {/* "How Was This Result Calculated?" for the selected block */}
              {selectedBlock && currentAnalysis && (
                <div className="calc-explanation-card" style={{ borderLeftColor: 'var(--accent-blue)' }}>
                  <div className="calc-header">
                    <div className="calc-title">
                      <Sparkles size={14} color="var(--accent-blue)" />
                      <span>How Was Result Calculated for Block {selectedBlock.id}?</span>
                    </div>
                  </div>

                  <div className="calc-steps-grid">
                    <div className="calc-step-item">
                      <span className="calc-step-label">
                        {activeAnalysisTab === 'lv' ? '1. USE[B] (Used Before Defined):' : '1. GEN[B] (Generated in Block):'}
                      </span>
                      <div>{renderSet(blockGen[selectedBlock.id] || [])}</div>
                    </div>

                    <div className="calc-step-item">
                      <span className="calc-step-label">
                        {activeAnalysisTab === 'lv' ? '2. DEF[B] (Assigned in Block):' : '2. KILL[B] (Invalidated Definitions):'}
                      </span>
                      <div>{renderSet(blockKill[selectedBlock.id] || [])}</div>
                    </div>

                    <div className="calc-step-item">
                      <span className="calc-step-label">3. Confluence Facts ({activeAnalysisTab === 'lv' ? 'Successors' : 'Predecessors'}):</span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {activeAnalysisTab === 'lv'
                          ? `Successors: ${(selectedBlock.successors || []).join(', ') || 'None (Exit)'}`
                          : `Predecessors: ${(selectedBlock.predecessors || []).join(', ') || 'None (Entry)'}`}
                      </div>
                    </div>

                    <div className="calc-step-item">
                      <span className="calc-step-label">4. Transfer Function Formula:</span>
                      <code>{currentAnalysis.transfer_equation}</code>
                    </div>

                    <div className="calc-step-item">
                      <span className="calc-step-label">5. Resulting IN[B] Set:</span>
                      <div>{renderSet(finalIn[selectedBlock.id] || [])}</div>
                    </div>

                    <div className="calc-step-item">
                      <span className="calc-step-label">6. Resulting OUT[B] Set:</span>
                      <div>{renderSet(finalOut[selectedBlock.id] || [])}</div>
                    </div>
                  </div>

                  <div className="calc-narrative">
                    {activeAnalysisTab === 'rd' && (
                      <span>
                        Block {selectedBlock.id} receives OUT facts entering from predecessor(s): {selectedBlock.predecessors?.join(', ') || 'Entry'}. Their sets are merged using union (∪) to form IN[{selectedBlock.id}]. The block's KILL set is removed, and its GEN set is added to yield OUT[{selectedBlock.id}].
                      </span>
                    )}
                    {activeAnalysisTab === 'lv' && (
                      <span>
                        Block {selectedBlock.id} receives IN facts flowing backward from successor(s): {selectedBlock.successors?.join(', ') || 'Exit'}. Their sets are merged using union (∪) to form OUT[{selectedBlock.id}]. Variables defined in this block (DEF) are removed, and variables read before definition (USE) are added to yield IN[{selectedBlock.id}].
                      </span>
                    )}
                    {activeAnalysisTab === 'ae' && (
                      <span>
                        Block {selectedBlock.id} computes expressions available on all entry paths using intersection (∩). Expressions with operands reassigned in the block are killed, and freshly evaluated expressions in GEN are added to yield OUT[{selectedBlock.id}].
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Definitions mapping table (for Reaching Definitions) */}
              {activeAnalysisTab === 'rd' && currentAnalysis?.definitions_table && currentAnalysis.definitions_table.length > 0 && (
                <div className="aux-subtable-box">
                  <span className="aux-subtable-title">Definitions Mapping (d<sub>i</sub>):</span>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="results-table" style={{ fontSize: '0.74rem' }}>
                      <thead>
                        <tr>
                          <th>Def ID</th>
                          <th>Variable</th>
                          <th>Intermediate Code (3AC)</th>
                          <th>Original Statement</th>
                          <th>Block</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentAnalysis.definitions_table.map((d) => (
                          <tr key={d.id}>
                            <td><strong style={{ color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{d.id}</strong></td>
                            <td><code>{d.var}</code></td>
                            <td><code>{d.code}</code></td>
                            <td>{d.c_stmt ? `Line ${d.c_line}: ${d.c_stmt}` : '—'}</td>
                            <td>
                              <button
                                style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', color: 'var(--accent-blue)', padding: '1px 6px', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}
                                onClick={() => handleSelectBlock(d.block)}
                              >
                                {d.block}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Universal expressions (for Available Expressions) */}
              {activeAnalysisTab === 'ae' && currentAnalysis?.universal_set && (
                <div className="aux-subtable-box">
                  <span className="aux-subtable-title">Universal Set of Binary Expressions (U):</span>
                  <div>
                    {currentAnalysis.universal_set.length > 0 ? (
                      currentAnalysis.universal_set.map((e) => (
                        <span key={e} className="set-chip-item" style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(63, 185, 80, 0.4)' }}>
                          {e}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.74rem' }}>No binary expressions in program.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Canonical IN/OUT Table */}
              <div className="table-filter-bar">
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Canonical IN / OUT Fixed-Point Solutions:
                </span>
                <input
                  type="text"
                  placeholder="Filter blocks or facts..."
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  className="table-filter-input"
                />
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="results-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Block</th>
                      <th>{activeAnalysisTab === 'lv' ? 'USE[B]' : 'GEN[B]'}</th>
                      <th>{activeAnalysisTab === 'lv' ? 'DEF[B]' : 'KILL[B]'}</th>
                      <th>IN[B]</th>
                      <th>OUT[B]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBlockIds.length > 0 ? (
                      filteredBlockIds.map((bId) => {
                        const isSelected = selectedBlockId === bId;
                        const gen = blockGen[bId] || [];
                        const kill = blockKill[bId] || [];
                        const inSet = finalIn[bId] || [];
                        const outSet = finalOut[bId] || [];

                        return (
                          <tr
                            key={bId}
                            className={`results-row ${isSelected ? 'selected-row' : ''}`}
                            onClick={() => handleSelectBlock(bId)}
                            title="Click to select block in graph and view calculation breakdown"
                          >
                            <td>
                              <strong style={{ color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
                                {bId}
                              </strong>
                            </td>
                            <td>{renderSet(gen)}</td>
                            <td>{renderSet(kill)}</td>
                            <td>{renderSet(inSet)}</td>
                            <td>{renderSet(outSet)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                          {tableFilter ? `No basic blocks match filter "${tableFilter}".` : 'Run analysis to view the data-flow equations and results table.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Section 9: Iteration Visualizer & Scrubber with Auto-Play */}
              {steps.length > 0 && (
                <div className="iteration-scrubber-box">
                  <div className="scrubber-controls-row">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowIterationSteps(!showIterationSteps)}
                    >
                      <Activity size={12} />
                      <span>{showIterationSteps ? 'Hide Iteration History' : `Explore Iteration Timeline (${steps.length} Steps)`}</span>
                    </button>

                    {showIterationSteps && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Auto-play button */}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                          title={isAutoPlaying ? 'Pause timeline playback' : 'Auto-play through iteration steps'}
                        >
                          {isAutoPlaying ? <PauseCircle size={13} color="var(--accent-amber)" /> : <PlayCircle size={13} color="var(--accent-emerald)" />}
                          <span>{isAutoPlaying ? 'Pause' : 'Auto Play'}</span>
                        </button>

                        {/* Speed Selector */}
                        <select
                          className="sample-select"
                          style={{ padding: '2px 6px', fontSize: '0.72rem', width: 75 }}
                          value={playSpeed}
                          onChange={(e) => setPlaySpeed(Number(e.target.value))}
                        >
                          <option value={1500}>0.7x</option>
                          <option value={1000}>1.0x</option>
                          <option value={500}>2.0x</option>
                        </select>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setCurrentStepIdx((p) => Math.max(0, p - 1))}
                          disabled={currentStepIdx === 0}
                        >
                          Prev
                        </button>

                        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          Step {currentStepIdx + 1} / {steps.length}
                        </span>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setCurrentStepIdx((p) => Math.min(steps.length - 1, p + 1))}
                          disabled={currentStepIdx >= steps.length - 1}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                  {showIterationSteps && (
                    <div style={{ marginTop: 10 }}>
                      {/* Scrubber Range Slider */}
                      <input
                        type="range"
                        min={0}
                        max={steps.length - 1}
                        value={currentStepIdx}
                        onChange={(e) => setCurrentStepIdx(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                      />

                      {steps[currentStepIdx] && (
                        <div className="step-details-callout">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                                Iteration {steps[currentStepIdx].iteration} ({steps[currentStepIdx].block_id})
                              </span>
                              <span style={{ fontSize: '0.7rem', color: steps[currentStepIdx].has_changed ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                                {steps[currentStepIdx].has_changed ? '▲ State Changed' : '✓ Unchanged'}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              Block evaluated on this step is selected in graph
                            </span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>{steps[currentStepIdx].explanation}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </main>

      {/* ================= VIVA & THEORY MODAL ================= */}
      {isVivaModalOpen && (
        <div className="viva-modal-backdrop" onClick={() => setIsVivaModalOpen(false)}>
          <div className="viva-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="viva-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <GraduationCap size={20} color="var(--accent-purple)" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Compiler Design Viva &amp; Theory Guide
                </h2>
              </div>
              <button className="viva-modal-close-btn" onClick={() => setIsVivaModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="viva-modal-body">
              {/* Leader Detection Rules */}
              <div className="viva-card">
                <h3 className="viva-section-title">
                  <span className="viva-section-num">1</span>
                  Leader Detection Rules (Basic Block Partitioning)
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                  To partition linear Three-Address Code into basic blocks, leaders are identified using 3 canonical rules:
                </p>
                <div className="viva-rule-item">
                  <strong>Rule 1 (First Instruction):</strong> The very first instruction in the intermediate code is a leader.
                </div>
                <div className="viva-rule-item">
                  <strong>Rule 2 (Target of Jump):</strong> Any instruction that is the target of a conditional (<code>if_goto</code>) or unconditional (<code>goto</code>) jump is a leader.
                </div>
                <div className="viva-rule-item">
                  <strong>Rule 3 (Following a Jump):</strong> Any instruction immediately following a conditional or unconditional jump is a leader.
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  <em>Block definition:</em> A basic block starts at a leader and includes all instructions up to, but not including, the next leader or the end of the program.
                </div>
              </div>

              {/* Data-Flow Analysis Matrix */}
              <div className="viva-card">
                <h3 className="viva-section-title">
                  <span className="viva-section-num">2</span>
                  Data-Flow Analysis Canonical Comparison Matrix
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="results-table" style={{ fontSize: '0.74rem' }}>
                    <thead>
                      <tr>
                        <th>Analysis</th>
                        <th>Direction</th>
                        <th>Meet (Confluence)</th>
                        <th>Transfer Equation</th>
                        <th>Boundary Condition</th>
                        <th>Application</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Reaching Definitions</strong></td>
                        <td>Forward (↓)</td>
                        <td>Union (∪) — May</td>
                        <td><code>OUT = GEN ∪ (IN - KILL)</code></td>
                        <td><code>OUT[ENTRY] = ∅</code></td>
                        <td>Constant Propagation, Uninitialized Warnings</td>
                      </tr>
                      <tr>
                        <td><strong>Live Variables</strong></td>
                        <td>Backward (↑)</td>
                        <td>Union (∪) — May</td>
                        <td><code>IN = USE ∪ (OUT - DEF)</code></td>
                        <td><code>IN[EXIT] = ∅</code></td>
                        <td>Dead Code Elimination, Register Allocation</td>
                      </tr>
                      <tr>
                        <td><strong>Available Expressions</strong></td>
                        <td>Forward (↓)</td>
                        <td>Intersection (∩) — Must</td>
                        <td><code>OUT = GEN ∪ (IN - KILL)</code></td>
                        <td><code>OUT[ENTRY] = ∅; OUT[B]=U</code></td>
                        <td>Common Subexpression Elimination (CSE)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Viva Key Questions */}
              <div className="viva-card">
                <h3 className="viva-section-title">
                  <span className="viva-section-num">3</span>
                  Frequently Asked Viva / Interview Questions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <strong style={{ color: 'var(--accent-blue)' }}>Q1: Why is Available Expressions initialized to Universal Set U, while Reaching Definitions starts at ∅?</strong>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                      Available Expressions uses <em>intersection (∩)</em>. If initialized to ∅, intersecting with ∅ would always yield ∅, permanently wiping out valid available expressions. Reaching Definitions uses <em>union (∪)</em>, where ∅ is the identity element.
                    </p>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--accent-blue)' }}>Q2: What guarantees that the iterative data-flow algorithm will terminate?</strong>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                      By Tarski's Fixed Point Theorem, the state forms a finite-height semi-lattice, and the transfer function is monotonic. In each iteration, sets only grow (for union) or shrink (for intersection) monotonically until reaching a stable fixed point.
                    </p>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--accent-blue)' }}>Q3: What is the difference between a forward and backward data-flow problem?</strong>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                      In a forward problem (e.g. Reaching Definitions), information flows along the direction of control flow (from predecessors to successors). In a backward problem (e.g. Live Variables), information flows against control flow (from future read sites backwards towards definitions).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="viva-modal-footer">
              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                CFG &amp; Data-Flow Analysis Framework • Compiler Design Lab &amp; Viva Reference
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => setIsVivaModalOpen(false)}>
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
