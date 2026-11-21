import { describe, it, expect } from 'vitest';
import { LL1Engine } from '../src/parsing/ll1/ll1Engine';
import { LR1Engine } from '../src/parsing/lr1/lr1Engine';

describe('LL(1) Parsing Engine', () => {
  const engine = new LL1Engine();

  it('computes correct FIRST sets for arithmetic grammar', () => {
    const firstSets = engine.computeFirstSets();

    expect(firstSets['F']).toEqual(['(', 'id']);
    expect(firstSets['T']).toEqual(['(', 'id']);
    expect(firstSets['E']).toEqual(['(', 'id']);
    expect(firstSets["T'"]).toEqual(['*', 'ε']);
    expect(firstSets["E'"]).toEqual(['+', 'ε']);
  });

  it('computes correct FOLLOW sets for arithmetic grammar', () => {
    const firstSets = engine.computeFirstSets();
    const followSets = engine.computeFollowSets(firstSets);

    expect(followSets['E']).toContain('$');
    expect(followSets['E']).toContain(')');

    expect(followSets["E'"]).toContain('$');
    expect(followSets["E'"]).toContain(')');

    expect(followSets['T']).toContain('+');
    expect(followSets['T']).toContain(')');
    expect(followSets['T']).toContain('$');

    expect(followSets["T'"]).toContain('+');
    expect(followSets["T'"]).toContain(')');
    expect(followSets["T'"]).toContain('$');

    expect(followSets['F']).toContain('*');
    expect(followSets['F']).toContain('+');
    expect(followSets['F']).toContain(')');
    expect(followSets['F']).toContain('$');
  });

  it('verifies that the grammar is deterministic LL(1)', () => {
    const { isLL1 } = engine.buildParsingTable();
    expect(isLL1).toBe(true);
  });

  it('successfully parses valid input string: id + id * id', () => {
    const tokens = engine.tokenizeInput('id + id * id');
    expect(tokens).toEqual(['id', '+', 'id', '*', 'id']);

    const parseResult = engine.parse(tokens);
    expect(parseResult.success).toBe(true);
    expect(parseResult.steps.length).toBeGreaterThan(10);
    expect(parseResult.steps[parseResult.steps.length - 1].status).toBe('accepted');
  });

  it('rejects invalid syntax with an informative syntax error step', () => {
    const tokens = engine.tokenizeInput('id + * id');
    const parseResult = engine.parse(tokens);
    expect(parseResult.success).toBe(false);
    expect(parseResult.error).toBeDefined();
  });
});

describe('Canonical LR(1) Parsing Engine', () => {
  const lrEngine = new LR1Engine();

  it('generates canonical collection of item sets and closure', () => {
    const states = lrEngine.buildCanonicalCollection();
    expect(states.length).toBeGreaterThan(5);

    // Initial state 0 must contain augmented start item [S' -> • E, $]
    const state0 = states[0];
    const hasAugmentedStart = state0.items.some(
      (item) => item.lhs === "S'" && item.dotIndex === 0 && item.lookahead === '$'
    );
    expect(hasAugmentedStart).toBe(true);
  });

  it('constructs ACTION and GOTO tables without conflicts on LL/LR arithmetic grammar', () => {
    const tableRes = lrEngine.buildTables();
    expect(tableRes.states.length).toBeGreaterThan(0);
    expect(tableRes.actionTable).toBeDefined();
    expect(tableRes.gotoTable).toBeDefined();
  });

  it('successfully executes Shift-Reduce parsing on id + id * id', () => {
    const tokens = ['id', '+', 'id', '*', 'id'];
    const parseRes = lrEngine.parse(tokens);

    expect(parseRes.success).toBe(true);
    expect(parseRes.steps.length).toBeGreaterThan(5);

    // Ensure trace contains both shifts and reductions
    const actionTypes = parseRes.steps.map((s) => s.actionType);
    expect(actionTypes).toContain('shift');
    expect(actionTypes).toContain('reduce');
    expect(actionTypes).toContain('accept');
  });

  it('rejects invalid syntax in bottom-up parsing', () => {
    const invalidTokens = ['+', '+'];
    const parseRes = lrEngine.parse(invalidTokens);
    expect(parseRes.success).toBe(false);
  });
});
