import React, { useState } from 'react';
import {
  Network,
  List,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GitCommit,
  CheckCircle,
} from 'lucide-react';
import { ParseTreeNode, ParsingTraceEntry } from '../compiler/parser';

interface ParseTreeViewerProps {
  parseTree: ParseTreeNode | null;
  trace: ParsingTraceEntry[];
}

export const ParseTreeViewer: React.FC<ParseTreeViewerProps> = ({ parseTree, trace }) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'trace'>('tree');

  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Header Tabs */}
      <div className="h-12 border-b border-border bg-surface-elevated/40 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'tree'
                ? 'bg-primary-600/20 border border-primary-500/40 text-primary-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Concrete Parse Tree (CST)</span>
          </button>

          <button
            onClick={() => setActiveTab('trace')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'trace'
                ? 'bg-primary-600/20 border border-primary-500/40 text-primary-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Parsing Trace Log ({trace.length} Steps)</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
          Recursive-Descent Syntax Analysis
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'tree' ? (
          parseTree ? (
            <div className="font-mono text-xs">
              <ParseTreeNodeItem node={parseTree} depth={0} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No parse tree available. Run compilation to generate.
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-surface-elevated/80 sticky top-0 text-[11px] uppercase tracking-wider text-slate-400 border-b border-border">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Step</th>
                  <th className="py-2.5 px-4 font-semibold">Action / Production Rule</th>
                  <th className="py-2.5 px-4 font-semibold">Current Lookahead</th>
                  <th className="py-2.5 px-4 font-semibold">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {trace.map((item) => (
                  <tr key={item.step} className="hover:bg-surface-elevated/40 text-slate-300">
                    <td className="py-2 px-4 text-slate-500 font-bold">{item.step}</td>
                    <td className="py-2 px-4 font-medium text-slate-200">{item.action}</td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-border">
                        {item.lookahead}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-500">
                      Line {item.line}:{item.column}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const ParseTreeNodeItem: React.FC<{ node: ParseTreeNode; depth: number }> = ({ node, depth }) => {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="my-1">
      <div
        className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded-md transition-colors cursor-pointer ${
          node.isTerminal
            ? 'bg-slate-900 border border-border text-emerald-300'
            : 'bg-surface-elevated border border-border/80 text-primary-300 hover:bg-slate-800'
        }`}
        onClick={() => hasChildren && setCollapsed(!collapsed)}
      >
        {hasChildren ? (
          collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )
        ) : (
          <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] text-emerald-400">
            •
          </span>
        )}

        <span className="font-semibold text-xs">{node.name}</span>

        {node.rule && (
          <span className="text-[10px] text-slate-500 font-mono pl-1">[{node.rule}]</span>
        )}
      </div>

      {hasChildren && !collapsed && (
        <div className="pl-5 border-l border-border/80 ml-2.5 mt-1 space-y-1">
          {node.children.map((child) => (
            <ParseTreeNodeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
