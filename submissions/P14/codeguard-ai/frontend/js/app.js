/**
 * CodeGuard AI - Main Frontend Application Logic
 * Manages Monaco Editors, API communications, comparison analysis,
 * interactive side-by-side diffing, history management, and navigation.
 */

// Application State
const AppState = {
  samples: {},
  currentComparison: null,
  activeEditorA: null,
  activeEditorB: null,
  isMonacoReady: false,
  visualizer: null,
  activeTreeProgram: "A" // 'A' or 'B'
};

// Pipeline Explanations Data (Educational Compiler Design Concepts)
const PIPELINE_STAGES = [
  {
    step: 1,
    name: "Source Code Input",
    short: "Lexical Source",
    title: "Stage 1: Raw Python Source Code Ingestion",
    theory: "Compilers accept character streams representing source programs. In this preliminary phase, the source text is checked for encoding (UTF-8), non-printable artifacts, and basic length constraints.",
    compilerRole: "Pre-processing in GCC/Clang (cpp) strips byte-order marks and handles conditional compilation directives before tokenization.",
    codeGuardAction: "CodeGuard AI ingests user programs from direct typing, paste, or file upload, enforcing a 512KB safe execution buffer and validating non-empty input.",
    example: "def bubble_sort(arr):\n    n = len(arr)  # Ingested as unicode character stream"
  },
  {
    step: 2,
    name: "Lexical & Syntax Parsing",
    short: "Scanner & Grammar",
    title: "Stage 2: Lexical Tokenization & Syntax Verification",
    theory: "The Lexical Analyzer (Scanner) converts the character stream into a discrete sequence of tokens (keywords, identifiers, literals, operators). The Syntax Analyzer (Parser) verifies that tokens conform to Context-Free Grammar (CFG) rules using LL(k) or PEG parsing.",
    compilerRole: "Python 3.9+ utilizes a PEG (Parsing Expression Grammar) parser that detects invalid constructs and outputs precise syntax error coordinates.",
    codeGuardAction: "CodeGuard AI intercepts SyntaxErrors immediately, extracting exact line numbers, column offsets, and pointers to guide the student without crashing.",
    example: "Tokens: [NAME:'def', NAME:'bubble_sort', OP:'(', NAME:'arr', OP:')', OP:':']"
  },
  {
    step: 3,
    name: "AST Generation",
    short: "Hierarchical Graph",
    title: "Stage 3: Abstract Syntax Tree Construction",
    theory: "An Abstract Syntax Tree (AST) is a finite, labeled, directed hierarchical tree where each interior node represents an operation (e.g. BinOp, If, For) and leaves represent operands (identifiers, constants). Unlike concrete parse trees, ASTs eliminate syntactic trivia such as semicolons, parentheses, formatting, and comments.",
    compilerRole: "CPython builds the PyAST data structure, which forms the intermediate representation passed to the symbol table generator and bytecode emitter.",
    codeGuardAction: "CodeGuard AI serializes AST nodes into interactive D3 graph models with line spans, node categories, and educational explanations.",
    example: "Module -> FunctionDef(name='bubble_sort') -> Assign -> Call(func=Name(id='len'))"
  },
  {
    step: 4,
    name: "AST Normalization",
    short: "Canonicalization",
    title: "Stage 4: Structural Normalization & Canonicalization",
    theory: "In code clone detection, Type-2 clones involve renamed variables and functions, while Type-3 clones involve minor statement modifications. Normalization maps diverse user identifiers to uniform canonical placeholders (e.g., v0, v1, func0) while keeping language built-ins intact.",
    compilerRole: "Similar to compiler Alpha-Conversion in Lambda Calculus, Intermediate Representation (IR) canonicalization in LLVM (e.g., SSA form: %0, %1).",
    codeGuardAction: "Configurable normalizers rename variables, parameters, and function calls, strip docstrings, and sort commutative binary operations (e.g. a + b <-> b + a).",
    example: "Original: total_sum += count  ==>  Normalized: var_0 += var_1"
  },
  {
    step: 5,
    name: "Structural Comparison",
    short: "Subtree & Vector Analysis",
    title: "Stage 5: Subtree Decomposition, Multiset Jaccard & Alignment",
    theory: "Comparing trees requires mathematically defensible structural metrics. CodeGuard AI utilizes recursive Subtree Hashing (similar to the Deckard algorithm) coupled with Multiset Jaccard/Dice indices, Node-Type Vector Cosine, and Pre-Order Structural Alignment.",
    compilerRole: "Used in optimizing compilers for Common Subexpression Elimination (CSE) and Tree Edit Distance (TED) code compression.",
    codeGuardAction: "Extracts all structural subtrees, generates deterministic signatures, identifies exact shared code regions, and computes line mappings for side-by-side highlighting.",
    example: "Subtree Jaccard = |Subtrees(A) ∩ Subtrees(B)| / |Subtrees(A) ∪ Subtrees(B)|"
  },
  {
    step: 6,
    name: "Synthesis & Reporting",
    short: "Metrics & Visualization",
    title: "Stage 6: Multi-Metric Synthesis & Pedagogical Report",
    theory: "The final synthesis merges tree structural metrics with supporting lexical token and raw text baselines into a composite score: 0.55 * Subtree_Dice + 0.30 * Sequence_Sim + 0.15 * Node_Type_Jaccard.",
    compilerRole: "Compiler diagnostics and optimization reports summarizing AST transformation efficacy.",
    codeGuardAction: "Generates visual similarity gauges, side-by-side diff highlights, node distribution bar charts, and human-readable pedagogical explanations.",
    example: "Composite: 100% AST Similarity (Type-2 Clone: Renamed identifiers detected with identical AST topology)."
  }
];

// Document Ready Initialization
document.addEventListener("DOMContentLoaded", async () => {
  initNavigation();
  initMonacoEditors();
  initVisualizer();
  await loadSampleCases();
  await fetchHistory();
  initPipeline();
  initEventListeners();
});

// -------------------------------------------------------------
// 1. Navigation Controller
// -------------------------------------------------------------
function initNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  const pageViews = document.querySelectorAll(".page-view");

  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("data-target");
      navigateTo(targetId);
    });
  });

  // Action links like "Open Workspace"
  document.querySelectorAll("[data-navigate]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = btn.getAttribute("data-navigate");
      navigateTo(target);
    });
  });
}

function navigateTo(targetId) {
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.getAttribute("data-target") === targetId);
  });

  document.querySelectorAll(".page-view").forEach(view => {
    view.classList.toggle("active-view", view.id === targetId);
  });

  // Re-layout editors if switching to workspace
  if (targetId === "view-workspace" && AppState.isMonacoReady) {
    if (AppState.activeEditorA) AppState.activeEditorA.layout();
    if (AppState.activeEditorB) AppState.activeEditorB.layout();
  }

  // Reset zoom on AST visualizer if switching to viz
  if (targetId === "view-ast" && AppState.visualizer) {
    setTimeout(() => AppState.visualizer.resetZoom(), 100);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// -------------------------------------------------------------
// 2. Monaco Editor Integration with Fallback
// -------------------------------------------------------------
function initMonacoEditors() {
  const containerA = document.getElementById("editor-container-a");
  const containerB = document.getElementById("editor-container-b");

  // Check if Monaco loader is available via CDN
  if (window.require && typeof window.require === "function") {
    try {
      window.require.config({
        paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" }
      });

      window.require(["vs/editor/editor.main"], function () {
        AppState.activeEditorA = monaco.editor.create(containerA, {
          value: "# Program A Source Code\n",
          language: "python",
          theme: "vs",
          automaticLayout: true,
          fontSize: 13,
          lineNumbers: "on",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: "all"
        });

        AppState.activeEditorB = monaco.editor.create(containerB, {
          value: "# Program B Source Code\n",
          language: "python",
          theme: "vs",
          automaticLayout: true,
          fontSize: 13,
          lineNumbers: "on",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: "all"
        });

        AppState.isMonacoReady = true;
      });
    } catch (err) {
      console.warn("Monaco initialization error, using standard fallback textarea:", err);
      setupFallbackTextareas(containerA, containerB);
    }
  } else {
    setupFallbackTextareas(containerA, containerB);
  }
}

function setupFallbackTextareas(c1, c2) {
  AppState.isMonacoReady = false;
  c1.innerHTML = `<textarea id="fallback-textarea-a" class="code-textarea" placeholder="# Enter Program A code here..."></textarea>`;
  c2.innerHTML = `<textarea id="fallback-textarea-b" class="code-textarea" placeholder="# Enter Program B code here..."></textarea>`;
}

function getCodeA() {
  if (AppState.isMonacoReady && AppState.activeEditorA) {
    return AppState.activeEditorA.getValue();
  }
  const el = document.getElementById("fallback-textarea-a");
  return el ? el.value : "";
}

function setCodeA(val) {
  if (AppState.isMonacoReady && AppState.activeEditorA) {
    AppState.activeEditorA.setValue(val);
  } else {
    const el = document.getElementById("fallback-textarea-a");
    if (el) el.value = val;
  }
}

function getCodeB() {
  if (AppState.isMonacoReady && AppState.activeEditorB) {
    return AppState.activeEditorB.getValue();
  }
  const el = document.getElementById("fallback-textarea-b");
  return el ? el.value : "";
}

function setCodeB(val) {
  if (AppState.isMonacoReady && AppState.activeEditorB) {
    AppState.activeEditorB.setValue(val);
  } else {
    const el = document.getElementById("fallback-textarea-b");
    if (el) el.value = val;
  }
}

// -------------------------------------------------------------
// 3. Sample Benchmark Loader
// -------------------------------------------------------------
async function loadSampleCases() {
  try {
    const res = await fetch("/api/samples");
    const data = await res.json();
    if (data.success && data.samples) {
      AppState.samples = data.samples;
      const select = document.getElementById("sample-case-select");
      select.innerHTML = `<option value="">-- Choose a Benchmark Sample Case --</option>`;

      Object.entries(data.samples).forEach(([key, sample]) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = `${sample.title} (${sample.clone_type})`;
        select.appendChild(opt);
      });

      // Automatically load Case 1 by default
      select.value = "case1_identical";
      applySampleCase("case1_identical");
    }
  } catch (err) {
    console.error("Error loading sample cases:", err);
  }
}

function applySampleCase(key) {
  const sample = AppState.samples[key];
  if (!sample) return;

  setCodeA(sample.program_a);
  setCodeB(sample.program_b);

  const titleElA = document.getElementById("editor-title-a");
  const titleElB = document.getElementById("editor-title-b");
  if (titleElA) titleElA.textContent = sample.program_a_name || "Program A";
  if (titleElB) titleElB.textContent = sample.program_b_name || "Program B";

  const banner = document.getElementById("sample-desc-banner");
  if (banner) {
    banner.style.display = "block";
    banner.innerHTML = `<strong>${sample.title} [${sample.clone_type}]:</strong> ${sample.description}`;
  }

  hideSyntaxError();
}

// -------------------------------------------------------------
// 4. File Upload Handlers
// -------------------------------------------------------------
function handleFileUpload(file, target) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    if (target === "A") {
      setCodeA(content);
      const titleEl = document.getElementById("editor-title-a");
      if (titleEl) titleEl.textContent = file.name;
    } else {
      setCodeB(content);
      const titleEl = document.getElementById("editor-title-b");
      if (titleEl) titleEl.textContent = file.name;
    }
  };
  reader.readAsText(file);
}

// -------------------------------------------------------------
// 5. AST Visualizer Setup
// -------------------------------------------------------------
function initVisualizer() {
  AppState.visualizer = new ASTVisualizer("#ast-svg-root", "#ast-node-inspector");

  // Zoom controls
  document.getElementById("btn-viz-zoom-in")?.addEventListener("click", () => AppState.visualizer.zoomIn());
  document.getElementById("btn-viz-zoom-out")?.addEventListener("click", () => AppState.visualizer.zoomOut());
  document.getElementById("btn-viz-reset")?.addEventListener("click", () => AppState.visualizer.resetZoom());
  document.getElementById("btn-viz-expand-all")?.addEventListener("click", () => AppState.visualizer.expandAll());
  document.getElementById("btn-viz-collapse-all")?.addEventListener("click", () => AppState.visualizer.collapseAll());

  // Toggle Program A vs Program B AST
  document.getElementById("btn-viz-tree-a")?.addEventListener("click", (e) => {
    e.target.classList.add("active");
    document.getElementById("btn-viz-tree-b")?.classList.remove("active");
    AppState.activeTreeProgram = "A";
    if (AppState.currentComparison && AppState.currentComparison.ast_trees) {
      AppState.visualizer.render(AppState.currentComparison.ast_trees.tree_a);
    }
  });

  document.getElementById("btn-viz-tree-b")?.addEventListener("click", (e) => {
    e.target.classList.add("active");
    document.getElementById("btn-viz-tree-a")?.classList.remove("active");
    AppState.activeTreeProgram = "B";
    if (AppState.currentComparison && AppState.currentComparison.ast_trees) {
      AppState.visualizer.render(AppState.currentComparison.ast_trees.tree_b);
    }
  });
}

// -------------------------------------------------------------
// 6. AST Comparison Action
// -------------------------------------------------------------
async function runComparison() {
  hideSyntaxError();

  const codeA = getCodeA();
  const codeB = getCodeB();

  const normOptions = {
    normalize_variables: document.getElementById("norm-vars")?.checked ?? true,
    normalize_functions: document.getElementById("norm-funcs")?.checked ?? true,
    normalize_constants: document.getElementById("norm-consts")?.checked ?? false,
    strip_docstrings: document.getElementById("norm-docs")?.checked ?? true,
    sort_commutative_ops: document.getElementById("norm-comm")?.checked ?? true
  };

  const nameA = document.getElementById("editor-title-a")?.textContent.trim() || "Program A";
  const nameB = document.getElementById("editor-title-b")?.textContent.trim() || "Program B";

  const btnCompare = document.getElementById("btn-run-compare");
  const origBtnText = btnCompare ? btnCompare.innerHTML : "";
  if (btnCompare) {
    btnCompare.disabled = true;
    btnCompare.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Comparing ASTs...`;
  }

  try {
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code_a: codeA,
        code_b: codeB,
        name_a: nameA,
        name_b: nameB,
        normalization: normOptions,
        save_to_history: true
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showSyntaxError(data);
      return;
    }

    // Success: store comparison and render results
    AppState.currentComparison = data;
    renderResults(data, codeA, codeB);
    fetchHistory(); // refresh history table

    // Render tree in visualizer
    if (data.ast_trees && AppState.visualizer) {
      const activeTree = AppState.activeTreeProgram === "A" ? data.ast_trees.tree_a : data.ast_trees.tree_b;
      AppState.visualizer.render(activeTree);
    }

    // Navigate to Results page
    navigateTo("view-results");

  } catch (err) {
    showSyntaxError({
      target: "System",
      error: {
        error_type: "NetworkError",
        message: "Failed to connect to the CodeGuard AI backend. Ensure Flask is running on port 5000."
      }
    });
  } finally {
    if (btnCompare) {
      btnCompare.disabled = false;
      btnCompare.innerHTML = origBtnText;
    }
  }
}

// -------------------------------------------------------------
// 7. Results Dashboard Rendering
// -------------------------------------------------------------
function renderResults(data, codeA, codeB) {
  const m = data.metrics || {};
  const statsA = data.stats_a || {};
  const statsB = data.stats_b || {};

  // 1. Gauge and Score
  const astScore = m.ast_similarity ?? 0;
  const gaugeCircle = document.getElementById("results-gauge-circle");
  const gaugePercent = document.getElementById("results-gauge-val");
  const badgeEl = document.getElementById("results-category-badge");

  if (gaugePercent) gaugePercent.textContent = `${astScore}%`;

  let badgeClass = "badge-low";
  let gaugeColor = "#16a34a"; // green
  if (astScore >= 80) {
    badgeClass = "badge-high";
    gaugeColor = "#dc2626"; // red alert
  } else if (astScore >= 50) {
    badgeClass = "badge-mod";
    gaugeColor = "#d97706"; // amber
  }

  if (gaugeCircle) {
    const deg = (astScore / 100) * 360;
    gaugeCircle.style.background = `conic-gradient(${gaugeColor} ${deg}deg, #e2e8f0 ${deg}deg)`;
  }

  if (badgeEl) {
    badgeEl.className = `similarity-badge ${badgeClass}`;
    badgeEl.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${m.similarity_category || "Unclassified"}`;
  }

  // 2. Summary narrative
  const summaryEl = document.getElementById("results-summary-text");
  if (summaryEl) summaryEl.textContent = data.summary || "Comparison completed.";

  // 3. Quick metrics pills
  document.getElementById("pill-nodes-a").textContent = `Nodes A: ${statsA.total_nodes || 0}`;
  document.getElementById("pill-nodes-b").textContent = `Nodes B: ${statsB.total_nodes || 0}`;
  document.getElementById("pill-loc-a").textContent = `LOC A: ${statsA.loc || 0}`;
  document.getElementById("pill-loc-b").textContent = `LOC B: ${statsB.loc || 0}`;

  // 4. Metric cards
  document.getElementById("metric-ast-sim").textContent = `${astScore}%`;
  document.getElementById("metric-text-sim").textContent = `${m.text_similarity ?? 0}%`;
  document.getElementById("metric-token-sim").textContent = `${m.token_similarity ?? 0}%`;
  document.getElementById("metric-subtree-dice").textContent = `${m.subtree_dice ?? 0}%`;
  document.getElementById("metric-seq-alignment").textContent = `${m.sequence_similarity ?? 0}%`;
  document.getElementById("metric-node-cosine").textContent = `${m.node_distribution_cosine ?? 0}%`;

  // 5. Matched and Unmatched Tables
  renderStructuralTables(data.matched_node_types || [], data.unmatched_node_types || []);

  // 6. Side-by-Side Code Diff Viewer with Matched Block Highlighting
  renderSideBySideCode(codeA, codeB, data.matched_regions || []);
}

function renderStructuralTables(matched, unmatched) {
  const matchedTbody = document.querySelector("#table-matched-nodes tbody");
  const unmatchedTbody = document.querySelector("#table-unmatched-nodes tbody");

  if (matchedTbody) {
    if (matched.length === 0) {
      matchedTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No common AST node types detected</td></tr>`;
    } else {
      matchedTbody.innerHTML = matched.map(item => `
        <tr>
          <td><span class="tag-node-type">${item.type}</span></td>
          <td>${item.count_a}</td>
          <td>${item.count_b}</td>
          <td>${item.difference === 0 ? '<span style="color:#16a34a; font-weight:600;">Exact (0)</span>' : item.difference}</td>
        </tr>
      `).join("");
    }
  }

  if (unmatchedTbody) {
    if (unmatched.length === 0) {
      unmatchedTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);"><i class="fa-solid fa-check" style="color:#16a34a;"></i> 100% AST node types shared</td></tr>`;
    } else {
      unmatchedTbody.innerHTML = unmatched.map(item => `
        <tr>
          <td><span class="tag-node-type">${item.type}</span></td>
          <td>${item.present_in}</td>
          <td>${item.count_a || item.count_b}</td>
        </tr>
      `).join("");
    }
  }
}

function renderSideBySideCode(codeA, codeB, matchedRegions) {
  const containerA = document.getElementById("diff-col-a");
  const containerB = document.getElementById("diff-col-b");
  if (!containerA || !containerB) return;

  const linesA = (codeA || "").split("\n");
  const linesB = (codeB || "").split("\n");

  // Build line match sets for fast lookup
  const matchedLinesA = new Set();
  const matchedLinesB = new Set();

  matchedRegions.forEach(r => {
    for (let l = r.lines_a[0]; l <= r.lines_a[1]; l++) matchedLinesA.add(l);
    for (let l = r.lines_b[0]; l <= r.lines_b[1]; l++) matchedLinesB.add(l);
  });

  const renderLines = (lines, matchSet) => {
    return lines.map((text, idx) => {
      const lineNum = idx + 1;
      const isMatched = matchSet.has(lineNum);
      const matchedClass = isMatched ? "matched-block" : "";
      return `
        <div class="diff-line ${matchedClass}">
          <span class="line-no">${lineNum}</span>
          <span class="line-code">${escapeHtml(text || " ")}</span>
        </div>
      `;
    }).join("");
  };

  containerA.innerHTML = renderLines(linesA, matchedLinesA);
  containerB.innerHTML = renderLines(linesB, matchedLinesB);
}

// -------------------------------------------------------------
// 8. Syntax Error Alert
// -------------------------------------------------------------
function showSyntaxError(errData) {
  const banner = document.getElementById("syntax-error-banner");
  if (!banner) return;

  const target = errData.target || "Program";
  const err = errData.error || {};

  banner.classList.add("active");
  banner.innerHTML = `
    <h5><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(target)}: ${escapeHtml(err.error_type || "Syntax Error")}</h5>
    <p style="font-size:0.875rem; color:#991b1b; margin-bottom:0.35rem;">${escapeHtml(err.message || "Invalid Python syntax detected.")}</p>
    ${err.snippet ? `<div class="syntax-error-snippet">${escapeHtml(err.snippet)}\n${escapeHtml(err.pointer || "")}</div>` : ""}
  `;

  // Navigate to workspace so user sees their error immediately
  navigateTo("view-workspace");
  banner.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideSyntaxError() {
  const banner = document.getElementById("syntax-error-banner");
  if (banner) {
    banner.classList.remove("active");
    banner.innerHTML = "";
  }
}

// -------------------------------------------------------------
// 9. Comparison History Management
// -------------------------------------------------------------
async function fetchHistory() {
  try {
    const res = await fetch("/api/history");
    const data = await res.json();
    if (data.success) {
      renderHistoryTable(data.history || []);
    }
  } catch (err) {
    console.error("Error fetching history:", err);
  }
}

function renderHistoryTable(items) {
  const tbody = document.querySelector("#history-table tbody");
  const emptyPlaceholder = document.getElementById("history-empty-placeholder");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = "";
    if (emptyPlaceholder) emptyPlaceholder.style.display = "block";
    return;
  }

  if (emptyPlaceholder) emptyPlaceholder.style.display = "none";

  tbody.innerHTML = items.map(item => {
    let badgeClass = "badge-low";
    if (item.ast_similarity >= 80) badgeClass = "badge-high";
    else if (item.ast_similarity >= 50) badgeClass = "badge-mod";

    return `
      <tr>
        <td style="font-size:0.75rem; color:var(--text-muted);">${item.timestamp}</td>
        <td><strong>${escapeHtml(item.program_a_name)}</strong> vs <strong>${escapeHtml(item.program_b_name)}</strong></td>
        <td>
          <span class="similarity-badge ${badgeClass}" style="font-size:0.75rem;">
            ${item.ast_similarity}% (${item.similarity_category})
          </span>
        </td>
        <td>Text: ${item.text_similarity}%</td>
        <td>${item.nodes_a} / ${item.nodes_b}</td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="viewHistoryItem(${item.id})">
              <i class="fa-solid fa-eye"></i> View
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteHistoryItem(${item.id})">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

window.viewHistoryItem = async function(id) {
  try {
    const res = await fetch(`/api/history/${id}`);
    const data = await res.json();
    if (data.success && data.comparison) {
      const rec = data.comparison;
      const details = rec.details || {};

      // Structure data object for renderResults
      const compositeData = {
        metrics: details.metrics || {
          ast_similarity: rec.ast_similarity,
          similarity_category: rec.similarity_category,
          text_similarity: rec.text_similarity,
          token_similarity: rec.token_similarity
        },
        stats_a: details.stats_a || { total_nodes: rec.nodes_a },
        stats_b: details.stats_b || { total_nodes: rec.nodes_b },
        summary: rec.summary,
        matched_node_types: details.matched_node_types || [],
        unmatched_node_types: details.unmatched_node_types || [],
        matched_regions: details.matched_regions || []
      };

      renderResults(compositeData, rec.program_a_snippet || "", rec.program_b_snippet || "");
      navigateTo("view-results");
    }
  } catch (err) {
    alert("Failed to load history report: " + err.message);
  }
};

window.deleteHistoryItem = async function(id) {
  if (!confirm(`Delete comparison report #${id}?`)) return;
  try {
    const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      await fetchHistory();
    }
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
};

async function clearAllHistory() {
  if (!confirm("Are you sure you want to clear all comparison history?")) return;
  try {
    const res = await fetch("/api/history", { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      await fetchHistory();
    }
  } catch (err) {
    alert("Clear failed: " + err.message);
  }
}

// -------------------------------------------------------------
// 10. Compiler Design Workflow Pipeline Component
// -------------------------------------------------------------
function initPipeline() {
  const container = document.getElementById("pipeline-diagram-container");
  if (!container) return;

  container.innerHTML = PIPELINE_STAGES.map((stage, idx) => `
    <div class="pipeline-stage ${idx === 0 ? 'active' : ''}" data-step="${stage.step}">
      <div class="stage-number">${stage.step}</div>
      <div class="stage-name">${stage.name}</div>
      <div class="stage-desc-short">${stage.short}</div>
    </div>
    ${idx < PIPELINE_STAGES.length - 1 ? '<div class="pipeline-arrow"><i class="fa-solid fa-arrow-right"></i></div>' : ''}
  `).join("");

  document.querySelectorAll(".pipeline-stage").forEach(stageEl => {
    stageEl.addEventListener("click", () => {
      document.querySelectorAll(".pipeline-stage").forEach(s => s.classList.remove("active"));
      stageEl.classList.add("active");
      const step = parseInt(stageEl.getAttribute("data-step"), 10);
      showPipelineStageDetail(step);
    });
  });

  showPipelineStageDetail(1);
}

function showPipelineStageDetail(step) {
  const stage = PIPELINE_STAGES.find(s => s.step === step) || PIPELINE_STAGES[0];
  const box = document.getElementById("pipeline-deep-dive-box");
  if (!box) return;

  box.innerHTML = `
    <h4><i class="fa-solid fa-gears"></i> ${stage.title}</h4>
    <p><strong>Formal Compiler Concept:</strong> ${stage.theory}</p>
    <p><strong>Industry Implementation (CPython/GCC/LLVM):</strong> ${stage.compilerRole}</p>
    <p><strong>CodeGuard AI Execution:</strong> ${stage.codeGuardAction}</p>
    <div class="stage-example-box">
      <div style="font-weight:700; color:var(--text-muted); margin-bottom:0.35rem; font-size:0.75rem;">TRANSFORMATION ARTIFACT EXAMPLE:</div>
      <code>${escapeHtml(stage.example)}</code>
    </div>
  `;
}

// -------------------------------------------------------------
// 11. Event Listeners & Utility Helpers
// -------------------------------------------------------------
function initEventListeners() {
  // Sample selector dropdown change
  document.getElementById("sample-case-select")?.addEventListener("change", (e) => {
    if (e.target.value) {
      applySampleCase(e.target.value);
    }
  });

  // Action buttons
  document.getElementById("btn-run-compare")?.addEventListener("click", runComparison);
  document.getElementById("btn-swap-code")?.addEventListener("click", () => {
    const a = getCodeA();
    const b = getCodeB();
    setCodeA(b);
    setCodeB(a);
  });
  document.getElementById("btn-clear-code")?.addEventListener("click", () => {
    if (confirm("Clear both code editors?")) {
      setCodeA("");
      setCodeB("");
      hideSyntaxError();
    }
  });
  document.getElementById("btn-reset-code")?.addEventListener("click", () => {
    applySampleCase("case1_identical");
  });

  // File uploads
  document.getElementById("file-upload-a")?.addEventListener("change", (e) => {
    handleFileUpload(e.target.files[0], "A");
  });
  document.getElementById("file-upload-b")?.addEventListener("change", (e) => {
    handleFileUpload(e.target.files[0], "B");
  });

  // Clear history button
  document.getElementById("btn-clear-history")?.addEventListener("click", clearAllHistory);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
