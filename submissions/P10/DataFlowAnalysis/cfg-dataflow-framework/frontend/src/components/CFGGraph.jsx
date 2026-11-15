import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import {
  Play,
  Square,
  Maximize2,
  Info,
  GitCommit
} from 'lucide-react';

// Custom Basic Block Node
const CustomBlockNode = ({ data, selected }) => {
  const block = data?.block || {};
  return (
    <div className={`custom-cfg-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#38bdf8',
          width: 8,
          height: 8,
          border: '2px solid #0f172a',
        }}
      />
      <div className="node-header">
        <div className="node-title-badge">
          <GitCommit size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span className="node-title-text">{block.id || 'Block'}</span>
        </div>
        <span className="node-instr-count">
          {block.instructions?.length || 0} instrs
        </span>
      </div>
      <div className="node-body">
        {block.instructions && block.instructions.length > 0 ? (
          block.instructions.map((instr) => (
            <div
              key={instr.id}
              className={`node-line ${instr.is_leader ? 'leader-line' : ''}`}
              title={instr.leader_reason || instr.raw}
            >
              {instr.is_leader ? (
                <span className="leader-star">★</span>
              ) : (
                <span style={{ color: '#475569', fontSize: '0.68rem', width: 12 }}>
                  {instr.id}
                </span>
              )}
              <span>{instr.raw}</span>
            </div>
          ))
        ) : (
          <div className="node-line" style={{ color: '#64748b' }}>
            Empty block
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#38bdf8',
          width: 8,
          height: 8,
          border: '2px solid #0f172a',
        }}
      />
    </div>
  );
};

// Custom Terminal Node (ENTRY / EXIT)
const CustomTerminalNode = ({ data, selected }) => {
  const isEntry = data?.type === 'ENTRY';
  return (
    <div
      className={`terminal-node ${isEntry ? 'entry' : 'exit'} ${
        selected ? 'selected' : ''
      }`}
    >
      {!isEntry && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: '#94a3b8', width: 8, height: 8 }}
        />
      )}
      {isEntry ? <Play size={13} fill="currentColor" /> : <Square size={12} fill="currentColor" />}
      <span>{data?.label || (isEntry ? 'ENTRY' : 'EXIT')}</span>
      {isEntry && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: '#60a5fa', width: 8, height: 8 }}
        />
      )}
    </div>
  );
};

const nodeTypes = {
  blockNode: CustomBlockNode,
  terminalNode: CustomTerminalNode,
};

export default function CFGGraph({ cfgData, selectedBlockId, onSelectBlock }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Compute Layout when cfgData changes
  useEffect(() => {
    if (!cfgData || !cfgData.blocks || cfgData.blocks.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const blocks = cfgData.blocks;
    const rawEdges = cfgData.edges;

    // 1. Assign level/ranks
    const levels = new Map();
    const blockMap = new Map(blocks.map((b) => [b.id, b]));
    levels.set('ENTRY', 0);

    const visited = new Set(['ENTRY']);
    const queue = ['ENTRY'];

    while (queue.length > 0) {
      const currId = queue.shift();
      const currLevel = levels.get(currId);
      const currBlock = blockMap.get(currId);
      if (!currBlock) continue;

      for (const succId of currBlock.successors) {
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

    const HORIZONTAL_GAP = 90;
    const VERTICAL_GAP = 110;
    const calculatedNodes = [];
    let currentY = 40;

    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

    for (const lvl of sortedLevels) {
      const group = levelGroups.get(lvl);
      const groupItems = group.map((bId) => {
        const b = blockMap.get(bId) || { id: bId, instructions: [] };
        const width = b.is_entry || b.is_exit ? 160 : 260;
        const lineCount = b.instructions?.length || 0;
        const height = b.is_entry || b.is_exit ? 44 : Math.max(70, 38 + lineCount * 22);
        return { id: bId, block: b, width, height };
      });

      const totalRowWidth =
        groupItems.reduce((acc, curr) => acc + curr.width, 0) +
        (group.length - 1) * HORIZONTAL_GAP;
      let startX = 400 - totalRowWidth / 2;
      let maxHeight = 0;

      for (const item of groupItems) {
        calculatedNodes.push({
          id: item.id,
          type: item.block.is_entry || item.block.is_exit ? 'terminalNode' : 'blockNode',
          position: { x: startX, y: currentY },
          data: {
            label: item.id,
            block: item.block,
            type: item.block.is_entry ? 'ENTRY' : item.block.is_exit ? 'EXIT' : 'BLOCK',
          },
          selected: item.id === selectedBlockId,
        });

        startX += item.width + HORIZONTAL_GAP;
        maxHeight = Math.max(maxHeight, item.height);
      }

      currentY += maxHeight + VERTICAL_GAP;
    }

    // 2. Build React Flow Edges
    const calculatedEdges = rawEdges.map((e, idx) => {
      let strokeColor = '#64748b';
      let animated = false;
      let strokeDasharray = undefined;

      if (e.type === 'conditional_true') {
        strokeColor = '#10b981';
      } else if (e.type === 'conditional_false') {
        strokeColor = '#ef4444';
      } else if (e.type === 'back_edge') {
        strokeColor = '#a855f7';
        animated = true;
        strokeDasharray = '5, 5';
      } else if (e.type === 'unconditional') {
        strokeColor = '#38bdf8';
      }

      return {
        id: `e-${e.source}-${e.target}-${idx}`,
        source: e.source,
        target: e.target,
        type: e.type === 'back_edge' ? 'default' : 'smoothstep',
        animated,
        label: e.label || undefined,
        labelStyle: { fill: '#cbd5e1', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: '#0b0f19', fillOpacity: 0.9, rx: 4, ry: 4 },
        labelBgPadding: [6, 4],
        style: {
          stroke: strokeColor,
          strokeWidth: 2,
          strokeDasharray,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 14,
          height: 14,
        },
      };
    });

    setNodes(calculatedNodes);
    setEdges(calculatedEdges);
  }, [cfgData, selectedBlockId]);

  const handleNodeClick = (_, node) => {
    if (cfgData && cfgData.blocks) {
      const block = cfgData.blocks.find((b) => b.id === node.id);
      if (block && onSelectBlock) {
        onSelectBlock(block);
      }
    }
  };

  const userBlockCount = cfgData?.blocks?.filter((b) => !b.is_entry && !b.is_exit).length || 0;
  const backEdgeCount = cfgData?.edges?.filter((e) => e.type === 'back_edge').length || 0;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls position="bottom-left" />

        {/* Top Floating Legend & Info HUD */}
        <Panel position="top-left">
          <div className="cfg-legend-panel">
            <span className="legend-item">
              <span className="legend-swatch swatch-entry"></span> Entry/Exit
            </span>
            <span className="legend-item">
              <span className="legend-swatch swatch-bb"></span> Basic Block
            </span>
            <span className="legend-item">
              <span className="legend-swatch swatch-leader"></span> Leader (★)
            </span>
            <span className="legend-item">
              <span className="legend-line line-true"></span> True Branch
            </span>
            <span className="legend-item">
              <span className="legend-line line-false"></span> False Branch
            </span>
            <span className="legend-item">
              <span className="legend-line line-back"></span> Loop Back
            </span>
          </div>
        </Panel>

        {/* Top Right HUD stats */}
        <Panel position="top-right">
          <div
            style={{
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              gap: 12,
              fontFamily: 'var(--font-mono)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span>
              Blocks: <strong style={{ color: 'var(--accent-cyan)' }}>{userBlockCount}</strong>
            </span>
            <span>
              Edges: <strong style={{ color: '#fff' }}>{cfgData?.edges?.length || 0}</strong>
            </span>
            {backEdgeCount > 0 && (
              <span>
                Loops: <strong style={{ color: 'var(--accent-purple)' }}>{backEdgeCount}</strong>
              </span>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
