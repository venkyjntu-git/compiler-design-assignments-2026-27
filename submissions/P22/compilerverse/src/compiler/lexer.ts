/**
 * Lexical Analyzer (Lexer) for CompilerVerse
 * Decomposes input source code into typed tokens with stable IDs and precise source positions.
 */

export type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'OPERATOR'
  | 'SEPARATOR'
  | 'DELIMITER'
  | 'EOF';

export interface Token {
  id: string;
  type: TokenType;
  value: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

export interface LexicalError {
  message: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

export interface LexerResult {
  tokens: Token[];
  errors: LexicalError[];
}

const KEYWORDS = new Set(['int', 'print', 'if', 'else', 'while']);

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private errors: LexicalError[] = [];
  private tokenIdCounter: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  public tokenize(): LexerResult {
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
    this.errors = [];
    this.tokenIdCounter = 1;

    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];

      // Whitespace handling
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
        continue;
      }

      if (ch === '\n') {
        this.line++;
        this.column = 1;
        this.pos++;
        continue;
      }

      // Single line comments //
      if (ch === '/' && this.peek() === '/') {
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
          this.advance();
        }
        continue;
      }

      // Multi-line comments /* ... */
      if (ch === '/' && this.peek() === '*') {
        const start = this.pos;
        const line = this.line;
        const col = this.column;
        this.advance(); // /
        this.advance(); // *
        let closed = false;
        while (this.pos < this.source.length) {
          if (this.source[this.pos] === '*' && this.peek() === '/') {
            this.advance();
            this.advance();
            closed = true;
            break;
          }
          if (this.source[this.pos] === '\n') {
            this.line++;
            this.column = 1;
            this.pos++;
          } else {
            this.advance();
          }
        }
        if (!closed) {
          this.errors.push({
            message: 'Unterminated multi-line comment',
            line,
            column: col,
            start,
            end: this.pos,
          });
        }
        continue;
      }

      const startPos = this.pos;
      const startLine = this.line;
      const startCol = this.column;

      // Numbers
      if (this.isDigit(ch)) {
        let numStr = '';
        while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
          numStr += this.source[this.pos];
          this.advance();
        }

        // Check if immediately followed by an identifier character (e.g. 123abc is invalid)
        if (this.pos < this.source.length && this.isAlpha(this.source[this.pos])) {
          let invalidWord = numStr;
          while (this.pos < this.source.length && this.isAlphaNumeric(this.source[this.pos])) {
            invalidWord += this.source[this.pos];
            this.advance();
          }
          this.errors.push({
            message: `Invalid numeric literal or identifier: "${invalidWord}"`,
            line: startLine,
            column: startCol,
            start: startPos,
            end: this.pos,
          });
          continue;
        }

        this.addToken('NUMBER', numStr, startLine, startCol, startPos, this.pos);
        continue;
      }

      // Identifiers or Keywords
      if (this.isAlpha(ch)) {
        let idStr = '';
        while (this.pos < this.source.length && this.isAlphaNumeric(this.source[this.pos])) {
          idStr += this.source[this.pos];
          this.advance();
        }

        const type: TokenType = KEYWORDS.has(idStr) ? 'KEYWORD' : 'IDENTIFIER';
        this.addToken(type, idStr, startLine, startCol, startPos, this.pos);
        continue;
      }

      // Two-character operators (==, !=, <=, >=)
      const nextChar = this.peek();
      const twoChar = ch + nextChar;
      if (twoChar === '==' || twoChar === '!=' || twoChar === '<=' || twoChar === '>=') {
        this.advance();
        this.advance();
        this.addToken('OPERATOR', twoChar, startLine, startCol, startPos, this.pos);
        continue;
      }

      // Single-character operators
      if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '<' || ch === '>' || ch === '=') {
        this.advance();
        this.addToken('OPERATOR', ch, startLine, startCol, startPos, this.pos);
        continue;
      }

      // Separators
      if (ch === ';' || ch === ',') {
        this.advance();
        this.addToken('SEPARATOR', ch, startLine, startCol, startPos, this.pos);
        continue;
      }

      // Delimiters
      if (ch === '(' || ch === ')' || ch === '{' || ch === '}') {
        this.advance();
        this.addToken('DELIMITER', ch, startLine, startCol, startPos, this.pos);
        continue;
      }

      // Unrecognized character
      this.errors.push({
        message: `Unexpected character: '${ch}'`,
        line: startLine,
        column: startCol,
        start: startPos,
        end: startPos + 1,
      });
      this.advance();
    }

    // Append EOF token
    this.addToken('EOF', '', this.line, this.column, this.pos, this.pos);

    return {
      tokens: this.tokens,
      errors: this.errors,
    };
  }

  private advance(): void {
    this.pos++;
    this.column++;
  }

  private peek(): string {
    if (this.pos + 1 >= this.source.length) return '';
    return this.source[this.pos + 1];
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char === '_'
    );
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private addToken(
    type: TokenType,
    value: string,
    line: number,
    column: number,
    start: number,
    end: number
  ): void {
    this.tokens.push({
      id: `tok_${this.tokenIdCounter++}`,
      type,
      value,
      line,
      column,
      start,
      end,
    });
  }
}

export function tokenize(source: string): LexerResult {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}
