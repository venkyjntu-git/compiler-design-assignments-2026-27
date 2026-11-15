import React, { useRef, useState, useEffect } from 'react';
import {
  FileCode2,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Terminal,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import ExampleSelector from './ExampleSelector';
import ErrorMessage from '../common/ErrorMessage';

export default function SourceEditor({
  code,
  setCode,
  error,
  onAnalyze,
  onReset,
  onClear,
  onSelectSample,
  samples,
  selectedSampleId,
  isAnalyzing
}) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const highlightRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showSyntaxHint, setShowSyntaxHint] = useState(false);

  const lines = code.split('\n');
  const lineCount = Math.max(1, lines.length);
  const charCount = code.length;

  // Sync scrolling between textarea, line numbers gutter, and highlight backdrop
  const handleScroll = () => {
    if (textareaRef.current) {
      const top = textareaRef.current.scrollTop;
      const left = textareaRef.current.scrollLeft;
      if (gutterRef.current) gutterRef.current.scrollTop = top;
      if (highlightRef.current) {
        highlightRef.current.scrollTop = top;
        highlightRef.current.scrollLeft = left;
      }
    }
  };

  const updateCursorPosition = (e) => {
    const selStart = e.target.selectionStart;
    const textBefore = code.substring(0, selStart);
    const lineArr = textBefore.split('\n');
    const curLine = lineArr.length;
    const curCol = lineArr[lineArr.length - 1].length + 1;
    setCursorPos({ line: curLine, col: curCol });
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

  // Generate lightweight syntax highlighted HTML
  const generateHighlightedHtml = (rawCode) => {
    const escapeHtml = (str) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Regex token patterns for C subset
    const tokenRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/)|(\b(?:int|return|if|else|while|for|break|continue|void)\b)|(\b\d+\b)|(==|!=|<=|>=|&&|\|\||[+\-*\/%<>=!])|(\b[a-zA-Z_]\w*\b)|([{}();,])/gm;

    const formatted = rawCode.replace(tokenRegex, (match, comment, keyword, number, operator, identifier, punct) => {
      if (comment) return `<span class="tok-comment">${escapeHtml(comment)}</span>`;
      if (keyword) return `<span class="tok-keyword">${escapeHtml(keyword)}</span>`;
      if (number) return `<span class="tok-number">${escapeHtml(number)}</span>`;
      if (operator) return `<span class="tok-operator">${escapeHtml(operator)}</span>`;
      if (identifier) return `<span class="tok-identifier">${escapeHtml(identifier)}</span>`;
      if (punct) return `<span class="tok-punct">${escapeHtml(punct)}</span>`;
      return escapeHtml(match);
    });

    return formatted + '\n';
  };

  return (
    <section className="editor-panel" aria-label="C Source Code Editor">
      {/* Header Bar */}
      <div className="editor-header">
        <div className="editor-header-left">
          <span className="editor-badge">SOURCE CODE</span>
          <span className="lang-indicator">C (Subset)</span>
        </div>

        <ExampleSelector
          samples={samples}
          selectedSampleId={selectedSampleId}
          onSelectSample={onSelectSample}
        />

        <div className="editor-actions">
          <button
            className="btn-icon"
            onClick={handleCopy}
            title="Copy Source Code"
          >
            {copied ? <Check size={14} className="text-secondary" /> : <Copy size={14} />}
          </button>
          <button
            className="btn-icon"
            onClick={onReset}
            title="Reset to Template"
          >
            <RotateCcw size={14} />
          </button>
          <button
            className="btn-icon"
            onClick={onClear}
            title="Clear Editor"
          >
            <Trash2 size={14} />
          </button>
          <button
            className={`btn-icon ${showSyntaxHint ? 'active' : ''}`}
            onClick={() => setShowSyntaxHint(!showSyntaxHint)}
            title="Toggle Supported Syntax Hint"
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </div>

      {/* Syntax Guide Dropdown Hint */}
      {showSyntaxHint && (
        <div className="syntax-hint-box">
          <div className="syntax-hint-title">Supported C Grammar Subset:</div>
          <div className="syntax-hint-grid">
            <div><code>int x; int y = 10;</code> (Variable declarations)</div>
            <div><code>if (a &lt; b) &#123; ... &#125; else &#123; ... &#125;</code> (Conditionals)</div>
            <div><code>while (i &lt;= 10) &#123; ... &#125;</code> (Natural loops)</div>
            <div><code>for (int i=0; i&lt;5; i++) &#123; ... &#125;</code> (For loops)</div>
            <div><code>+ - * / % == != &lt; &lt;= &gt; &gt;=</code> (Expressions)</div>
            <div><code>return value;</code> (Function exit)</div>
          </div>
        </div>
      )}

      {/* Code Textarea & Line Numbers */}
      <div className="editor-workspace">
        <div className="editor-gutter" ref={gutterRef} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNum = i + 1;
            const isErrorLine = error && error.line === lineNum;
            return (
              <div
                key={lineNum}
                className={`gutter-line ${isErrorLine ? 'gutter-error' : ''}`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        <div className="editor-stage">
          {/* Syntax Highlight Backdrop */}
          <pre
            ref={highlightRef}
            className="editor-highlight-backdrop"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: generateHighlightedHtml(code) }}
          />

          {/* Actual Interactive Textarea */}
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onKeyUp={updateCursorPosition}
            onClick={updateCursorPosition}
            spellCheck="false"
            autoCapitalize="off"
            autoComplete="off"
            placeholder="Type or paste C code here..."
          />
        </div>
      </div>

      {/* Error Banner when compilation fails */}
      {error && (
        <div className="editor-error-container">
          <ErrorMessage error={error} />
        </div>
      )}

      {/* Status Footer */}
      <div className="editor-footer">
        <div className="footer-meta">
          <span className="footer-stat">Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className="footer-stat">•</span>
          <span className="footer-stat">{lineCount} lines</span>
          <span className="footer-stat">•</span>
          <span className="footer-stat">{charCount} chars</span>
        </div>
        <div className="footer-shortcut">
          <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to analyze
        </div>
      </div>
    </section>
  );
}
