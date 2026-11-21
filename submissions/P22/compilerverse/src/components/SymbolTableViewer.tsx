import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Database, ShieldCheck } from 'lucide-react';
import { SymbolEntry } from '../compiler/symbolTable';
import { SemanticError, SemanticWarning } from '../compiler/semantic';

interface SymbolTableViewerProps {
  symbolTable: SymbolEntry[];
  errors: SemanticError[];
  warnings: SemanticWarning[];
}

export const SymbolTableViewer: React.FC<SymbolTableViewerProps> = ({
  symbolTable,
  errors,
  warnings,
}) => {
  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface-elevated/40 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">
            Phase 4: Scoped Symbol Table &amp; Semantic Analysis
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
            {symbolTable.length} Symbols
          </span>
          {errors.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300">
              {errors.length} Errors
            </span>
          )}
          {warnings.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300">
              {warnings.length} Warnings
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Semantic Diagnostics Alert Banner */}
        {errors.length > 0 && (
          <div className="p-3 bg-rose-950/30 border border-rose-800/80 rounded-xl space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Semantic Verification Failed</span>
            </div>
            {errors.map((err, i) => (
              <div key={i} className="text-xs text-rose-200 font-mono pl-5">
                • Line {err.line}:{err.column} — {err.message}
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="p-3 bg-amber-950/30 border border-amber-800/80 rounded-xl space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Semantic Warnings</span>
            </div>
            {warnings.map((warn, i) => (
              <div key={i} className="text-xs text-amber-200 font-mono pl-5">
                • Line {warn.line}:{warn.column} — {warn.message}
              </div>
            ))}
          </div>
        )}

        {errors.length === 0 && warnings.length === 0 && (
          <div className="flex items-center space-x-2 p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Type check and scope resolution passed with 0 semantic defects.</span>
          </div>
        )}

        {/* Symbol Table */}
        <div className="border border-border rounded-xl overflow-hidden bg-surface-elevated/20">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-surface-elevated text-[11px] uppercase tracking-wider text-slate-400 border-b border-border">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Identifier</th>
                <th className="py-2.5 px-4 font-semibold">Type</th>
                <th className="py-2.5 px-4 font-semibold">Scope</th>
                <th className="py-2.5 px-4 font-semibold">Initial Value</th>
                <th className="py-2.5 px-4 font-semibold">Declaration Location</th>
                <th className="py-2.5 px-4 font-semibold">References</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {symbolTable.length > 0 ? (
                symbolTable.map((sym, i) => (
                  <tr key={i} className="hover:bg-surface-elevated/40 text-slate-300">
                    <td className="py-2.5 px-4 font-bold text-emerald-300">
                      {sym.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-primary-950/80 border border-primary-800 text-primary-300 text-[10px]">
                        {sym.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      {sym.scopeName} (lvl {sym.scopeLevel})
                    </td>
                    <td className="py-2.5 px-4 text-amber-300 font-bold">
                      {sym.initialValue !== null ? sym.initialValue : 'uninitialized'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      Line {sym.location.line}:{sym.location.column}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {sym.references.length} use(s)
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                    No variables declared yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
