import { CFGGraphRenderer } from './graph_renderer.js';

const API_BASE = 'http://127.0.0.1:8000';

class App {
  constructor() {
    this.renderer = null;
    this.analysisData = null;
    this.samples = [];

    // Stepper states for each analysis
    this.playback = {
      rd: { index: 0, timer: null, isPlaying: false },
      lv: { index: 0, timer: null, isPlaying: false },
      ae: { index: 0, timer: null, isPlaying: false }
    };

    this.initElements();
    this.initEvents();
    this.checkHealth();
    this.loadSamples();
  }

  initElements() {
    this.codeInput = document.getElementById('code-input');
    this.lineNumbers = document.getElementById('line-numbers');
    this.sampleSelect = document.getElementById('sample-select');
    this.serverStatus = document.getElementById('server-status-pill');
    this.statusText = document.getElementById('status-text');
    this.btnAnalyze = document.getElementById('btn-analyze');
    this.btnExportSvg = document.getElementById('btn-export-svg');
    this.btnClearCode = document.getElementById('btn-clear-code');
    this.nodeFlyout = document.getElementById('node-flyout');
    this.flyoutTitle = document.getElementById('flyout-title');
    this.flyoutContent = document.getElementById('flyout-content');
    this.btnCloseFlyout = document.getElementById('btn-close-flyout');

    const svgElement = document.getElementById('cfg-svg');
    this.renderer = new CFGGraphRenderer(svgElement, (block) => this.showBlockDetails(block));
  }

  initEvents() {
    // Editor line numbers update
    this.codeInput.addEventListener('input', () => this.updateLineNumbers());
    this.codeInput.addEventListener('scroll', () => {
      this.lineNumbers.scrollTop = this.codeInput.scrollTop;
    });

    // Keyboard shortcut: Ctrl + Enter
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runAnalysis();
      }
    });

    this.btnAnalyze.addEventListener('click', () => this.runAnalysis());
    this.btnClearCode.addEventListener('click', () => {
      this.codeInput.value = '';
      this.updateLineNumbers();
    });

    // Sample select
    this.sampleSelect.addEventListener('change', (e) => {
      const selected = this.samples.find(s => s.id === e.target.value);
      if (selected) {
        this.codeInput.value = selected.code.trim();
        this.updateLineNumbers();
        this.runAnalysis();
      }
    });

    // Quick chips
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const sampleId = chip.dataset.sample;
        const selected = this.samples.find(s => s.id === sampleId);
        if (selected) {
          this.codeInput.value = selected.code.trim();
          this.sampleSelect.value = sampleId;
          this.updateLineNumbers();
          this.runAnalysis();
        }
      });
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const targetTab = document.getElementById(btn.dataset.tab);
        if (targetTab) targetTab.classList.add('active');

        // If switching to CFG tab, re-fit
        if (btn.dataset.tab === 'tab-cfg' && this.renderer) {
          setTimeout(() => this.renderer.fitToScreen(), 50);
        }
      });
    });

    // Graph controls
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.renderer.zoomIn());
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.renderer.zoomOut());
    document.getElementById('btn-zoom-fit')?.addEventListener('click', () => this.renderer.fitToScreen());
    document.getElementById('btn-zoom-reset')?.addEventListener('click', () => this.renderer.resetZoom());

    this.btnCloseFlyout.addEventListener('click', () => {
      this.nodeFlyout.classList.remove('open');
    });

    // Export SVG
    this.btnExportSvg.addEventListener('click', () => this.exportSvg());

    // Step controllers setup
    this.setupStepControls('rd');
    this.setupStepControls('lv');
    this.setupStepControls('ae');
  }

  updateLineNumbers() {
    const lines = this.codeInput.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) {
      numbers += `${i}\n`;
    }
    this.lineNumbers.textContent = numbers;
    document.getElementById('line-count-badge').textContent = `${lines} lines`;
  }

  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        this.serverStatus.classList.remove('error');
        this.statusText.textContent = 'Backend: 127.0.0.1:8000 (Active)';
      } else {
        throw new Error();
      }
    } catch {
      this.serverStatus.classList.add('error');
      this.statusText.textContent = 'Backend Disconnected';
    }
  }

  async loadSamples() {
    try {
      const res = await fetch(`${API_BASE}/api/samples`);
      if (res.ok) {
        this.samples = await res.json();
        this.sampleSelect.innerHTML = '<option value="" disabled selected>Select Benchmark Sample...</option>';
        this.samples.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = `${s.title}`;
          this.sampleSelect.appendChild(opt);
        });

        // Load first sample as default
        if (this.samples.length > 0 && !this.codeInput.value) {
          this.codeInput.value = this.samples[0].code.trim();
          this.sampleSelect.value = this.samples[0].id;
          this.updateLineNumbers();
          this.runAnalysis();
        }
      }
    } catch (err) {
      console.error('Failed to load samples:', err);
    }
  }

  async runAnalysis() {
    const code = this.codeInput.value.trim();
    if (!code) {
      alert('Please enter or select some code to analyze.');
      return;
    }

    this.btnAnalyze.disabled = true;
    this.btnAnalyze.textContent = 'Analyzing...';

    try {
      const res = await fetch(`${API_BASE}/api/analyze/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Analysis request failed');
      }

      this.analysisData = await res.json();
      this.renderAll();
    } catch (err) {
      alert(`Error during analysis: ${err.message}`);
    } finally {
      this.btnAnalyze.disabled = false;
      this.btnAnalyze.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Build & Analyze
      `;
    }
  }

  renderAll() {
    if (!this.analysisData) return;

    // 1. Render Graph
    this.renderer.render(this.analysisData.cfg);

    // 2. Render Reaching Definitions
    this.renderReachingDefinitions(this.analysisData.reaching_definitions);

    // 3. Render Live Variables
    this.renderLiveVariables(this.analysisData.live_variables);

    // 4. Render Available Expressions
    this.renderAvailableExpressions(this.analysisData.available_expressions);

    // 5. Render Optimizations
    this.renderOptimizations(this.analysisData.optimizations);
  }

  showBlockDetails(block) {
    this.flyoutTitle.textContent = `${block.id} Details`;
    let html = `
      <div class="flyout-group">
        <h5>Block Type</h5>
        <p>${block.is_entry ? 'Entry Node' : (block.is_exit ? 'Exit Node' : 'Basic Block')}</p>
      </div>
      <div class="flyout-group">
        <h5>Predecessors</h5>
        <div class="flyout-pills">
          ${block.predecessors.length > 0 ? block.predecessors.map(p => `<span class="flyout-pill">${p}</span>`).join('') : '<em>None</em>'}
        </div>
      </div>
      <div class="flyout-group">
        <h5>Successors</h5>
        <div class="flyout-pills">
          ${block.successors.length > 0 ? block.successors.map(s => `<span class="flyout-pill">${s}</span>`).join('') : '<em>None</em>'}
        </div>
      </div>
    `;

    if (this.analysisData) {
      const rdIn = this.analysisData.reaching_definitions.final_in[block.id] || [];
      const rdOut = this.analysisData.reaching_definitions.final_out[block.id] || [];
      const lvIn = this.analysisData.live_variables.final_in[block.id] || [];
      const lvOut = this.analysisData.live_variables.final_out[block.id] || [];

      html += `
        <div class="flyout-group">
          <h5>Reaching Defs (IN / OUT)</h5>
          <p><strong>IN:</strong> { ${rdIn.join(', ') || '∅'} }</p>
          <p><strong>OUT:</strong> { ${rdOut.join(', ') || '∅'} }</p>
        </div>
        <div class="flyout-group">
          <h5>Live Variables (IN / OUT)</h5>
          <p><strong>IN:</strong> { ${lvIn.join(', ') || '∅'} }</p>
          <p><strong>OUT:</strong> { ${lvOut.join(', ') || '∅'} }</p>
        </div>
      `;
    }

    this.flyoutContent.innerHTML = html;
    this.nodeFlyout.classList.add('open');
  }

  renderReachingDefinitions(data) {
    // Definitions Table
    const defsTbody = document.querySelector('#rd-defs-table tbody');
    if (data.definitions_table && data.definitions_table.length > 0) {
      defsTbody.innerHTML = data.definitions_table.map(d => `
        <tr>
          <td><strong style="color:var(--accent-cyan)">${d.id}</strong></td>
          <td><code>${d.var}</code></td>
          <td>#${d.instr_id}</td>
          <td><code>${d.code}</code></td>
          <td><span class="flyout-pill">${d.block}</span></td>
        </tr>
      `).join('');
    } else {
      defsTbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No definitions in code.</td></tr>';
    }

    // Gen & Kill Table
    const genKillTbody = document.querySelector('#rd-genkill-table tbody');
    genKillTbody.innerHTML = Object.keys(data.block_gen).map(bId => {
      const gen = data.block_gen[bId] || [];
      const kill = data.block_kill[bId] || [];
      return `
        <tr>
          <td><strong>${bId}</strong></td>
          <td><code>{ ${gen.join(', ') || '∅'} }</code></td>
          <td><code>{ ${kill.join(', ') || '∅'} }</code></td>
        </tr>
      `;
    }).join('');

    // Matrix Table
    const matrixTbody = document.querySelector('#rd-matrix-table tbody');
    matrixTbody.innerHTML = data.steps.map(s => `
      <tr class="${s.has_changed ? 'row-changed' : ''}">
        <td>Iter ${s.iteration}</td>
        <td><strong>${s.block_id}</strong></td>
        <td><code>{ ${s.in_set.join(', ') || '∅'} }</code></td>
        <td><code>{ ${s.out_set.join(', ') || '∅'} }</code></td>
        <td>
          <span class="${s.has_changed ? 'status-badge-changed' : 'status-badge-unchanged'}">
            ${s.has_changed ? '▲ Changed' : '— Unchanged'}
          </span>
        </td>
      </tr>
    `).join('');

    // Setup Slider
    this.initSlider('rd', data.steps);
  }

  renderLiveVariables(data) {
    // USE & DEF Table
    const useDefTbody = document.querySelector('#lv-usedef-table tbody');
    useDefTbody.innerHTML = Object.keys(data.block_gen).map(bId => {
      const use = data.block_gen[bId] || [];
      const def = data.block_kill[bId] || [];
      return `
        <tr>
          <td><strong>${bId}</strong></td>
          <td><code>{ ${use.join(', ') || '∅'} }</code></td>
          <td><code>{ ${def.join(', ') || '∅'} }</code></td>
        </tr>
      `;
    }).join('');

    // Matrix Table
    const matrixTbody = document.querySelector('#lv-matrix-table tbody');
    matrixTbody.innerHTML = data.steps.map(s => `
      <tr class="${s.has_changed ? 'row-changed' : ''}">
        <td>Iter ${s.iteration}</td>
        <td><strong>${s.block_id}</strong></td>
        <td><code>{ ${s.out_set.join(', ') || '∅'} }</code></td>
        <td><code>{ ${s.in_set.join(', ') || '∅'} }</code></td>
        <td>
          <span class="${s.has_changed ? 'status-badge-changed' : 'status-badge-unchanged'}">
            ${s.has_changed ? '▲ Changed' : '— Unchanged'}
          </span>
        </td>
      </tr>
    `).join('');

    // Setup Slider
    this.initSlider('lv', data.steps);
  }

  renderAvailableExpressions(data) {
    // Universal Set Chips
    const uContainer = document.getElementById('ae-universal-container');
    if (data.universal_set && data.universal_set.length > 0) {
      uContainer.innerHTML = data.universal_set.map(e => `<span class="expr-chip">${e}</span>`).join('');
    } else {
      uContainer.innerHTML = '<span class="empty-cell">No non-trivial binary expressions.</span>';
    }

    // Gen & Kill Table
    const genKillTbody = document.querySelector('#ae-genkill-table tbody');
    genKillTbody.innerHTML = Object.keys(data.block_gen).map(bId => {
      const gen = data.block_gen[bId] || [];
      const kill = data.block_kill[bId] || [];
      return `
        <tr>
          <td><strong>${bId}</strong></td>
          <td><code>{ ${gen.join(', ') || '∅'} }</code></td>
          <td><code>{ ${kill.join(', ') || '∅'} }</code></td>
        </tr>
      `;
    }).join('');

    // Matrix Table
    const matrixTbody = document.querySelector('#ae-matrix-table tbody');
    matrixTbody.innerHTML = data.steps.map(s => `
      <tr class="${s.has_changed ? 'row-changed' : ''}">
        <td>Iter ${s.iteration}</td>
        <td><strong>${s.block_id}</strong></td>
        <td><code>{ ${s.in_set.join(', ') || '∅'} }</code></td>
        <td><code>{ ${s.out_set.join(', ') || '∅'} }</code></td>
        <td>
          <span class="${s.has_changed ? 'status-badge-changed' : 'status-badge-unchanged'}">
            ${s.has_changed ? '▲ Changed' : '— Unchanged'}
          </span>
        </td>
      </tr>
    `).join('');

    // Setup Slider
    this.initSlider('ae', data.steps);
  }

  renderOptimizations(opts) {
    const grid = document.getElementById('opt-grid');
    const badge = document.getElementById('opt-count');
    badge.textContent = opts ? opts.length : 0;

    if (!opts || opts.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="position:static; transform:none; grid-column: 1 / -1; padding: 40px;">
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" stroke-width="1.5" fill="none">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h3>Clean Intermediate Code</h3>
          <p>No redundant expressions, uninitialized variables, or dead assignments detected!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = opts.map(opt => `
      <div class="opt-card ${opt.severity}">
        <div class="opt-card-header">
          <span class="opt-type-tag">${opt.type.replace('_', ' ')}</span>
          <span class="opt-source">${opt.source}</span>
        </div>
        <p class="opt-msg">${opt.message}</p>
        <div style="font-size:0.75rem; color:var(--text-muted);">
          Location: Block <strong>${opt.block}</strong>, Line <strong>#${opt.line}</strong>
        </div>
      </div>
    `).join('');
  }

  initSlider(prefix, steps) {
    const slider = document.getElementById(`${prefix}-slider`);
    const label = document.getElementById(`${prefix}-step-label`);
    slider.min = 0;
    slider.max = Math.max(0, steps.length - 1);
    slider.value = 0;
    this.playback[prefix].index = 0;
    label.textContent = `Step 0 / ${steps.length}`;
    this.updateStepDisplay(prefix, 0);
  }

  setupStepControls(prefix) {
    const slider = document.getElementById(`${prefix}-slider`);
    const btnPrev = document.getElementById(`btn-${prefix}-prev`);
    const btnNext = document.getElementById(`btn-${prefix}-next`);
    const btnPlay = document.getElementById(`btn-${prefix}-play`);
    const btnReset = document.getElementById(`btn-${prefix}-reset`);

    slider.addEventListener('input', (e) => {
      this.playback[prefix].index = parseInt(e.target.value, 10);
      this.updateStepDisplay(prefix, this.playback[prefix].index);
    });

    btnPrev.addEventListener('click', () => {
      if (this.playback[prefix].index > 0) {
        this.playback[prefix].index--;
        slider.value = this.playback[prefix].index;
        this.updateStepDisplay(prefix, this.playback[prefix].index);
      }
    });

    btnNext.addEventListener('click', () => {
      const max = parseInt(slider.max, 10);
      if (this.playback[prefix].index < max) {
        this.playback[prefix].index++;
        slider.value = this.playback[prefix].index;
        this.updateStepDisplay(prefix, this.playback[prefix].index);
      }
    });

    btnReset.addEventListener('click', () => {
      this.pausePlayback(prefix);
      this.playback[prefix].index = 0;
      slider.value = 0;
      this.updateStepDisplay(prefix, 0);
    });

    btnPlay.addEventListener('click', () => {
      if (this.playback[prefix].isPlaying) {
        this.pausePlayback(prefix);
      } else {
        this.startPlayback(prefix);
      }
    });
  }

  startPlayback(prefix) {
    const btnPlay = document.getElementById(`btn-${prefix}-play`);
    const slider = document.getElementById(`${prefix}-slider`);
    const max = parseInt(slider.max, 10);

    if (this.playback[prefix].index >= max) {
      this.playback[prefix].index = 0;
      slider.value = 0;
    }

    this.playback[prefix].isPlaying = true;
    btnPlay.textContent = '⏸ Pause';

    this.playback[prefix].timer = setInterval(() => {
      if (this.playback[prefix].index < max) {
        this.playback[prefix].index++;
        slider.value = this.playback[prefix].index;
        this.updateStepDisplay(prefix, this.playback[prefix].index);
      } else {
        this.pausePlayback(prefix);
      }
    }, 650);
  }

  pausePlayback(prefix) {
    const btnPlay = document.getElementById(`btn-${prefix}-play`);
    this.playback[prefix].isPlaying = false;
    btnPlay.textContent = '▶ Play';
    if (this.playback[prefix].timer) {
      clearInterval(this.playback[prefix].timer);
      this.playback[prefix].timer = null;
    }
  }

  updateStepDisplay(prefix, index) {
    let steps = [];
    if (prefix === 'rd') steps = this.analysisData?.reaching_definitions?.steps || [];
    else if (prefix === 'lv') steps = this.analysisData?.live_variables?.steps || [];
    else if (prefix === 'ae') steps = this.analysisData?.available_expressions?.steps || [];

    const label = document.getElementById(`${prefix}-step-label`);
    const expl = document.getElementById(`${prefix}-step-expl`);

    if (steps.length > 0 && steps[index]) {
      const step = steps[index];
      label.textContent = `Step ${index + 1} / ${steps.length}`;
      expl.innerHTML = `<strong>Iter ${step.iteration} (${step.block_id}):</strong> ${step.explanation}`;

      // Highlight the node in CFG if renderer is active
      if (this.renderer) {
        this.renderer.selectNode(step.block_id);
      }
    } else {
      label.textContent = `Step 0 / 0`;
      expl.textContent = 'Run analysis to inspect fixed-point iterations.';
    }
  }

  exportSvg() {
    const svg = document.getElementById('cfg-svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CFG-DataFlowCD-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
