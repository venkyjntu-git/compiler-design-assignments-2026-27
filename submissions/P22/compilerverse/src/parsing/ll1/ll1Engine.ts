/**
 * LL(1) Parsing Engine for CompilerVerse
 * Computes FIRST sets, FOLLOW sets, predictive parsing table,
 * and generates step-by-step stack simulation traces.
 */

export interface Production {
  id: number;
  lhs: string;
  rhs: string[]; // e.g. ['T', "E'"] or ['ε']
  text: string;
}

export interface ParsingStep {
  step: number;
  stack: string[];
  remainingInput: string[];
  action: string;
  production?: Production;
  ruleApplied?: string;
  matchedTerminal?: string;
  status: 'parsing' | 'matched' | 'applied' | 'accepted' | 'error';
}

export interface LL1Table {
  nonTerminals: string[];
  terminals: string[];
  table: Record<string, Record<string, Production | null>>;
}

export interface LL1Result {
  grammarText: string;
  productions: Production[];
  nonTerminals: string[];
  terminals: string[];
  firstSets: Record<string, string[]>;
  followSets: Record<string, string[]>;
  isLL1: boolean;
  parsingTable: LL1Table;
}

export const DEFAULT_LL1_GRAMMAR: Production[] = [
  { id: 1, lhs: 'E', rhs: ['T', "E'"], text: "E -> T E'" },
  { id: 2, lhs: "E'", rhs: ['+', 'T', "E'"], text: "E' -> + T E'" },
  { id: 3, lhs: "E'", rhs: ['ε'], text: "E' -> ε" },
  { id: 4, lhs: 'T', rhs: ['F', "T'"], text: "T -> F T'" },
  { id: 5, lhs: "T'", rhs: ['*', 'F', "T'"], text: "T' -> * F T'" },
  { id: 6, lhs: "T'", rhs: ['ε'], text: "T' -> ε" },
  { id: 7, lhs: 'F', rhs: ['(', 'E', ')'], text: "F -> ( E )" },
  { id: 8, lhs: 'F', rhs: ['id'], text: "F -> id" },
];

export class LL1Engine {
  private productions: Production[];
  private nonTerminals: string[];
  private terminals: string[];
  private startSymbol: string = 'E';

  constructor(productions: Production[] = DEFAULT_LL1_GRAMMAR) {
    this.productions = productions;
    this.nonTerminals = Array.from(new Set(productions.map((p) => p.lhs)));
    const allSymbols = new Set<string>();
    for (const p of productions) {
      for (const sym of p.rhs) {
        if (sym !== 'ε' && !this.nonTerminals.includes(sym)) {
          allSymbols.add(sym);
        }
      }
    }
    allSymbols.add('$');
    this.terminals = Array.from(allSymbols);
  }

  /**
   * Computes FIRST sets iteratively for all symbols.
   */
  public computeFirstSets(): Record<string, string[]> {
    const first: Record<string, Set<string>> = {};

    for (const t of this.terminals) {
      first[t] = new Set([t]);
    }
    first['ε'] = new Set(['ε']);

    for (const nt of this.nonTerminals) {
      first[nt] = new Set();
    }

    let changed = true;
    while (changed) {
      changed = false;

      for (const prod of this.productions) {
        const A = prod.lhs;
        const rhs = prod.rhs;

        if (rhs.length === 1 && rhs[0] === 'ε') {
          if (!first[A].has('ε')) {
            first[A].add('ε');
            changed = true;
          }
          continue;
        }

        let allEpsilon = true;
        for (const symbol of rhs) {
          const symFirst = first[symbol] || new Set([symbol]);

          for (const terminal of symFirst) {
            if (terminal !== 'ε') {
              if (!first[A].has(terminal)) {
                first[A].add(terminal);
                changed = true;
              }
            }
          }

          if (!symFirst.has('ε')) {
            allEpsilon = false;
            break;
          }
        }

        if (allEpsilon) {
          if (!first[A].has('ε')) {
            first[A].add('ε');
            changed = true;
          }
        }
      }
    }

    const result: Record<string, string[]> = {};
    for (const nt of this.nonTerminals) {
      result[nt] = Array.from(first[nt]).sort();
    }
    return result;
  }

  /**
   * Computes FIRST set for an arbitrary string of grammar symbols α.
   */
  public computeFirstOfSequence(sequence: string[], firstSets: Record<string, string[]>): Set<string> {
    const result = new Set<string>();
    if (sequence.length === 0 || (sequence.length === 1 && sequence[0] === 'ε')) {
      result.add('ε');
      return result;
    }

    let allEpsilon = true;
    for (const sym of sequence) {
      const symFirst = this.nonTerminals.includes(sym)
        ? new Set(firstSets[sym] || [])
        : new Set([sym]);

      for (const t of symFirst) {
        if (t !== 'ε') {
          result.add(t);
        }
      }

      if (!symFirst.has('ε')) {
        allEpsilon = false;
        break;
      }
    }

    if (allEpsilon) {
      result.add('ε');
    }
    return result;
  }

  /**
   * Computes FOLLOW sets iteratively for all non-terminals.
   */
  public computeFollowSets(firstSets: Record<string, string[]>): Record<string, string[]> {
    const follow: Record<string, Set<string>> = {};

    for (const nt of this.nonTerminals) {
      follow[nt] = new Set();
    }

    // Rule 1: $ is in FOLLOW(startSymbol)
    follow[this.startSymbol].add('$');

    let changed = true;
    while (changed) {
      changed = false;

      for (const prod of this.productions) {
        const A = prod.lhs;
        const rhs = prod.rhs;

        for (let i = 0; i < rhs.length; i++) {
          const B = rhs[i];
          if (!this.nonTerminals.includes(B)) continue;

          // Beta is the rest of rhs after B
          const beta = rhs.slice(i + 1);
          const firstBeta = this.computeFirstOfSequence(beta, firstSets);

          // Rule 2: Everything in FIRST(beta) except ε is in FOLLOW(B)
          for (const term of firstBeta) {
            if (term !== 'ε') {
              if (!follow[B].has(term)) {
                follow[B].add(term);
                changed = true;
              }
            }
          }

          // Rule 3: If beta =>* ε or beta is empty, everything in FOLLOW(A) is in FOLLOW(B)
          if (firstBeta.has('ε') || beta.length === 0) {
            for (const term of follow[A]) {
              if (!follow[B].has(term)) {
                follow[B].add(term);
                changed = true;
              }
            }
          }
        }
      }
    }

    const result: Record<string, string[]> = {};
    for (const nt of this.nonTerminals) {
      result[nt] = Array.from(follow[nt]).sort();
    }
    return result;
  }

  /**
   * Constructs the LL(1) Predictive Parsing Table.
   */
  public buildParsingTable(): { table: LL1Table; isLL1: boolean } {
    const firstSets = this.computeFirstSets();
    const followSets = this.computeFollowSets(firstSets);

    const tableObj: Record<string, Record<string, Production | null>> = {};
    for (const nt of this.nonTerminals) {
      tableObj[nt] = {};
      for (const t of this.terminals) {
        tableObj[nt][t] = null;
      }
    }

    let isLL1 = true;

    for (const prod of this.productions) {
      const A = prod.lhs;
      const alpha = prod.rhs;
      const firstAlpha = this.computeFirstOfSequence(alpha, firstSets);

      // Rule 1: For each terminal a in FIRST(alpha), add A -> alpha to M[A, a]
      for (const a of firstAlpha) {
        if (a !== 'ε' && a !== '$') {
          if (tableObj[A][a] !== null && tableObj[A][a]?.id !== prod.id) {
            isLL1 = false; // Conflict!
          }
          tableObj[A][a] = prod;
        }
      }

      // Rule 2: If ε is in FIRST(alpha), for each terminal b in FOLLOW(A), add A -> alpha to M[A, b]
      if (firstAlpha.has('ε')) {
        for (const b of followSets[A]) {
          if (tableObj[A][b] !== null && tableObj[A][b]?.id !== prod.id) {
            isLL1 = false; // Conflict!
          }
          tableObj[A][b] = prod;
        }
      }
    }

    return {
      table: {
        nonTerminals: this.nonTerminals,
        terminals: this.terminals.filter((t) => t !== 'ε'),
        table: tableObj,
      },
      isLL1,
    };
  }

  /**
   * Tokenizes input string into symbols for LL(1) parser.
   * Supports 'id', '+', '*', '(', ')', and spaces.
   */
  public tokenizeInput(inputStr: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    const clean = inputStr.trim();

    while (i < clean.length) {
      const ch = clean[i];
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        i++;
        continue;
      }
      if (clean.substring(i, i + 2) === 'id') {
        tokens.push('id');
        i += 2;
        continue;
      }
      if (ch === '+' || ch === '*' || ch === '(' || ch === ')') {
        tokens.push(ch);
        i++;
        continue;
      }
      // If arbitrary identifier like 'a', 'b', map to 'id'
      if (/[a-zA-Z_]/.test(ch)) {
        while (i < clean.length && /[a-zA-Z0-9_]/.test(clean[i])) {
          i++;
        }
        tokens.push('id');
        continue;
      }
      tokens.push(ch);
      i++;
    }

    return tokens;
  }

  /**
   * Performs step-by-step predictive parsing simulation.
   */
  public parse(inputTokens: string[]): { steps: ParsingStep[]; success: boolean; error?: string } {
    const { table } = this.buildParsingTable();
    const stack: string[] = ['$', this.startSymbol];
    const input: string[] = [...inputTokens, '$'];
    const steps: ParsingStep[] = [];
    let stepNum = 1;

    steps.push({
      step: stepNum++,
      stack: [...stack],
      remainingInput: [...input],
      action: 'Initial stack and input configuration',
      status: 'parsing',
    });

    let maxSteps = 100;

    while (stack.length > 0 && maxSteps-- > 0) {
      const top = stack[stack.length - 1];
      const currentInput = input[0];

      // If stack top is $, and input is $ -> Accepted
      if (top === '$' && currentInput === '$') {
        steps.push({
          step: stepNum++,
          stack: [...stack],
          remainingInput: [...input],
          action: 'Stack top and input both match "$". String accepted successfully!',
          status: 'accepted',
        });
        return { steps, success: true };
      }

      // If stack top matches input terminal -> POP and ADVANCE
      if (top === currentInput) {
        stack.pop();
        input.shift();
        steps.push({
          step: stepNum++,
          stack: [...stack],
          remainingInput: [...input],
          action: `Matched terminal '${top}'. Popped from stack and consumed from input.`,
          matchedTerminal: top,
          status: 'matched',
        });
        continue;
      }

      // If stack top is terminal but doesn't match input -> Error
      if (!this.nonTerminals.includes(top)) {
        steps.push({
          step: stepNum++,
          stack: [...stack],
          remainingInput: [...input],
          action: `Syntax Error: Stack top terminal '${top}' does not match input '${currentInput}'`,
          status: 'error',
        });
        return {
          steps,
          success: false,
          error: `Mismatched terminal: expected '${top}', found '${currentInput}'`,
        };
      }

      // Top is non-terminal: Look up M[top, currentInput]
      const prod = table.table[top]?.[currentInput];
      if (!prod) {
        steps.push({
          step: stepNum++,
          stack: [...stack],
          remainingInput: [...input],
          action: `Syntax Error: No rule found in table M[${top}, ${currentInput}]`,
          status: 'error',
        });
        return {
          steps,
          success: false,
          error: `No production rule for non-terminal '${top}' on lookahead '${currentInput}'`,
        };
      }

      // Apply production: Pop top and push rhs symbols in reverse
      stack.pop();
      if (!(prod.rhs.length === 1 && prod.rhs[0] === 'ε')) {
        for (let i = prod.rhs.length - 1; i >= 0; i--) {
          stack.push(prod.rhs[i]);
        }
      }

      steps.push({
        step: stepNum++,
        stack: [...stack],
        remainingInput: [...input],
        action: `Apply production ${prod.text}`,
        production: prod,
        ruleApplied: prod.text,
        status: 'applied',
      });
    }

    return { steps, success: false, error: 'Maximum simulation steps exceeded' };
  }

  public getFullAnalysis(): LL1Result {
    const firstSets = this.computeFirstSets();
    const followSets = this.computeFollowSets(firstSets);
    const { table, isLL1 } = this.buildParsingTable();

    return {
      grammarText: this.productions.map((p) => p.text).join('\n'),
      productions: this.productions,
      nonTerminals: this.nonTerminals,
      terminals: this.terminals.filter((t) => t !== 'ε'),
      firstSets,
      followSets,
      isLL1,
      parsingTable: table,
    };
  }
}
