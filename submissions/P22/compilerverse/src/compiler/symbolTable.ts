/**
 * Symbol Table implementation for CompilerVerse
 * Manages scoped symbol records, types, initial values, and references.
 */

import { SourceLocation } from './ast';

export interface SymbolEntry {
  name: string;
  type: 'int';
  scopeLevel: number;
  scopeName: string;
  initialValue: number | string | null;
  location: SourceLocation;
  isInitialized: boolean;
  references: SourceLocation[];
}

export class Scope {
  public level: number;
  public name: string;
  public parent: Scope | null;
  public symbols: Map<string, SymbolEntry> = new Map();

  constructor(name: string, level: number = 0, parent: Scope | null = null) {
    this.name = name;
    this.level = level;
    this.parent = parent;
  }

  public define(entry: SymbolEntry): boolean {
    if (this.symbols.has(entry.name)) {
      return false; // Duplicate in current scope
    }
    this.symbols.set(entry.name, entry);
    return true;
  }

  public resolve(name: string): SymbolEntry | null {
    if (this.symbols.has(name)) {
      return this.symbols.get(name)!;
    }
    if (this.parent) {
      return this.parent.resolve(name);
    }
    return null;
  }
}

export class SymbolTableManager {
  private currentScope: Scope;
  private allEntries: SymbolEntry[] = [];
  private scopeCounter: number = 0;

  constructor() {
    this.currentScope = new Scope('global', 0, null);
  }

  public enterScope(name?: string): Scope {
    this.scopeCounter++;
    const scopeName = name || `block_${this.scopeCounter}`;
    this.currentScope = new Scope(scopeName, this.currentScope.level + 1, this.currentScope);
    return this.currentScope;
  }

  public exitScope(): Scope | null {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
    }
    return this.currentScope;
  }

  public getCurrentScope(): Scope {
    return this.currentScope;
  }

  public defineSymbol(
    name: string,
    type: 'int',
    location: SourceLocation,
    initialValue: number | string | null = null,
    isInitialized: boolean = false
  ): { success: boolean; entry?: SymbolEntry } {
    const entry: SymbolEntry = {
      name,
      type,
      scopeLevel: this.currentScope.level,
      scopeName: this.currentScope.name,
      initialValue,
      location,
      isInitialized,
      references: [],
    };

    const success = this.currentScope.define(entry);
    if (success) {
      this.allEntries.push(entry);
      return { success: true, entry };
    }
    return { success: false };
  }

  public resolveSymbol(name: string): SymbolEntry | null {
    return this.currentScope.resolve(name);
  }

  public recordReference(name: string, loc: SourceLocation): void {
    const sym = this.resolveSymbol(name);
    if (sym) {
      sym.references.push(loc);
    }
  }

  public getAllEntries(): SymbolEntry[] {
    return this.allEntries;
  }
}
