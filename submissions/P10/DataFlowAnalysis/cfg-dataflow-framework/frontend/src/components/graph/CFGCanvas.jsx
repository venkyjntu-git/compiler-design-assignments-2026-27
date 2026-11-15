import React, { useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Controls,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './CFGNode';
import EmptyState from '../common/EmptyState';
import { GitBranch, Maximize2, RotateCcw, Info } from 'lucide-react';

function CFGCanvasInner({
  cfgData,
  selectedBlockId,
  onSelectBlock,
  onAnalyze,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}) {
  const { fitView } = useReactFlow();

  // Re-fit view smoothly whenever nodes update
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.25, duration: 250 });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [nodes, fitView]);

  const handleNodeClick = useCallback(
    (_, node) => {
      if (cfgData && cfgData.blocks) {
        const block = cfgData.blocks.find((b) => b.id === node.id);
        if (block && onSelectBlock) {
          onSelectBlock(block);
        }
      }
    },
    [cfgData, onSelectBlock]
  );

  const userBlockCount =
    cfgData?.blocks?.filter((b) => !b.is_entry && !b.is_exit).length || 0;
  const backEdgeCount =
    cfgData?.edges?.filter((e) => e.type === 'back_edge').length || 0;

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.2}
      maxZoom={2.5}
      defaultEdgeOptions={{ type: 'smoothstep' }}
    >
      <Background color="#293140" gap={24} size={1} />
      <Controls position="bottom-left" showInteractive={false} />

      {/* MiniMap */}
      <MiniMap
        position="bottom-right"
        nodeColor={(n) => {
          if (n.data?.type === 'ENTRY') return '#7C8CFF';
          if (n.data?.type === 'EXIT') return '#929BAD';
          return '#171C26';
        }}
        maskColor="rgba(11, 13, 18, 0.75)"
        className="cfg-minimap"
      />

      {/* Top-Left: Legend Panel */}
      <Panel position="top-left">
        <div className="cfg-legend-card">
          <span className="legend-chip">
            <span className="swatch swatch-entry" /> Entry/Exit
          </span>
          <span className="legend-chip">
            <span className="swatch swatch-block" /> Basic Block
          </span>
          <span className="legend-chip">
            <span className="swatch swatch-leader">★</span> Leader
          </span>
          <span className="legend-chip">
            <span className="swatch swatch-true" /> True
          </span>
          <span className="legend-chip">
            <span className="swatch swatch-false" /> False
          </span>
          <span className="legend-chip">
            <span className="swatch swatch-loop" /> Loop Back
          </span>
        </div>
      </Panel>

      {/* Top-Right: Quick HUD Telemetry */}
      <Panel position="top-right">
        <div className="cfg-hud-card">
          <span className="hud-metric">
            Blocks: <strong className="text-accent">{userBlockCount}</strong>
          </span>
          <span className="hud-metric">
            Edges: <strong>{cfgData?.edges?.length || 0}</strong>
          </span>
          {backEdgeCount > 0 && (
            <span className="hud-metric">
              Loops: <strong className="text-violet">{backEdgeCount}</strong>
            </span>
          )}
        </div>
      </Panel>
    </ReactFlow>
  );
}

export default function CFGCanvas({
  cfgData,
  selectedBlockId,
  evaluatingBlockId,
  onSelectBlock,
  onAnalyze,
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Compute hierarchical layout when cfgData changes
  useEffect(() => {
    if (!cfgData || !cfgData.blocks || cfgData.blocks.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const blocks = cfgData.blocks;
    const rawEdges = cfgData.edges || [];
    const blockMap = new Map(blocks.map((b) => [b.id, b]));

    // 1. Assign BFS topological ranks
    const levels = new Map();
    levels.set('ENTRY', 0);

    const visited = new Set(['ENTRY']);
    const queue = ['ENTRY'];

    while (queue.length > 0) {
      const currId = queue.shift();
      const currLevel = levels.get(currId);
      const currBlock = blockMap.get(currId);
      if (!currBlock) continue;

      for (const succId of currBlock.successors || []) {
        const existingLevel = levels.get(succId);
        if (existingLevel === undefined || existingLevel < currLevel + 1) {
          if (!visited.has(succId) || succId === 'EXIT') {
            levels.set(succId, currLevel + 1);
            visited.add(succId);
            queue.push(succId);
          }
        }
      }
    }

    let maxLevel = 0;
    for (const [id, lvl] of levels.entries()) {
      if (id !== 'EXIT') maxLevel = Math.max(maxLevel, lvl);
    }
    for (const b of blocks) {
      if (!levels.has(b.id)) {
        levels.set(b.id, maxLevel + 1);
      }
    }
    levels.set('EXIT', maxLevel + 2);

    // Group by level
    const levelGroups = new Map();
    for (const [id, lvl] of levels.entries()) {
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
      levelGroups.get(lvl).push(id);
    }

    const HORIZONTAL_SPACING = 80;
    const VERTICAL_SPACING = 90;
    const calculatedNodes = [];
    let currentY = 40;

    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

    for (const lvl of sortedLevels) {
      const group = levelGroups.get(lvl);
      const groupItems = group.map((bId) => {
        const b = blockMap.get(bId) || { id: bId, instructions: [] };
        const isTerminal = b.is_entry || b.is_exit;
        const width = isTerminal ? 170 : 270;
        const lineCount = b.instructions?.length || 0;
        const height = isTerminal ? 46 : Math.max(80, 48 + lineCount * 22);
        return { id: bId, block: b, width, height, isTerminal };
      });

      const totalRowWidth =
        groupItems.reduce((acc, curr) => acc + curr.width, 0) +
        (group.length - 1) * HORIZONTAL_SPACING;
      let startX = 420 - totalRowWidth / 2;
      let maxHeight = 0;

      for (const item of groupItems) {
        calculatedNodes.push({
          id: item.id,
          type: item.isTerminal ? 'terminalNode' : 'blockNode',
          position: { x: startX, y: currentY },
          style: { width: item.width },
          data: {
            label: item.id,
            block: item.block,
            type: item.block.is_entry
              ? 'ENTRY'
              : item.block.is_exit
              ? 'EXIT'
              : 'BLOCK',
            isSelected: item.id === selectedBlockId,
            isEvaluating: item.id === evaluatingBlockId,
          },
          selected: item.id === selectedBlockId,
        });

        startX += item.width + HORIZONTAL_SPACING;
        maxHeight = Math.max(maxHeight, item.height);
      }

      currentY += maxHeight + VERTICAL_SPACING;
    }

    // 2. Build React Flow Edges with distinct styles
    const calculatedEdges = rawEdges.map((e, idx) => {
      let strokeColor = '#64748B'; // subtle slate
      let animated = false;
      let strokeDasharray = undefined;
      let edgeLabel = e.label || undefined;

      if (e.type === 'conditional_true') {
        strokeColor = '#43C6AC'; // Secondary accent emerald
        edgeLabel = edgeLabel || 'True';
      } else if (e.type === 'conditional_false') {
        strokeColor = '#FF6B78'; // Error coral
        edgeLabel = edgeLabel || 'False';
      } else if (e.type === 'back_edge') {
        strokeColor = '#A78BFA'; // Violet
        animated = true;
        strokeDasharray = '5, 5';
        edgeLabel = edgeLabel || 'Loop';
      } else if (e.type === 'unconditional') {
        strokeColor = '#7C8CFF'; // Primary accent blue
      }

      const isConnectedToSelected =
        e.source === selectedBlockId || e.target === selectedBlockId;

      return {
        id: `e-${e.source}-${e.target}-${idx}`,
        source: e.source,
        target: e.target,
        type: e.type === 'back_edge' ? 'default' : 'smoothstep',
        animated,
        label: edgeLabel,
        labelStyle: {
          fill: '#E8ECF4',
          fontWeight: 600,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
        },
        labelBgStyle: {
          fill: '#11151D',
          fillOpacity: 0.95,
          rx: 4,
          ry: 4,
          stroke: '#293140',
          strokeWidth: 1,
        },
        labelBgPadding: [6, 4],
        style: {
          stroke: isConnectedToSelected ? '#7C8CFF' : strokeColor,
          strokeWidth: isConnectedToSelected ? 2.5 : 2,
          strokeDasharray,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isConnectedToSelected ? '#7C8CFF' : strokeColor,
          width: 14,
          height: 14,
        },
      };
    });

    setNodes(calculatedNodes);
    setEdges(calculatedEdges);
  }, [cfgData, selectedBlockId, evaluatingBlockId]);

  if (!cfgData || !cfgData.blocks || cfgData.blocks.length === 0) {
    return (
      <div className="cfg-empty-container">
        <EmptyState
          title="No Control Flow Graph Available"
          description="Enter C source code and click 'Analyze Program' to generate and view the Control Flow Graph."
          icon={GitBranch}
          actionLabel="Analyze Program"
          onAction={onAnalyze}
        />
      </div>
    );
  }

  const cfgKey =
    cfgData.blocks.map((b) => b.id).join('_') +
    `_${cfgData.edges?.length || 0}`;

  return (
    <div
      className="cfg-canvas-wrapper"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '440px',
        position: 'relative',
      }}
    >
      <ReactFlowProvider>
        <CFGCanvasInner
          key={cfgKey}
          cfgData={cfgData}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectBlock}
          onAnalyze={onAnalyze}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
        />
      </ReactFlowProvider>
    </div>
  );
}
