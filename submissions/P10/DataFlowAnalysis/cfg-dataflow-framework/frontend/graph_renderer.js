// Interactive Control Flow Graph SVG Renderer with Layered DAG Layout

export class CFGGraphRenderer {
  constructor(svgElement, onNodeSelect) {
    this.svg = svgElement;
    this.viewport = svgElement ? (svgElement.querySelector('#viewport-group') || svgElement) : null;
    this.edgesLayer = svgElement ? (svgElement.querySelector('#edges-layer') || this.viewport) : null;
    this.nodesLayer = svgElement ? (svgElement.querySelector('#nodes-layer') || this.viewport) : null;
    this.onNodeSelect = onNodeSelect;

    this.scale = 1;
    this.translateX = 40;
    this.translateY = 40;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    this.graphData = null;
    this.nodeLayouts = new Map(); // id -> { x, y, width, height, level }
    this.selectedNodeId = null;

    if (this.svg) {
      this.initEvents();
    }
  }

  initEvents() {
    this.svg.addEventListener('mousedown', (e) => {
      // Don't drag canvas if clicking a node
      if (e.target.closest('.cfg-node')) return;
      this.isDragging = true;
      this.dragStartX = e.clientX - this.translateX;
      this.dragStartY = e.clientY - this.translateY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.translateX = e.clientX - this.dragStartX;
      this.translateY = e.clientY - this.dragStartY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(0.2, this.scale * zoomFactor), 3);
      
      // Zoom centered on mouse
      const rect = this.svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.translateX = mouseX - (mouseX - this.translateX) * (newScale / this.scale);
      this.translateY = mouseY - (mouseY - this.translateY) * (newScale / this.scale);
      this.scale = newScale;
      this.updateTransform();
    }, { passive: false });
  }

  zoomIn() {
    this.scale = Math.min(3, this.scale * 1.2);
    this.updateTransform();
  }

  zoomOut() {
    this.scale = Math.max(0.2, this.scale / 1.2);
    this.updateTransform();
  }

  resetZoom() {
    this.scale = 1;
    this.translateX = 60;
    this.translateY = 40;
    this.updateTransform();
  }

  fitToScreen() {
    if (!this.nodeLayouts.size || !this.svg) return;
    const rect = this.svg.getBoundingClientRect();
    const containerWidth = rect.width > 0 ? rect.width : (this.svg.clientWidth || 800);
    const containerHeight = rect.height > 0 ? rect.height : (this.svg.clientHeight || 500);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const layout of this.nodeLayouts.values()) {
      minX = Math.min(minX, layout.x);
      minY = Math.min(minY, layout.y);
      maxX = Math.max(maxX, layout.x + layout.width);
      maxY = Math.max(maxY, layout.y + layout.height);
    }

    const graphWidth = maxX - minX + 100;
    const graphHeight = maxY - minY + 100;

    const scaleX = containerWidth / Math.max(graphWidth, 1);
    const scaleY = containerHeight / Math.max(graphHeight, 1);
    this.scale = Math.max(0.3, Math.min(Math.min(scaleX, scaleY), 1.2));
    if (isNaN(this.scale) || this.scale <= 0) this.scale = 1;

    this.translateX = (containerWidth - graphWidth * this.scale) / 2 - minX * this.scale + 50 * this.scale;
    if (isNaN(this.translateX)) this.translateX = 40;
    this.translateY = 40;
    this.updateTransform();
  }

  updateTransform() {
    if (!this.viewport) return;
    this.viewport.setAttribute(
      'transform',
      `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`
    );
  }

  computeLayout(blocks, edges) {
    this.nodeLayouts.clear();
    const levels = new Map(); // id -> int level
    const blockMap = new Map(blocks.map(b => [b.id, b]));

    // 1. Assign topological levels
    levels.set('ENTRY', 0);

    const visited = new Set(['ENTRY']);
    const queue = ['ENTRY'];

    while (queue.length > 0) {
      const currId = queue.shift();
      const currLevel = levels.get(currId);
      const currBlock = blockMap.get(currId);
      if (!currBlock) continue;

      for (const succId of currBlock.successors) {
        // Check for back-edge: if already visited and succ level <= curr level, don't increment
        const existingLevel = levels.get(succId);
        if (existingLevel === undefined || existingLevel < currLevel + 1) {
          // If not visited or pushing forward
          if (!visited.has(succId) || succId === 'EXIT') {
            levels.set(succId, currLevel + 1);
            visited.add(succId);
            queue.push(succId);
          }
        }
      }
    }

    // Ensure all blocks have a level
    let maxLevel = 0;
    for (const [id, lvl] of levels.entries()) {
      if (id !== 'EXIT') maxLevel = Math.max(maxLevel, lvl);
    }

    for (const b of blocks) {
      if (!levels.has(b.id)) {
        levels.set(b.id, maxLevel + 1);
      }
    }
    // EXIT is always bottom
    levels.set('EXIT', maxLevel + 2);

    // Group blocks by level
    const levelGroups = new Map();
    for (const [id, lvl] of levels.entries()) {
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
      levelGroups.get(lvl).push(id);
    }

    // Compute dimensions and positions
    const HORIZONTAL_GAP = 70;
    const VERTICAL_GAP = 90;
    let currentY = 20;

    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

    for (const lvl of sortedLevels) {
      const group = levelGroups.get(lvl);
      const groupWidths = [];

      for (const bId of group) {
        const block = blockMap.get(bId);
        const lineCount = (block?.instructions?.length || 0);
        const width = 230;
        const height = block.is_entry || block.is_exit ? 50 : Math.max(70, 38 + lineCount * 22);
        groupWidths.push({ id: bId, width, height });
      }

      const totalRowWidth = groupWidths.reduce((acc, curr) => acc + curr.width, 0) + (group.length - 1) * HORIZONTAL_GAP;
      let startX = 350 - totalRowWidth / 2;
      let maxHeightInRow = 0;

      for (const item of groupWidths) {
        this.nodeLayouts.set(item.id, {
          x: startX,
          y: currentY,
          width: item.width,
          height: item.height,
          level: lvl
        });
        startX += item.width + HORIZONTAL_GAP;
        maxHeightInRow = Math.max(maxHeightInRow, item.height);
      }

      currentY += maxHeightInRow + VERTICAL_GAP;
    }
  }

  render(graphData) {
    this.graphData = graphData;
    if (this.edgesLayer) this.edgesLayer.innerHTML = '';
    if (this.nodesLayer) this.nodesLayer.innerHTML = '';

    const emptyState = document.querySelector('#graph-empty-state');
    if (!graphData || !graphData.blocks || graphData.blocks.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    this.computeLayout(graphData.blocks, graphData.edges || []);

    // Render Edges first (under nodes)
    for (const edge of (graphData.edges || [])) {
      this.renderEdge(edge);
    }

    // Render Nodes
    for (const block of (graphData.blocks || [])) {
      this.renderNode(block);
    }

    this.fitToScreen();
  }

  renderNode(block) {
    const layout = this.nodeLayouts.get(block.id);
    if (!layout) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `cfg-node ${block.is_entry ? 'entry' : ''} ${block.is_exit ? 'exit' : ''}`);
    g.setAttribute('id', `node-${block.id}`);
    g.setAttribute('transform', `translate(${layout.x}, ${layout.y})`);

    // Main background card
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'node-bg');
    rect.setAttribute('width', layout.width);
    rect.setAttribute('height', layout.height);
    g.appendChild(rect);

    // Header rect
    const headerHeight = 28;
    const header = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    header.setAttribute('class', 'node-header-bg');
    header.setAttribute('width', layout.width);
    header.setAttribute('height', headerHeight);
    header.setAttribute('rx', 8);
    header.setAttribute('ry', 8);
    g.appendChild(header);

    // Header text
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('class', 'node-title');
    title.setAttribute('x', 14);
    title.setAttribute('y', 19);
    title.textContent = block.is_entry ? 'ENTRY' : (block.is_exit ? 'EXIT' : `${block.id} (${block.name})`);
    g.appendChild(title);

    // Instruction Lines
    if (block.instructions && block.instructions.length > 0) {
      let lineY = headerHeight + 18;
      for (const instr of block.instructions) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('class', `node-code-text ${instr.is_leader ? 'leader-line' : ''}`);
        text.setAttribute('x', 14);
        text.setAttribute('y', lineY);
        
        // Show leader star and raw instruction
        const prefix = instr.is_leader ? '★ ' : '  ';
        text.textContent = `${prefix}${instr.raw}`;
        g.appendChild(text);

        lineY += 20;
      }
    } else if (block.is_entry || block.is_exit) {
      const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sub.setAttribute('class', 'node-code-text');
      sub.setAttribute('x', 14);
      sub.setAttribute('y', headerHeight + 14);
      sub.textContent = block.is_entry ? 'Program Entrypoint' : 'Program Termination';
      g.appendChild(sub);
    }

    g.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(block.id);
    });

    this.nodesLayer.appendChild(g);
  }

  selectNode(blockId) {
    this.selectedNodeId = blockId;
    // Highlight node
    const allNodes = this.nodesLayer.querySelectorAll('.cfg-node');
    allNodes.forEach(n => n.classList.remove('active'));

    const targetNode = this.nodesLayer.querySelector(`#node-${blockId}`);
    if (targetNode) targetNode.classList.add('active');

    if (this.onNodeSelect && this.graphData) {
      const block = this.graphData.blocks.find(b => b.id === blockId);
      if (block) this.onNodeSelect(block);
    }
  }

  renderEdge(edge) {
    const src = this.nodeLayouts.get(edge.source);
    const tgt = this.nodeLayouts.get(edge.target);
    if (!src || !tgt) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `edge-group edge-${edge.type}`);

    let markerId = 'arrow-fallthrough';
    if (edge.type === 'conditional_true') markerId = 'arrow-true';
    else if (edge.type === 'conditional_false') markerId = 'arrow-false';
    else if (edge.type === 'unconditional') markerId = 'arrow-unconditional';
    else if (edge.type === 'back_edge') markerId = 'arrow-loop';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', `cfg-edge edge-${edge.type}`);
    path.setAttribute('marker-end', `url(#${markerId})`);

    let d = '';
    const srcCenterX = src.x + src.width / 2;
    const srcBottomY = src.y + src.height;
    const tgtCenterX = tgt.x + tgt.width / 2;
    const tgtTopY = tgt.y;

    if (edge.type === 'back_edge' || tgt.level <= src.level) {
      // Curve out to the left or right for back edges (loops)
      const offset = 90;
      const startX = src.x;
      const startY = src.y + src.height / 2;
      const endX = tgt.x;
      const endY = tgt.y + tgt.height / 2;
      const controlX = Math.min(startX, endX) - offset;

      d = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
    } else {
      // Forward edge: smooth cubic bezier
      const dy = tgtTopY - srcBottomY;
      const cpY1 = srcBottomY + Math.max(dy / 2, 20);
      const cpY2 = tgtTopY - Math.max(dy / 2, 20);

      d = `M ${srcCenterX} ${srcBottomY} C ${srcCenterX} ${cpY1}, ${tgtCenterX} ${cpY2}, ${tgtCenterX} ${tgtTopY}`;
    }

    path.setAttribute('d', d);
    g.appendChild(path);

    // Label if present
    if (edge.label) {
      const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelText.setAttribute('class', 'edge-label-text');

      if (edge.type === 'back_edge') {
        labelText.setAttribute('x', Math.min(src.x, tgt.x) - 70);
        labelText.setAttribute('y', (src.y + tgt.y) / 2);
      } else {
        labelText.setAttribute('x', (srcCenterX + tgtCenterX) / 2 + 10);
        labelText.setAttribute('y', (srcBottomY + tgtTopY) / 2);
      }
      labelText.textContent = edge.label;
      g.appendChild(labelText);
    }

    this.edgesLayer.appendChild(g);
  }
}
