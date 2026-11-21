/**
 * Canonical LR(1) Parser Engine for CompilerVerse
 * Algorithmic implementation of:
 * - LR(1) Items [A -> α • β, a]
 * - CLOSURE and GOTO operations
 * - Canonical Collection of Item Sets (I0, I1, ... In)
 * - ACTION and GOTO parsing tables
 * - Step-by-step bottom-up parsing simulation (Shift / Reduce / Accept)
 */

import { Production, DEFAULT_LL1_GRAMMAR, LL1Engine } from '../ll1/ll1Engine';

export interface LR1Item {
  prodId: number;
  lhs: string;
  rhs: string[];
  dotIndex: number;
  lookahead: string;
  text: string;
}

export interface StateItemSet {
  stateId: number;
  items: LR1Item[];
  transitions: Record<string, number>; // symbol -> next stateId
}

export type ActionType = 'shift' | 'reduce' | 'accept' | 'error';

export interface LRAction {
  type: ActionType;
  target?: number; // target state for shift, or production ID for reduce
  production?: Production;
  text: string;
}

export interface LR1ParsingStep {
  step: number;
  stateStack: number[];
  symbolStack: string[];
  remainingInput: string[];
  action: string;
  actionType: ActionType;
  production?: Production;
  status: 'parsing' | 'shifted' | 'reduced' | 'accepted' | 'error';
}

export interface LR1Result {
  states: StateItemSet[];
  actionTable: Record<number, Record<string, LRAction | null>>;
  gotoTable: Record<number, Record<string, number | null>>;
  nonTerminals: string[];
  terminals: string[];
  productions: Production[];
  isLR1: boolean;
  conflicts: string[];
}

export class LR1Engine {
  private baseProductions: Production[];
  private augmentedProductions: Production[];
  private nonTerminals: string[];
  private terminals: string[];
  private startSymbol: string = 'E';
  private ll1Helper: LL1Engine;
  private firstSets: Record<string, string[]>;

  constructor(productions: Production[] = DEFAULT_LL1_GRAMMAR) {
    this.baseProductions = productions;
    this.ll1Helper = new LL1Engine(productions);
    this.firstSets = this.ll1Helper.computeFirstSets();

    // Augmented grammar: Production 0 is S' -> E
    this.augmentedProductions = [
      { id: 0, lhs: "S'", rhs: [this.startSymbol], text: `S' -> ${this.startSymbol}` },
      ...productions,
    ];

    this.nonTerminals = Array.from(new Set(this.augmentedProductions.map((p) => p.lhs)));
    const allSymbols = new Set<string>();
    for (const p of this.augmentedProductions) {
      for (const s of p.rhs) {
        if (s !== 'ε' && !this.nonTerminals.includes(s)) {
          allSymbols.add(s);
        }
      }
    }
    allSymbols.add('$');
    this.terminals = Array.from(allSymbols);
  }

  /**
   * Stringifies an LR(1) item to allow set uniqueness checks.
   */
  public serializeItem(item: LR1Item): string {
    const rhsBefore = item.rhs.slice(0, item.dotIndex).join(' ');
    const rhsAfter = item.rhs.slice(item.dotIndex).join(' ');
    const dotStr = rhsBefore ? (rhsAfter ? `${rhsBefore} • ${rhsAfter}` : `${rhsBefore} •`) : `• ${rhsAfter}`;
    return `[${item.lhs} -> ${dotStr.trim()}, ${item.lookahead}]`;
  }

  public createItem(prod: Production, dotIndex: number, lookahead: string): LR1Item {
    const item: LR1Item = {
      prodId: prod.id,
      lhs: prod.lhs,
      rhs: prod.rhs,
      dotIndex,
      lookahead,
      text: '',
    };
    item.text = this.serializeItem(item);
    return item;
  }

  /**
   * Computes CLOSURE of a set of LR(1) items.
   */
  public closure(items: LR1Item[]): LR1Item[] {
    const itemMap = new Map<string, LR1Item>();

    for (const item of items) {
      itemMap.set(item.text, item);
    }

    let changed = true;
    while (changed) {
      changed = false;
      const currentItems = Array.from(itemMap.values());

      for (const item of currentItems) {
        // If dot is at the end or if rhs is ε, no expansion
        if (item.rhs.length === 1 && item.rhs[0] === 'ε') continue;
        if (item.dotIndex >= item.rhs.length) continue;

        const B = item.rhs[item.dotIndex];
        if (!this.nonTerminals.includes(B)) continue;

        // beta is symbols following B in rhs
        const beta = item.rhs.slice(item.dotIndex + 1);
        const betaA = [...beta, item.lookahead];
        const firstBetaA = this.ll1Helper.computeFirstOfSequence(betaA, this.firstSets);

        // For each production B -> gamma
        for (const prod of this.augmentedProductions) {
          if (prod.lhs !== B) continue;

          for (const b of firstBetaA) {
            if (b === 'ε') continue;

            const newItem = this.createItem(
              prod,
              prod.rhs.length === 1 && prod.rhs[0] === 'ε' ? 1 : 0,
              b
            );

            if (!itemMap.has(newItem.text)) {
              itemMap.set(newItem.text, newItem);
              changed = true;
            }
          }
        }
      }
    }

    return Array.from(itemMap.values());
  }

  /**
   * Computes GOTO(I, X)
   */
  public goto(items: LR1Item[], symbol: string): LR1Item[] {
    const movedItems: LR1Item[] = [];

    for (const item of items) {
      if (item.rhs.length === 1 && item.rhs[0] === 'ε') continue;
      if (item.dotIndex < item.rhs.length && item.rhs[item.dotIndex] === symbol) {
        movedItems.push(
          this.createItem(
            this.augmentedProductions.find((p) => p.id === item.prodId)!,
            item.dotIndex + 1,
            item.lookahead
          )
        );
      }
    }

    return this.closure(movedItems);
  }

  /**
   * Constructs the Canonical Collection of LR(1) Item Sets.
   */
  public buildCanonicalCollection(): StateItemSet[] {
    const startProd = this.augmentedProductions[0]; // S' -> E
    const initialItem = this.createItem(startProd, 0, '$');
    const I0 = this.closure([initialItem]);

    const states: StateItemSet[] = [
      {
        stateId: 0,
        items: I0,
        transitions: {},
      },
    ];

    const stateKey = (items: LR1Item[]): string => {
      return items
        .map((i) => i.text)
        .sort()
        .join('|');
    };

    const stateMap = new Map<string, number>();
    stateMap.set(stateKey(I0), 0);

    const grammarSymbols = [
      ...this.nonTerminals.filter((nt) => nt !== "S'"),
      ...this.terminals.filter((t) => t !== '$' && t !== 'ε'),
    ];

    let i = 0;
    while (i < states.length) {
      const currentSet = states[i];

      for (const X of grammarSymbols) {
        const nextItems = this.goto(currentSet.items, X);
        if (nextItems.length === 0) continue;

        const key = stateKey(nextItems);
        let nextStateId: number;

        if (stateMap.has(key)) {
          nextStateId = stateMap.get(key)!;
        } else {
          nextStateId = states.length;
          stateMap.set(key, nextStateId);
          states.push({
            stateId: nextStateId,
            items: nextItems,
            transitions: {},
          });
        }

        currentSet.transitions[X] = nextStateId;
      }

      i++;
    }

    return states;
  }

  /**
   * Constructs ACTION and GOTO tables.
   */
  public buildTables(): LR1Result {
    const states = this.buildCanonicalCollection();
    const actionTable: Record<number, Record<string, LRAction | null>> = {};
    const gotoTable: Record<number, Record<string, number | null>> = {};
    const conflicts: string[] = [];
    let isLR1 = true;

    for (const state of states) {
      actionTable[state.stateId] = {};
      gotoTable[state.stateId] = {};

      for (const t of this.terminals) {
        actionTable[state.stateId][t] = null;
      }
      for (const nt of this.nonTerminals) {
        gotoTable[state.stateId][nt] = null;
      }

      // 1. Shift and Goto entries from transitions
      for (const [symbol, targetState] of Object.entries(state.transitions)) {
        if (this.terminals.includes(symbol)) {
          actionTable[state.stateId][symbol] = {
            type: 'shift',
            target: targetState,
            text: `s${targetState}`,
          };
        } else if (this.nonTerminals.includes(symbol)) {
          gotoTable[state.stateId][symbol] = targetState;
        }
      }

      // 2. Reduce and Accept entries from items
      for (const item of state.items) {
        // Accept: [S' -> E •, $]
        if (
          item.lhs === "S'" &&
          item.dotIndex === item.rhs.length &&
          item.lookahead === '$'
        ) {
          actionTable[state.stateId]['$'] = {
            type: 'accept',
            text: 'acc',
          };
          continue;
        }

        // Reduce: [A -> gamma •, a] (where A != S')
        const isCompleted =
          (item.rhs.length === 1 && item.rhs[0] === 'ε') ||
          item.dotIndex >= item.rhs.length;

        if (isCompleted && item.lhs !== "S'") {
          const prod = this.augmentedProductions.find((p) => p.id === item.prodId);
          const a = item.lookahead;

          const existingAction = actionTable[state.stateId][a];
          if (existingAction !== null) {
            const conflictMsg = `Conflict in State ${state.stateId} on terminal '${a}': ${existingAction.text} vs r${item.prodId} (${prod?.text})`;
            conflicts.push(conflictMsg);
            isLR1 = false;
          } else {
            actionTable[state.stateId][a] = {
              type: 'reduce',
              target: item.prodId,
              production: prod,
              text: `r${item.prodId}`,
            };
          }
        }
      }
    }

    return {
      states,
      actionTable,
      gotoTable,
      nonTerminals: this.nonTerminals.filter((nt) => nt !== "S'"),
      terminals: this.terminals.filter((t) => t !== 'ε'),
      productions: this.augmentedProductions,
      isLR1,
      conflicts,
    };
  }

  /**
   * Simulates step-by-step bottom-up LR(1) parsing.
   */
  public parse(inputTokens: string[]): { steps: LR1ParsingStep[]; success: boolean; error?: string } {
    const { actionTable, gotoTable } = this.buildTables();
    const stateStack: number[] = [0];
    const symbolStack: string[] = ['$'];
    const input: string[] = [...inputTokens, '$'];
    const steps: LR1ParsingStep[] = [];
    let stepNum = 1;

    steps.push({
      step: stepNum++,
      stateStack: [...stateStack],
      symbolStack: [...symbolStack],
      remainingInput: [...input],
      action: 'Initial state 0 on stack',
      actionType: 'shift',
      status: 'parsing',
    });

    let maxSteps = 100;

    while (maxSteps-- > 0) {
      const currentState = stateStack[stateStack.length - 1];
      const lookahead = input[0];
      const action = actionTable[currentState]?.[lookahead];

      if (!action) {
        steps.push({
          step: stepNum++,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          remainingInput: [...input],
          action: `Syntax Error: No action defined in ACTION[${currentState}, ${lookahead}]`,
          actionType: 'error',
          status: 'error',
        });
        return {
          steps,
          success: false,
          error: `Parsing failed: Invalid symbol '${lookahead}' in state ${currentState}`,
        };
      }

      if (action.type === 'shift') {
        const nextState = action.target!;
        stateStack.push(nextState);
        symbolStack.push(lookahead);
        input.shift();

        steps.push({
          step: stepNum++,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          remainingInput: [...input],
          action: `Shift '${lookahead}' and transition to State ${nextState}`,
          actionType: 'shift',
          status: 'shifted',
        });
        continue;
      }

      if (action.type === 'reduce') {
        const prod = action.production!;
        const rhsLength = prod.rhs.length === 1 && prod.rhs[0] === 'ε' ? 0 : prod.rhs.length;

        // Pop rhs symbols and states
        for (let i = 0; i < rhsLength; i++) {
          stateStack.pop();
          symbolStack.pop();
        }

        const topState = stateStack[stateStack.length - 1];
        const nextState = gotoTable[topState]?.[prod.lhs];

        if (nextState === undefined || nextState === null) {
          steps.push({
            step: stepNum++,
            stateStack: [...stateStack],
            symbolStack: [...symbolStack],
            remainingInput: [...input],
            action: `Syntax Error: Missing GOTO[${topState}, ${prod.lhs}]`,
            actionType: 'error',
            status: 'error',
          });
          return { steps, success: false, error: `Invalid GOTO transition for ${prod.lhs}` };
        }

        symbolStack.push(prod.lhs);
        stateStack.push(nextState);

        steps.push({
          step: stepNum++,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          remainingInput: [...input],
          action: `Reduce by ${prod.text} (pop ${rhsLength} symbol(s), push ${prod.lhs}, goto State ${nextState})`,
          actionType: 'reduce',
          production: prod,
          status: 'reduced',
        });
        continue;
      }

      if (action.type === 'accept') {
        steps.push({
          step: stepNum++,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          remainingInput: [...input],
          action: 'Input successfully accepted by canonical LR(1) parser!',
          actionType: 'accept',
          status: 'accepted',
        });
        return { steps, success: true };
      }
    }

    return { steps, success: false, error: 'Maximum simulation steps exceeded' };
  }
}
