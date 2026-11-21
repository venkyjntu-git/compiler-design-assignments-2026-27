import React, { useState } from 'react';
import { Search, Hash, ArrowUpDown, Filter } from 'lucide-react';
import { Token, TokenType } from '../compiler/lexer';
import { useCompiler } from '../hooks/useCompilerContext';

interface TokenTableProps {
  tokens: Token[];
}

export const TokenTable: React.FC<TokenTableProps> = ({ tokens }) => {
  const { activeHighlight, setActiveHighlight } = useCompiler();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredTokens = tokens.filter((t) => {
    if (t.type === 'EOF') return false;
    const matchesSearch =
      t.value.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const getBadgeClass = (type: TokenType) => {
    switch (type) {
      case 'KEYWORD':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/60';
      case 'IDENTIFIER':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/60';
      case 'NUMBER':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      case 'OPERATOR':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
      case 'DELIMITER':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60';
      case 'SEPARATOR':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-3 border-b border-border bg-surface-elevated/40 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 flex-1 min-w-[180px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search token or lexeme..."
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Token Types</option>
            <option value="KEYWORD">KEYWORD</option>
            <option value="IDENTIFIER">IDENTIFIER</option>
            <option value="NUMBER">NUMBER</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="DELIMITER">DELIMITER</option>
            <option value="SEPARATOR">SEPARATOR</option>
          </select>
          <span className="text-[11px] font-mono text-slate-400 bg-surface-elevated px-2 py-1 rounded-md border border-border">
            {filteredTokens.length} tokens
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead className="bg-surface-elevated/80 sticky top-0 z-10 text-[11px] uppercase tracking-wider text-slate-400 border-b border-border">
            <tr>
              <th className="py-2.5 px-4 font-semibold">ID</th>
              <th className="py-2.5 px-4 font-semibold">Token Type</th>
              <th className="py-2.5 px-4 font-semibold">Lexeme</th>
              <th className="py-2.5 px-4 font-semibold">Position</th>
              <th className="py-2.5 px-4 font-semibold">Offset Span</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredTokens.map((tok) => {
              const isHighlighted =
                activeHighlight?.id === tok.id ||
                (activeHighlight?.sourceSpan &&
                  activeHighlight.sourceSpan.start <= tok.start &&
                  activeHighlight.sourceSpan.end >= tok.end);

              return (
                <tr
                  key={tok.id}
                  onMouseEnter={() =>
                    setActiveHighlight({
                      type: 'token',
                      id: tok.id,
                      sourceSpan: {
                        line: tok.line,
                        column: tok.column,
                        start: tok.start,
                        end: tok.end,
                      },
                    })
                  }
                  onMouseLeave={() => setActiveHighlight(null)}
                  className={`cursor-pointer transition-colors ${
                    isHighlighted
                      ? 'bg-primary-950/60 text-white border-l-2 border-primary-500'
                      : 'hover:bg-surface-elevated/50 text-slate-300'
                  }`}
                >
                  <td className="py-2 px-4 text-slate-500 font-semibold">{tok.id}</td>
                  <td className="py-2 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getBadgeClass(
                        tok.type
                      )}`}
                    >
                      {tok.type}
                    </span>
                  </td>
                  <td className="py-2 px-4 font-bold text-white tracking-wide">
                    {tok.value}
                  </td>
                  <td className="py-2 px-4 text-slate-400">
                    Line {tok.line}:{tok.column}
                  </td>
                  <td className="py-2 px-4 text-slate-500">
                    [{tok.start} .. {tok.end}]
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
