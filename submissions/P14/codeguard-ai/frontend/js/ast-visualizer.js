/**
 * CodeGuard AI - AST Visualizer Component
 * Interactive SVG / D3 Tree Visualizer for Abstract Syntax Trees.
 * Features:
 * - Collapsible / Expandable nodes
 * - Pan & Zoom interaction
 * - Category-based semantic color coding
 * - Matched vs Unmatched node styling
 * - Compiler Design Node Inspector integration
 */

class ASTVisualizer {
  constructor(svgSelector, inspectorSelector) {
    this.svgElement = document.querySelector(svgSelector);
    this.inspectorElement = document.querySelector(inspectorSelector);
    this.currentData = null;
    this.rootNode = null;
    this.d3TreeLayout = null;
    this.zoomBehavior = null;
    this.svgGroup = null;
    this.selectedNodeId = null;

    // Dimensions
    this.width = 900;
    this.height = 600;

    // Color mapping by category
    this.categoryColors = {
      Statement: "#3b82f6",     // Blue
      ControlFlow: "#10b981",   // Emerald Green
      Operation: "#8b5cf6",     // Violet Purple
      Call: "#6366f1",          // Indigo
      Constant: "#f59e0b",      // Amber
      Identifier: "#06b6d4",    // Cyan
      Collection: "#ec4899",    // Pink
      Parameter: "#14b8a6",     // Teal
      Operator: "#a855f7",      // Purple
      Expression: "#64748b",    // Slate
      Structure: "#475569"      // Dark Slate
    };

    this.init();
  }

  init() {
    if (!this.svgElement) return;

    const svg = d3.select(this.svgElement);
    svg.selectAll("*").remove();

    // Responsive container bounds
    const rect = this.svgElement.getBoundingClientRect();
    this.width = rect.width || 900;
    this.height = rect.height || 600;

    // Setup zoom container group
    this.svgGroup = svg.append("g").attr("class", "ast-main-group");

    this.zoomBehavior = d3.zoom()
      .scaleExtent([0.15, 3.0])
      .on("zoom", (event) => {
        this.svgGroup.attr("transform", event.transform);
      });

    svg.call(this.zoomBehavior)
       .on("dblclick.zoom", null); // Disable double click zoom for click ergonomics
  }

  render(treeData) {
    if (!treeData) return;
    this.currentData = treeData;

    // Setup D3 hierarchy
    this.rootNode = d3.hierarchy(treeData, d => d.children);
    this.rootNode.x0 = this.height / 2;
    this.rootNode.y0 = 60;

    // Collapse nodes deeper than depth 2 by default to keep initial view clean
    const collapseDeepNodes = (d) => {
      if (d.children) {
        if (d.depth >= 2) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children.forEach(collapseDeepNodes);
        }
      }
    };
    collapseDeepNodes(this.rootNode);

    this.update(this.rootNode);
    this.resetZoom();

    // Auto-select root node for inspector
    this.inspectNode(treeData);
  }

  update(source) {
    const duration = 400;

    // Compute tree layout: vertical layout with level spacing
    const treeLayout = d3.tree()
      .nodeSize([65, 110]); // [dx, dy]

    treeLayout(this.rootNode);

    const nodes = this.rootNode.descendants();
    const links = this.rootNode.links();

    // Normalize depth positions
    nodes.forEach(d => {
      d.y = d.depth * 105;
    });

    // -------------------------------------------------------------
    // NODES
    // -------------------------------------------------------------
    const nodeSelection = this.svgGroup.selectAll("g.ast-node")
      .data(nodes, d => d.data.id || (d.data.id = `${d.depth}_${d.x}`));

    // Enter new nodes
    const nodeEnter = nodeSelection.enter().append("g")
      .attr("class", "ast-node")
      .attr("transform", d => `translate(${source.x0 || 0},${source.y0 || 0})`)
      .on("click", (event, d) => {
        event.stopPropagation();
        this.onNodeClick(d);
      });

    // Node outer circle (category color)
    nodeEnter.append("circle")
      .attr("r", 1e-6)
      .attr("class", "node-circle")
      .attr("cursor", "pointer")
      .style("stroke-width", d => d.data.is_matched ? "3.5px" : "2px")
      .style("stroke", d => d.data.is_matched ? "#16a34a" : "#cbd5e1")
      .style("fill", d => this.categoryColors[d.data.category] || "#475569");

    // Indicator badge for collapsed nodes (+/-)
    nodeEnter.append("text")
      .attr("class", "node-toggle-glyph")
      .attr("dy", "0.32em")
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text(d => d._children ? "+" : (d.children ? "−" : ""));

    // Node text label
    nodeEnter.append("text")
      .attr("class", "node-label")
      .attr("dy", "1.75em")
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--font-sans)")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#1e293b")
      .text(d => d.data.label || d.data.name);

    // UPDATE
    const nodeUpdate = nodeSelection.merge(nodeEnter).transition().duration(duration)
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodeUpdate.select("circle.node-circle")
      .attr("r", 14)
      .style("stroke", d => {
        if (d.data.id === this.selectedNodeId) return "#2563eb"; // selected
        if (d.data.is_matched) return "#16a34a"; // matched
        return "#cbd5e1";
      })
      .style("stroke-width", d => (d.data.id === this.selectedNodeId || d.data.is_matched) ? "3px" : "1.5px")
      .style("fill", d => this.categoryColors[d.data.category] || "#475569");

    nodeUpdate.select(".node-toggle-glyph")
      .text(d => d._children ? "+" : (d.children ? "−" : ""));

    // EXIT
    const nodeExit = nodeSelection.exit().transition().duration(duration)
      .attr("transform", d => `translate(${source.x},${source.y})`)
      .remove();

    nodeExit.select("circle").attr("r", 1e-6);
    nodeExit.select("text").style("fill-opacity", 1e-6);

    // -------------------------------------------------------------
    // LINKS
    // -------------------------------------------------------------
    const linkSelection = this.svgGroup.selectAll("path.ast-link")
      .data(links, d => d.target.data.id);

    // Enter links
    const linkEnter = linkSelection.enter().insert("path", "g")
      .attr("class", "ast-link")
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1.5)
      .attr("d", d => {
        const o = { x: source.x0 || 0, y: source.y0 || 0 };
        return this.diagonalPath(o, o);
      });

    // UPDATE links
    linkSelection.merge(linkEnter).transition().duration(duration)
      .attr("stroke", d => (d.source.data.is_matched && d.target.data.is_matched) ? "#86efac" : "#cbd5e1")
      .attr("stroke-width", d => (d.source.data.is_matched && d.target.data.is_matched) ? 2 : 1.5)
      .attr("d", d => this.diagonalPath(d.source, d.target));

    // EXIT links
    linkSelection.exit().transition().duration(duration)
      .attr("d", d => {
        const o = { x: source.x, y: source.y };
        return this.diagonalPath(o, o);
      })
      .remove();

    // Store old positions for smooth animated transitions
    nodes.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  diagonalPath(s, d) {
    // Smooth cubic bezier curve from parent to child
    return `M ${s.x} ${s.y}
            C ${s.x} ${(s.y + d.y) / 2},
              ${d.x} ${(s.y + d.y) / 2},
              ${d.x} ${d.y}`;
  }

  onNodeClick(d) {
    // Toggle expand / collapse children
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else if (d._children) {
      d.children = d._children;
      d._children = null;
    }

    this.selectedNodeId = d.data.id;
    this.update(d);
    this.inspectNode(d.data);
  }

  inspectNode(data) {
    if (!this.inspectorElement || !data) return;

    const attrs = data.attributes || {};
    let attrHtml = "";
    if (Object.keys(attrs).length > 0) {
      attrHtml = Object.entries(attrs)
        .map(([k, v]) => `<div><span style="color:var(--text-muted); font-size:0.75rem;">${k}:</span> <code class="inspector-code">${v}</code></div>`)
        .join("");
    } else {
      attrHtml = `<span style="color:var(--text-muted); font-style:italic;">No custom attributes</span>`;
    }

    const linesHtml = data.lineno
      ? `Lines ${data.lineno}:${data.col_offset || 0} to ${data.end_lineno || data.lineno}:${data.end_col_offset || ""}`
      : "Top-level Module Context";

    const matchedHtml = data.is_matched
      ? `<span class="similarity-badge badge-low"><i class="fa-solid fa-check"></i> Matched in Both Programs</span>`
      : `<span class="similarity-badge badge-mod"><i class="fa-solid fa-info-circle"></i> Unmatched / Unique Node</span>`;

    this.inspectorElement.innerHTML = `
      <div class="inspector-field">
        <div class="inspector-label">AST Node Type</div>
        <div class="inspector-val" style="display:flex; align-items:center; gap:0.5rem;">
          <span style="font-weight:700; font-size:1.05rem;">${data.name}</span>
          <span class="editor-badge" style="background:${this.categoryColors[data.category] || '#64748b'}; color:#fff;">${data.category}</span>
        </div>
      </div>

      <div class="inspector-field">
        <div class="inspector-label">Source Code Mapping</div>
        <div class="inspector-val" style="font-family:var(--font-mono); font-size:0.8rem; color:#1e293b;">
          <i class="fa-regular fa-file-code"></i> ${linesHtml}
        </div>
      </div>

      <div class="inspector-field">
        <div class="inspector-label">Structural Match Status</div>
        <div>${matchedHtml}</div>
      </div>

      <div class="inspector-field">
        <div class="inspector-label">Node Semantic Attributes</div>
        <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.25rem;">
          ${attrHtml}
        </div>
      </div>

      <div class="inspector-field" style="margin-top:auto;">
        <div class="inspector-label">Compiler Design Role</div>
        <div class="compiler-role-box">
          <i class="fa-solid fa-graduation-cap" style="color:var(--accent-purple);"></i>
          ${data.doc || "Standard Python syntactic node."}
        </div>
      </div>
    `;
  }

  zoomIn() {
    d3.select(this.svgElement).transition().duration(250).call(this.zoomBehavior.scaleBy, 1.3);
  }

  zoomOut() {
    d3.select(this.svgElement).transition().duration(250).call(this.zoomBehavior.scaleBy, 0.7);
  }

  resetZoom() {
    if (!this.svgElement) return;
    const svg = d3.select(this.svgElement);
    const rect = this.svgElement.getBoundingClientRect();
    const initialTransform = d3.zoomIdentity
      .translate(rect.width / 2, 50)
      .scale(0.85);

    svg.transition().duration(400).call(this.zoomBehavior.transform, initialTransform);
  }

  expandAll() {
    if (!this.rootNode) return;
    const expand = (d) => {
      if (d._children) {
        d.children = d._children;
        d._children = null;
      }
      if (d.children) d.children.forEach(expand);
    };
    expand(this.rootNode);
    this.update(this.rootNode);
  }

  collapseAll() {
    if (!this.rootNode) return;
    const collapse = (d) => {
      if (d.children) {
        d._children = d.children;
        d.children = null;
        d._children.forEach(collapse);
      }
    };
    if (this.rootNode.children) {
      this.rootNode.children.forEach(collapse);
    }
    this.update(this.rootNode);
  }
}
