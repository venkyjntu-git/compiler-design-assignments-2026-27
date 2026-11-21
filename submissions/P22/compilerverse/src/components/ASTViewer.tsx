import React, { useState } from 'react';
import { Binary, Sparkles, ChevronRight, Info, Eye } from 'lucide-react';
import { ASTNode, ProgramNode } from '../compiler/ast';
import { useCompiler } from '../hooks/useCompilerContext';

interface ASTViewerProps {
  ast: ProgramNode | null;
}

export const ASTViewer: React.FC<ASTViewerProps> = ({ ast }) => {
  const { activeHighlight, setActiveHighlight } = useCompiler();
  const [selectedNode, setSelectedNode] = useState<ASTNode | null>(null);

  if (!ast) {
    return (
      <div className="h-full flex items-center justify-center bg-surface rounded-2xl border border-border p-6 text-slate-500 text-xs">
        No AST available. Run the compiler pipeline to generate the tree.
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Interactive Tree View */}
      <div className="flex-1 overflow-auto p-4 border-b lg:border-b-0 lg:border-r border-border">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/80 text-xs">
          <div className="flex items-center space-x-2 text-primary-400 font-semibold">
            <Binary className="w-4 h-4" />
            <span>Abstract Syntax Tree (Hierarchical)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Click node to inspect &amp; cross-link
          </span>
        </div>

        <div className="font-mono text-xs">
          <ASTNodeComponent
            node={ast}
            selectedNode={selectedNode}
            onSelect={(n) => {
              setSelectedNode(n);
              setActiveHighlight({
                type: 'ast',
                id: n.id,
                sourceSpan: n.loc,
              });
            }}
          />
        </div>
      </div>

      {/* Selected Node Details Inspector */}
      <div className="w-full lg:w-72 bg-surface-elevated/30 p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 pb-2 border-b border-border mb-3">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>AST Node Inspector</span>
          </div>

          {selectedNode ? (
            <div className="space-y-3 text-xs font-mono">
              <div className="bg-surface p-3 rounded-xl border border-border">
                <div className="text-[11px] text-slate-500 uppercase">Node Type</div>
                <div className="font-bold text-primary-300 text-sm">{selectedNode.type}</div>
              </div>

              <div className="bg-surface p-3 rounded-xl border border-border">
                <div className="text-[11px] text-slate-500 uppercase">Stable Node ID</div>
                <div className="font-bold text-cyan-300">{selectedNode.id}</div>
              </div>

              <div className="bg-surface p-3 rounded-xl border border-border">
                <div className="text-[11px] text-slate-500 uppercase">Source Location</div>
                <div className="text-slate-300">
                  Line {selectedNode.loc.line}, Col {selectedNode.loc.column}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Byte Offset: [{selectedNode.loc.start} .. {selectedNode.loc.end}]
                </div>
              </div>

              {/* Node-specific fields */}
              {(selectedNode as any).identifier && (
                <div className="bg-surface p-3 rounded-xl border border-border">
                  <div className="text-[11px] text-slate-500 uppercase">Identifier</div>
                  <div className="font-bold text-emerald-300">
                    {(selectedNode as any).identifier}
                  </div>
                </div>
              )}

              {(selectedNode as any).operator && (
                <div className="bg-surface p-3 rounded-xl border border-border">
                  <div className="text-[11px] text-slate-500 uppercase">Operator</div>
                  <div className="font-bold text-amber-300">
                    {(selectedNode as any).operator}
                  </div>
                </div>
              )}

              {(selectedNode as any).value !== undefined && (
                <div className="bg-surface p-3 rounded-xl border border-border">
                  <div className="text-[11px] text-slate-500 uppercase">Literal Value</div>
                  <div className="font-bold text-amber-300">
                    {(selectedNode as any).value}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-xs italic py-6 text-center">
              Select any AST node on the left to inspect its metadata and cross-phase relations.
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-border/80 text-[11px] text-slate-500 flex items-center space-x-1.5">
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span>Synchronized with Editor &amp; TAC</span>
        </div>
      </div>
    </div>
  );
};

const ASTNodeComponent: React.FC<{
  node: ASTNode;
  selectedNode: ASTNode | null;
  onSelect: (node: ASTNode) => void;
}> = ({ node, selectedNode, onSelect }) => {
  const isSelected = selectedNode?.id === node.id;

  const renderChildren = () => {
    switch (node.type) {
      case 'Program':
        return node.body.map((stmt) => (
          <ASTNodeComponent
            key={stmt.id}
            node={stmt}
            selectedNode={selectedNode}
            onSelect={onSelect}
          />
        ));

      case 'VarDeclaration':
        return node.init ? (
          <ASTNodeComponent
            node={node.init}
            selectedNode={selectedNode}
            onSelect={onSelect}
          />
        ) : null;

      case 'AssignmentStatement':
        return (
          <ASTNodeComponent
            node={node.value}
            selectedNode={selectedNode}
            onSelect={onSelect}
          />
        );

      case 'PrintStatement':
        return (
          <ASTNodeComponent
            node={node.expression}
            selectedNode={selectedNode}
            onSelect={onSelect}
          />
        );

      case 'IfStatement':
        return (
          <>
            <ASTNodeComponent
              node={node.condition}
              selectedNode={selectedNode}
              onSelect={onSelect}
            />
            <ASTNodeComponent
              node={node.consequent}
              selectedNode={selectedNode}
              onSelect={onSelect}
            />
            {node.alternate && (
              <ASTNodeComponent
                node={node.alternate}
                selectedNode={selectedNode}
                onSelect={onSelect}
              />
            )}
          </>
        );

      case 'WhileStatement':
        return (
          <>
            <ASTNodeComponent
              node={node.condition}
              selectedNode={selectedNode}
              onSelect={onSelect}
            />
            <ASTNodeComponent
              node={node.body}
              selectedNode={selectedNode}
              onSelect={onSelect}
            />
          </>
        );

      case 'BlockStatement':
        return node.statements.map((s) => (
          <ASTNodeComponent
            key={s.id}
            node={s}
            selectedNode={selectedNode}
            onSelect={onSelect}
          />
        ));

      case 'BinaryExpression':
        return (
          <>
            <ASTNodeComponent
              node={node.left}
              selectedNode={selectedNode}
              onSelect={onSelect}
            />
            <ASTNodeComponent
              node={node.right}
              selectedNode={selectedNode}
              onSelect={onSelect}
            />
          </>
        );

      case 'UnaryExpression':
        return (
          <ASTNodeComponent
            node={node.argument}
            selectedNode={selectedNode}
            onSelect={onSelect}
          />
        );

      default:
        return null;
    }
  };

  const getNodeColor = () => {
    switch (node.type) {
      case 'Program':
        return 'text-slate-300 bg-slate-900 border-slate-700';
      case 'VarDeclaration':
      case 'AssignmentStatement':
        return 'text-indigo-300 bg-indigo-950/40 border-indigo-800/60';
      case 'BinaryExpression':
        return 'text-amber-300 bg-amber-950/40 border-amber-800/60';
      case 'IntegerLiteral':
        return 'text-emerald-300 bg-emerald-950/40 border-emerald-800/60';
      case 'IdentifierLiteral':
        return 'text-blue-300 bg-blue-950/40 border-blue-800/60';
      case 'PrintStatement':
        return 'text-purple-300 bg-purple-950/40 border-purple-800/60';
      case 'IfStatement':
      case 'WhileStatement':
        return 'text-cyan-300 bg-cyan-950/40 border-cyan-800/60';
      default:
        return 'text-slate-300 bg-surface border-border';
    }
  };

  const getNodeLabel = () => {
    if (node.type === 'BinaryExpression') {
      return `BinaryExpr [${node.operator}]`;
    }
    if (node.type === 'IntegerLiteral') {
      return `IntLiteral (${node.value})`;
    }
    if (node.type === 'IdentifierLiteral') {
      return `Identifier (${node.name})`;
    }
    if (node.type === 'VarDeclaration') {
      return `VarDecl: ${node.varType} ${node.identifier}`;
    }
    if (node.type === 'AssignmentStatement') {
      return `Assign: ${node.identifier} =`;
    }
    return node.type;
  };

  return (
    <div className="my-1">
      <button
        onClick={() => onSelect(node)}
        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-left transition-all ${
          isSelected
            ? 'ring-2 ring-primary-500 bg-primary-950 text-white font-bold'
            : `${getNodeColor()} hover:scale-[1.02]`
        }`}
      >
        <span className="text-[10px] text-slate-500 font-mono">{node.id}</span>
        <span className="font-semibold">{getNodeLabel()}</span>
      </button>

      <div className="pl-5 border-l border-border/80 ml-3 mt-1 space-y-1">
        {renderChildren()}
      </div>
    </div>
  );
};
