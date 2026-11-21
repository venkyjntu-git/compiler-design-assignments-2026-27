/**
 * Adaptive Quiz Engine for CompilerVerse
 * Dynamically serves questions across 11 compiler topics with 3 difficulty tiers.
 * Adapts difficulty based on streak performance and provides detailed pedagogical explanations.
 */

export type QuizTopic =
  | 'Lexical Analysis'
  | 'Syntax Analysis'
  | 'FIRST and FOLLOW'
  | 'LL(1) Parsing'
  | 'LR(1) Parsing'
  | 'AST'
  | 'Symbol Tables'
  | 'Three-Address Code'
  | 'Code Optimization'
  | 'Basic Blocks'
  | 'Target Code Generation';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type QuestionType = 'multiple_choice' | 'fill_in_the_blank';

export interface QuizQuestion {
  id: string;
  topic: QuizTopic;
  difficulty: DifficultyLevel;
  type: QuestionType;
  prompt: string;
  codeSnippet?: string;
  options?: string[]; // for multiple choice
  correctAnswer: string;
  explanation: string;
}

export interface QuizAttempt {
  questionId: string;
  topic: QuizTopic;
  difficulty: DifficultyLevel;
  userAnswer: string;
  isCorrect: boolean;
  timestamp: number;
}

export const QUESTION_BANK: QuizQuestion[] = [
  // --- Lexical Analysis ---
  {
    id: 'lex_1',
    topic: 'Lexical Analysis',
    difficulty: 'Beginner',
    type: 'multiple_choice',
    prompt: 'What is the primary role of a lexical analyzer in a compiler pipeline?',
    options: [
      'Convert source characters into a stream of meaningful tokens',
      'Construct an abstract syntax tree from tokens',
      'Perform register allocation and machine code emission',
      'Eliminate dead code and redundant subexpressions',
    ],
    correctAnswer: 'Convert source characters into a stream of meaningful tokens',
    explanation: 'The lexer scans the raw source text character-by-character, discards whitespace/comments, and groups character sequences (lexemes) into typed tokens (e.g., KEYWORD, IDENTIFIER, NUMBER).',
  },
  {
    id: 'lex_2',
    topic: 'Lexical Analysis',
    difficulty: 'Intermediate',
    type: 'multiple_choice',
    prompt: 'Given the code snippet below, what token type is assigned to "=="?',
    codeSnippet: 'if (x == 42) { print(x); }',
    options: ['OPERATOR', 'KEYWORD', 'SEPARATOR', 'DELIMITER'],
    correctAnswer: 'OPERATOR',
    explanation: '"==" is a relational equality comparison operator recognized as a two-character operator token.',
  },
  {
    id: 'lex_3',
    topic: 'Lexical Analysis',
    difficulty: 'Advanced',
    type: 'multiple_choice',
    prompt: 'Why do most lexers utilize the "Maximal Munch" (longest match) rule?',
    options: [
      'To prevent treating "while1" as the keyword "while" followed by integer "1"',
      'To minimize the number of states in the DFA',
      'To allow backtracking without lookahead buffers',
      'To automatically convert context-free grammars to regular expressions',
    ],
    correctAnswer: 'To prevent treating "while1" as the keyword "while" followed by integer "1"',
    explanation: 'Maximal Munch guarantees that the longest valid prefix forming a token is consumed first, correctly classifying "while1" as an identifier rather than keyword "while" and literal "1".',
  },

  // --- Syntax Analysis ---
  {
    id: 'syn_1',
    topic: 'Syntax Analysis',
    difficulty: 'Beginner',
    type: 'multiple_choice',
    prompt: 'Which formal language grammar class is typically used to specify programming language syntax?',
    options: [
      'Context-Free Grammars (Type 2)',
      'Regular Grammars (Type 3)',
      'Context-Sensitive Grammars (Type 1)',
      'Unrestricted Grammars (Type 0)',
    ],
    correctAnswer: 'Context-Free Grammars (Type 2)',
    explanation: 'Programming language syntax inherently requires nested recursive constructs (parentheses, if-else, blocks), which are naturally modeled by Context-Free Grammars (CFGs).',
  },
  {
    id: 'syn_2',
    topic: 'Syntax Analysis',
    difficulty: 'Intermediate',
    type: 'multiple_choice',
    prompt: 'What distinguishes a Concrete Parse Tree (CST) from an Abstract Syntax Tree (AST)?',
    options: [
      'The CST contains concrete grammar terminals (semicolons, parentheses), whereas the AST retains only essential semantic structure',
      'The CST is created during code optimization while the AST is created during parsing',
      'The AST contains machine registers while the CST contains memory addresses',
      'They are identical data structures with different names',
    ],
    correctAnswer: 'The CST contains concrete grammar terminals (semicolons, parentheses), whereas the AST retains only essential semantic structure',
    explanation: 'A CST mirrors the complete production derivation including punctuation and grouping symbols, while an AST discards syntactic noise to concisely represent operators and operands.',
  },

  // --- FIRST and FOLLOW ---
  {
    id: 'ff_1',
    topic: 'FIRST and FOLLOW',
    difficulty: 'Intermediate',
    type: 'multiple_choice',
    prompt: 'For the standard expression grammar where T -> F T\' and F -> ( E ) | id, what is FIRST(T)?',
    options: ['{ (, id }', '{ +, * }', '{ id, $ }', '{ (, ) }'],
    correctAnswer: '{ (, id }',
    explanation: 'Because T begins with F, FIRST(T) = FIRST(F). Since F derives ( E ) or id, FIRST(F) = { (, id }.',
  },
  {
    id: 'ff_2',
    topic: 'FIRST and FOLLOW',
    difficulty: 'Advanced',
    type: 'multiple_choice',
    prompt: 'For grammar E -> T E\', E\' -> + T E\' | ε, why is $ included in FOLLOW(E\')?',
    options: [
      'Because E is the start symbol ($ in FOLLOW(E)) and E\' is at the right end of E -> T E\'',
      'Because E\' derives epsilon',
      'Because + has higher precedence than $',
      'Because every non-terminal always contains $ in its FOLLOW set',
    ],
    correctAnswer: 'Because E is the start symbol ($ in FOLLOW(E)) and E\' is at the right end of E -> T E\'',
    explanation: 'By FOLLOW Rule 3, in production A -> α B, everything in FOLLOW(A) is also in FOLLOW(B). Since E is the start symbol, $ ∈ FOLLOW(E), therefore $ ∈ FOLLOW(E\').',
  },

  // --- LL(1) Parsing ---
  {
    id: 'll_1',
    topic: 'LL(1) Parsing',
    difficulty: 'Beginner',
    type: 'multiple_choice',
    prompt: 'In the acronym "LL(1)", what does the second "L" represent?',
    options: [
      'Leftmost derivation',
      'Left-to-right scanning',
      'Lookahead of one symbol',
      'Linear time complexity',
    ],
    correctAnswer: 'Leftmost derivation',
    explanation: 'The first "L" stands for Left-to-right scan of the input, and the second "L" stands for constructing a Leftmost derivation.',
  },
  {
    id: 'll_2',
    topic: 'LL(1) Parsing',
    difficulty: 'Intermediate',
    type: 'multiple_choice',
    prompt: 'In our arithmetic grammar M-table, which production rule resides at M[E, id]?',
    options: ["E -> T E'", "E' -> + T E'", "T -> F T'", "F -> id"],
    correctAnswer: "E -> T E'",
    explanation: 'When parsing non-terminal E with lookahead "id", FIRST(T E\') contains "id", directing the parser to expand E -> T E\'.',
  },

  // --- LR(1) Parsing ---
  {
    id: 'lr_1',
    topic: 'LR(1) Parsing',
    difficulty: 'Intermediate',
    type: 'multiple_choice',
    prompt: 'What constitutes an LR(1) item?',
    options: [
      'A production rule with a dot position and an explicit lookahead terminal [A -> α • β, a]',
      'A symbol stack coupled with a line counter',
      'A regular expression with an epsilon transition',
      'A syntax directed translation scheme attribute',
    ],
    correctAnswer: 'A production rule with a dot position and an explicit lookahead terminal [A -> α • β, a]',
    explanation: 'An LR(1) item pairs a dotted production [A -> α • β] indicating progress with a lookahead set/terminal "a" specifying valid following tokens.',
  },
  {
    id: 'lr_2',
    topic: 'LR(1) Parsing',
    difficulty: 'Advanced',
    type: 'multiple_choice',
    prompt: 'When does a Shift-Reduce conflict occur in an LR(1) parsing table entry?',
    options: [
      'When an entry ACTION[s, a] contains both a shift action and a reduce action',
      'When two reduce actions exist for different non-terminals on the same lookahead',
      'When the parser reaches the accept state without consuming all input',
      'When a GOTO transition is undefined for a terminal',
    ],
    correctAnswer: 'When an entry ACTION[s, a] contains both a shift action and a reduce action',
    explanation: 'A Shift-Reduce conflict arises when the parser cannot decide whether to shift the current lookahead symbol onto the stack or reduce the existing stack contents by a completed production.',
  },

  // --- Three-Address Code ---
  {
    id: 'tac_1',
    topic: 'Three-Address Code',
    difficulty: 'Intermediate',
    type: 'multiple_choice',
    prompt: 'What is the characteristic property of Three-Address Code (TAC)?',
    options: [
      'Each instruction has at most one operator on the right-hand side and at most three addresses',
      'It requires exactly three registers on the physical processor',
      'It can only handle programs with three variables',
      'Each instruction occupies exactly three bytes in memory',
    ],
    correctAnswer: 'Each instruction has at most one operator on the right-hand side and at most three addresses',
    explanation: 'TAC linearizes nested expression trees into instructions of the form x = y op z or x = op y, where at most three memory/temporary locations are referenced.',
  },

  // --- Code Optimization ---
  {
    id: 'opt_1',
    topic: 'Code Optimization',
    difficulty: 'Beginner',
    type: 'multiple_choice',
    prompt: 'Which optimization replaces the expression "int x = 10 + 20;" with "int x = 30;" at compile time?',
    options: ['Constant Folding', 'Constant Propagation', 'Dead Code Elimination', 'Strength Reduction'],
    correctAnswer: 'Constant Folding',
    explanation: 'Constant Folding directly computes arithmetic operations on known literal values during compilation rather than generating runtime ALU instructions.',
  },
  {
    id: 'opt_2',
    topic: 'Code Optimization',
    difficulty: 'Intermediate',
    type: 'multiple_choice',
    prompt: 'Which transformation is an example of Algebraic Simplification?',
    options: [
      'Replacing "x * 1" with "x" and "x * 0" with "0"',
      'Moving loop-invariant code outside the loop header',
      'Allocating registers using graph coloring',
      'Inlining small function bodies',
    ],
    correctAnswer: 'Replacing "x * 1" with "x" and "x * 0" with "0"',
    explanation: 'Algebraic Simplification applies algebraic identities (such as identity element x * 1 = x and zero property x * 0 = 0) to eliminate redundant computation.',
  },

  // --- Basic Blocks ---
  {
    id: 'bb_1',
    topic: 'Basic Blocks',
    difficulty: 'Intermediate',
    type: 'multiple_choice',
    prompt: 'According to the classical leader detection rules, which of the following is ALWAYS a leader?',
    options: [
      'The first instruction of the intermediate code and any target of a jump',
      'Every print statement in the program',
      'Only instructions that assign to temporary variables',
      'The last instruction of the entire compilation unit',
    ],
    correctAnswer: 'The first instruction of the intermediate code and any target of a jump',
    explanation: 'By definition, leaders are: 1) the first instruction, 2) any jump target (label), and 3) any instruction immediately following a conditional or unconditional jump.',
  },

  // --- Target Code Generation ---
  {
    id: 'tgt_1',
    topic: 'Target Code Generation',
    difficulty: 'Beginner',
    type: 'multiple_choice',
    prompt: 'What is the role of the LOAD instruction in pseudo-assembly?',
    options: [
      'Copy a value from memory or an immediate constant into a CPU register',
      'Write data from a register into main memory',
      'Perform arithmetic addition on two operands',
      'Branch unconditionally to another code block',
    ],
    correctAnswer: 'Copy a value from memory or an immediate constant into a CPU register',
    explanation: 'LOAD transfers values from memory locations or immediate literals into processor registers for fast arithmetic manipulation.',
  },
];

export class QuizEngine {
  private currentDifficulty: DifficultyLevel = 'Beginner';
  private streak: number = 0;
  private askedQuestionIds: Set<string> = new Set();

  constructor() {
    this.loadState();
  }

  public getNextQuestion(filterTopic?: QuizTopic): QuizQuestion | null {
    // Filter questions matching current difficulty and optional topic
    let pool = QUESTION_BANK.filter(
      (q) =>
        (!filterTopic || q.topic === filterTopic) &&
        q.difficulty === this.currentDifficulty &&
        !this.askedQuestionIds.has(q.id)
    );

    // If pool exhausted at current difficulty, fallback to any unasked question in topic
    if (pool.length === 0) {
      pool = QUESTION_BANK.filter(
        (q) => (!filterTopic || q.topic === filterTopic) && !this.askedQuestionIds.has(q.id)
      );
    }

    // If all asked, reset history for this topic
    if (pool.length === 0) {
      this.askedQuestionIds.clear();
      pool = QUESTION_BANK.filter((q) => !filterTopic || q.topic === filterTopic);
    }

    if (pool.length === 0) return null;

    // Pick random question from candidates
    const selected = pool[Math.floor(Math.random() * pool.length)];
    this.askedQuestionIds.add(selected.id);
    this.saveState();
    return selected;
  }

  public submitAnswer(question: QuizQuestion, answer: string): { isCorrect: boolean; explanation: string; newDifficulty: DifficultyLevel } {
    const isCorrect =
      question.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();

    if (isCorrect) {
      this.streak++;
      if (this.streak >= 2) {
        if (this.currentDifficulty === 'Beginner') {
          this.currentDifficulty = 'Intermediate';
          this.streak = 0;
        } else if (this.currentDifficulty === 'Intermediate') {
          this.currentDifficulty = 'Advanced';
          this.streak = 0;
        }
      }
    } else {
      this.streak = Math.min(this.streak, 0) - 1;
      if (this.streak <= -2) {
        if (this.currentDifficulty === 'Advanced') {
          this.currentDifficulty = 'Intermediate';
          this.streak = 0;
        } else if (this.currentDifficulty === 'Intermediate') {
          this.currentDifficulty = 'Beginner';
          this.streak = 0;
        }
      }
    }

    this.saveState();

    return {
      isCorrect,
      explanation: question.explanation,
      newDifficulty: this.currentDifficulty,
    };
  }

  public getCurrentDifficulty(): DifficultyLevel {
    return this.currentDifficulty;
  }

  public getStreak(): number {
    return this.streak;
  }

  public reset(): void {
    this.currentDifficulty = 'Beginner';
    this.streak = 0;
    this.askedQuestionIds.clear();
    this.saveState();
  }

  private saveState(): void {
    try {
      localStorage.setItem(
        'compilerverse_quiz_engine_state',
        JSON.stringify({
          difficulty: this.currentDifficulty,
          streak: this.streak,
          asked: Array.from(this.askedQuestionIds),
        })
      );
    } catch {
      // Storage unavailable or disabled
    }
  }

  private loadState(): void {
    try {
      const raw = localStorage.getItem('compilerverse_quiz_engine_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.difficulty) this.currentDifficulty = parsed.difficulty;
        if (typeof parsed.streak === 'number') this.streak = parsed.streak;
        if (Array.isArray(parsed.asked)) this.askedQuestionIds = new Set(parsed.asked);
      }
    } catch {
      // Ignore fallback
    }
  }
}
