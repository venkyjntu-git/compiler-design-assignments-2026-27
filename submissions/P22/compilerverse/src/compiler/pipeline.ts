/**
 * Master Compiler Pipeline for CompilerVerse
 * Coordinates the 7-phase compilation process in a strictly deterministic,
 * pure execution sequence.
 */

import { Token, LexicalError, tokenize } from './lexer';
import { ParseTreeNode, ParsingTraceEntry, SyntaxError, parse } from './parser';
import { ProgramNode } from './ast';
import { SymbolEntry } from './symbolTable';
import { SemanticError, SemanticWarning, analyzeSemantics } from './semantic';
import { TACInstruction, BasicBlock, generateTAC } from './tac';
import { OptimizationLogEntry, optimizeTAC } from './optimizer';
import { TargetInstruction, generateTargetCode } from './targetCode';

export type CompilerPhase =
  | 'LEXICAL_ANALYSIS'
  | 'SYNTAX_ANALYSIS'
  | 'AST_GENERATION'
  | 'SEMANTIC_ANALYSIS'
  | 'TAC_GENERATION'
  | 'CODE_OPTIMIZATION'
  | 'TARGET_CODE_GENERATION';

export interface CompilationPhaseError {
  phase: CompilerPhase;
  message: string;
  line?: number;
  column?: number;
  start?: number;
  end?: number;
}

export interface CompilationResult {
  success: boolean;
  timestamp: number;
  sourceCode: string;
  failedPhase?: CompilerPhase;
  errors: CompilationPhaseError[];
  warnings: string[];

  // Phase 1: Lexical Analysis
  tokens: Token[];
  lexicalErrors: LexicalError[];

  // Phase 2: Syntax Analysis
  parseTree: ParseTreeNode | null;
  parsingTrace: ParsingTraceEntry[];
  syntaxErrors: SyntaxError[];

  // Phase 3: Abstract Syntax Tree
  ast: ProgramNode | null;

  // Phase 4: Semantic Analysis
  symbolTable: SymbolEntry[];
  semanticErrors: SemanticError[];
  semanticWarnings: SemanticWarning[];

  // Phase 5: Three-Address Code
  originalTac: TACInstruction[];
  basicBlocks: BasicBlock[];

  // Phase 6: Code Optimization
  optimizedTac: TACInstruction[];
  optimizations: OptimizationLogEntry[];
  optimizedBasicBlocks: BasicBlock[];
  tacCountBefore: number;
  tacCountAfter: number;
  reductionPercentage: number;

  // Phase 7: Target Code Generation
  targetAssembly: TargetInstruction[];
  registersUsed: string[];
  assemblyText: string;
}

export function compile(source: string): CompilationResult {
  const timestamp = Date.now();
  const allErrors: CompilationPhaseError[] = [];
  const allWarnings: string[] = [];

  // Initialize empty baseline result
  const baseline: CompilationResult = {
    success: false,
    timestamp,
    sourceCode: source,
    errors: allErrors,
    warnings: allWarnings,
    tokens: [],
    lexicalErrors: [],
    parseTree: null,
    parsingTrace: [],
    syntaxErrors: [],
    ast: null,
    symbolTable: [],
    semanticErrors: [],
    semanticWarnings: [],
    originalTac: [],
    basicBlocks: [],
    optimizedTac: [],
    optimizations: [],
    optimizedBasicBlocks: [],
    tacCountBefore: 0,
    tacCountAfter: 0,
    reductionPercentage: 0,
    targetAssembly: [],
    registersUsed: [],
    assemblyText: '',
  };

  if (!source || source.trim().length === 0) {
    allErrors.push({
      phase: 'LEXICAL_ANALYSIS',
      message: 'Source code is empty. Please enter a valid program.',
      line: 1,
      column: 1,
      start: 0,
      end: 0,
    });
    baseline.failedPhase = 'LEXICAL_ANALYSIS';
    return baseline;
  }

  // --- Phase 1: Lexical Analysis ---
  const lexResult = tokenize(source);
  baseline.tokens = lexResult.tokens;
  baseline.lexicalErrors = lexResult.errors;

  if (lexResult.errors.length > 0) {
    for (const err of lexResult.errors) {
      allErrors.push({
        phase: 'LEXICAL_ANALYSIS',
        message: err.message,
        line: err.line,
        column: err.column,
        start: err.start,
        end: err.end,
      });
    }
    baseline.failedPhase = 'LEXICAL_ANALYSIS';
    return baseline;
  }

  // --- Phase 2: Syntax Analysis & Phase 3: AST Generation ---
  const parseResult = parse(lexResult.tokens);
  baseline.parseTree = parseResult.parseTree;
  baseline.parsingTrace = parseResult.trace;
  baseline.syntaxErrors = parseResult.errors;
  baseline.ast = parseResult.ast;

  if (parseResult.errors.length > 0 || !parseResult.ast) {
    for (const err of parseResult.errors) {
      allErrors.push({
        phase: 'SYNTAX_ANALYSIS',
        message: err.message,
        line: err.line,
        column: err.column,
        start: err.start,
        end: err.end,
      });
    }
    baseline.failedPhase = 'SYNTAX_ANALYSIS';
    return baseline;
  }

  // --- Phase 4: Semantic Analysis & Symbol Table ---
  const semanticResult = analyzeSemantics(parseResult.ast);
  baseline.symbolTable = semanticResult.symbolTable;
  baseline.semanticErrors = semanticResult.errors;
  baseline.semanticWarnings = semanticResult.warnings;

  for (const warn of semanticResult.warnings) {
    allWarnings.push(warn.message);
  }

  if (semanticResult.errors.length > 0) {
    for (const err of semanticResult.errors) {
      allErrors.push({
        phase: 'SEMANTIC_ANALYSIS',
        message: err.message,
        line: err.line,
        column: err.column,
        start: err.start,
        end: err.end,
      });
    }
    baseline.failedPhase = 'SEMANTIC_ANALYSIS';
    return baseline;
  }

  // --- Phase 5: Three-Address Code (TAC) & Basic Blocks ---
  const tacResult = generateTAC(parseResult.ast);
  baseline.originalTac = tacResult.instructions;
  baseline.basicBlocks = tacResult.basicBlocks;

  // --- Phase 6: Code Optimization ---
  const optResult = optimizeTAC(tacResult.instructions);
  baseline.optimizedTac = optResult.optimizedInstructions;
  baseline.optimizations = optResult.transformations;
  baseline.optimizedBasicBlocks = optResult.optimizedBasicBlocks;
  baseline.tacCountBefore = optResult.countBefore;
  baseline.tacCountAfter = optResult.countAfter;
  baseline.reductionPercentage = optResult.reductionPercentage;

  // --- Phase 7: Target Code Generation ---
  const targetResult = generateTargetCode(optResult.optimizedInstructions);
  baseline.targetAssembly = targetResult.instructions;
  baseline.registersUsed = targetResult.registersUsed;
  baseline.assemblyText = targetResult.assemblyText;

  // If we reached here, compilation succeeded completely!
  baseline.success = true;
  return baseline;
}
