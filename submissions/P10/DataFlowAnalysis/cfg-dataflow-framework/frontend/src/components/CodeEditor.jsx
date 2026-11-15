import React, { useRef, useState } from 'react';
import {
  FileCode2,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Play,
  Terminal,
  Sparkles
} from 'lucide-react';

export default function CodeEditor({
  code,
  setCode,
  error,
  onAnalyze,
  onReset,
  onClear,
  onSelectSample,
  samples,
  isAnalyzing,
  selectedSampleId
}) {
  const lineNumbersRef = useRef(null);
  const textareaRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const lines = code.split('\n');
  const lineCount = Math.max(1, lines.length);
  const charCount = code.length;

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  const handleScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

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
      onAnalyze();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="editor-pane" aria-label="C Source Code Editor">
      {/* Tab bar */}
      <div className="pane-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pane-tab-active">
            <FileCode2 size={14} />
            <span>main.c</span>
          </div>
          <span className="stat-badge">{lineCount} lines</span>
        </div>

        <div className="editor-actions">
          <button
            onClick={handleCopy}
            className="btn-icon"
            title="Copy Source Code"
          >
            {copied ? <Check size={14} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={14} />}
          </button>
          <button
            onClick={onReset}
            className="btn-icon"
            title="Reset to Benchmark Template"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={onClear}
            className="btn-icon"
            title="Clear Code"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Compiler Diagnostic / Syntax Error Banner */}
      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1, color: '#f87171' }} />
          <div>
            <div style={{ fontWeight: 700, color: '#fee2e2' }}>
              {error.error_type || 'Compilation Error'}
            </div>
            <div style={{ opacity: 0.95 }}>{error.message || String(error)}</div>
            {error.line && (
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: 3 }}>
                Location: Line <strong>{error.line}</strong>, Column <strong>{error.col}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Body with Line Numbers */}
      <div className="editor-body">
        <div className="line-numbers" ref={lineNumbersRef}>
          {lineNumbers}
        </div>
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder="Enter supported C source code..."
        />
      </div>

      {/* Editor Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <span>C (Subset)</span>
          <span>UTF-8</span>
          <span>Tab: 4 spaces</span>
        </div>
        <div>
          <span>{charCount} chars</span>
        </div>
      </div>

      {/* Quick Benchmark Selector Chips */}
      <div className="editor-footer">
        <div className="quick-chips">
          <span className="chip-label">Quick Load:</span>
          {samples.slice(0, 5).map((s) => (
            <button
              key={s.id}
              className={`chip ${s.id === selectedSampleId ? 'active' : ''}`}
              onClick={() => onSelectSample(s.id)}
              title={s.description}
            >
              {s.title.split('(')[0].trim()}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
