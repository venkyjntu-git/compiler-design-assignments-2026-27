/**
 * In-Browser Client Compiler & Data-Flow Analysis Engine
 * 
 * Provides full client-side fallback compilation, 3AC generation,
 * leader detection, CFG construction, and iterative data-flow analysis
 * (Reaching Definitions, Live Variables, Available Expressions) with
 * zero backend dependency for offline demos, grading, and viva submissions.
 */

// -------------------------------------------------------------
// 1. Lexer & Tokenizer
// -------------------------------------------------------------
class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }
}

class Lexer {
  constructor(source) {
    this.source = source || '';
    this.length = this.source.length;
    this.pos = 0;
    this.line = 1;
    this.col = 1;
  }

  peek(offset = 0) {
    const idx = this.pos + offset;
    return idx < this.length ? this.source[idx] : null;
  }

  advance() {
    const ch = this.source[this.pos++];
    if (ch === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  tokenize() {
    const tokens = [];
    const keywords = {
      int: 'INT',
      void: 'VOID',
      if: 'IF',
      else: 'ELSE',
      while: 'WHILE',
      for: 'FOR',
      do: 'DO',
      break: 'BREAK',
      continue: 'CONTINUE',
      return: 'RETURN',
    };

    const unsupported = {
      float: 'floating-point types',
      double: 'floating-point types',
      char: 'character types',
      struct: 'struct definitions',
      goto: 'direct goto statements (use while/for/if)',
    };

    while (this.pos < this.length) {
      const ch = this.peek();

      // Whitespace
      if (/\s/.test(ch)) {
        this.advance();
        continue;
      }

      // Single-line comment //
      if (ch === '/' && this.peek(1) === '/') {
        this.advance();
        this.advance();
        while (this.pos < this.length && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      // Multi-line comment /* ... */
      if (ch === '/' && this.peek(1) === '*') {
        this.advance();
        this.advance();
        while (this.pos < this.length && !(this.peek() === '*' && this.peek(1) === '/')) {
          this.advance();
        }
        if (this.pos < this.length) {
          this.advance();
          this.advance();
        }
        continue;
      }

      const startLine = this.line;
      const startCol = this.col;

      // Numbers
      if (/[0-9]/.test(ch)) {
        let numStr = '';
        while (this.pos < this.length && /[0-9.]/.test(this.peek())) {
          numStr += this.advance();
        }
        tokens.push(new Token('NUMBER', numStr, startLine, startCol));
        continue;
      }

      // Identifiers / Keywords
      if (/[a-zA-Z_]/.test(ch)) {
        let ident = '';
        while (this.pos < this.length && /[a-zA-Z0-9_]/.test(this.peek())) {
          ident += this.advance();
        }
        if (unsupported[ident]) {
          throw {
            error_type: 'LexerError',
            message: `Unsupported C construct '${ident}' (${unsupported[ident]}). Please use the documented C subset.`,
            line: startLine,
            col: startCol,
          };
        }
        const type = keywords[ident] || 'IDENT';
        tokens.push(new Token(type, ident, startLine, startCol));
        continue;
      }

      // Two-character operators
      const two = ch + (this.peek(1) || '');
      if (two === '==') { this.advance(); this.advance(); tokens.push(new Token('EQ', '==', startLine, startCol)); continue; }
      if (two === '!=') { this.advance(); this.advance(); tokens.push(new Token('NE', '!=', startLine, startCol)); continue; }
      if (two === '<=') { this.advance(); this.advance(); tokens.push(new Token('LE', '<=', startLine, startCol)); continue; }
      if (two === '>=') { this.advance(); this.advance(); tokens.push(new Token('GE', '>=', startLine, startCol)); continue; }
      if (two === '&&') { this.advance(); this.advance(); tokens.push(new Token('AND', '&&', startLine, startCol)); continue; }
      if (two === '||') { this.advance(); this.advance(); tokens.push(new Token('OR', '||', startLine, startCol)); continue; }
      if (two === '++') { this.advance(); this.advance(); tokens.push(new Token('INC', '++', startLine, startCol)); continue; }
      if (two === '--') { this.advance(); this.advance(); tokens.push(new Token('DEC', '--', startLine, startCol)); continue; }
      if (two === '+=') { this.advance(); this.advance(); tokens.push(new Token('ADD_ASSIGN', '+=', startLine, startCol)); continue; }
      if (two === '-=') { this.advance(); this.advance(); tokens.push(new Token('SUB_ASSIGN', '-=', startLine, startCol)); continue; }
      if (two === '*=') { this.advance(); this.advance(); tokens.push(new Token('MUL_ASSIGN', '*=', startLine, startCol)); continue; }
      if (two === '/=') { this.advance(); this.advance(); tokens.push(new Token('DIV_ASSIGN', '/=', startLine, startCol)); continue; }

      // Single-character punctuation / operators
      const singles = {
        '=': 'ASSIGN',
        '+': 'PLUS',
        '-': 'MINUS',
        '*': 'MUL',
        '/': 'DIV',
        '%': 'MOD',
        '<': 'LT',
        '>': 'GT',
        '!': 'NOT',
        '(': 'LPAREN',
        ')': 'RPAREN',
        '{': 'LBRACE',
        '}': 'RBRACE',
        ';': 'SEMI',
        ',': 'COMMA',
      };

      if (singles[ch]) {
        this.advance();
        tokens.push(new Token(singles[ch], ch, startLine, startCol));
        continue;
      }

      throw {
        error_type: 'LexerError',
        message: `Unexpected character '${ch}'`,
        line: startLine,
        col: startCol,
      };
    }

    tokens.push(new Token('EOF', '', this.line, this.col));
    return tokens;
  }
}

// -------------------------------------------------------------
// 2. Parser
// -------------------------------------------------------------
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  current() {
    return this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
  }

  advance() {
    const tok = this.current();
    this.pos++;
    return tok;
  }

  match(...types) {
    if (types.includes(this.current().type)) {
      return this.advance();
    }
    return null;
  }

  expect(type, context = '') {
    const tok = this.current();
    if (tok.type !== type) {
      throw {
        error_type: 'ParserError',
        message: `Unexpected token '${tok.value}' (expected '${type}'${context ? ' ' + context : ''})`,
        line: tok.line,
        col: tok.col,
      };
    }
    return this.advance();
  }

  parseProgram() {
    let hasFunction = false;
    for (let i = 0; i < this.tokens.length - 2; i++) {
      if (['INT', 'VOID'].includes(this.tokens[i].type) &&
          this.tokens[i + 1].type === 'IDENT' &&
          this.tokens[i + 2].type === 'LPAREN') {
        hasFunction = true;
        break;
      }
    }

    const stmts = [];
    if (hasFunction) {
      while (this.current().type !== 'EOF') {
        if (['INT', 'VOID'].includes(this.current().type)) {
          if (this.tokens[this.pos + 1]?.type === 'IDENT' && this.tokens[this.pos + 2]?.type === 'LPAREN') {
            const fn = this.parseFunction();
            stmts.push(...fn.body);
          } else {
            stmts.push(...this.parseVarDecl());
          }
        } else {
          stmts.push(this.parseStatement());
        }
      }
    } else {
      while (this.current().type !== 'EOF') {
        stmts.push(this.parseStatement());
      }
    }
    return stmts.filter(Boolean);
  }

  parseFunction() {
    this.advance(); // return type
    this.expect('IDENT', 'function name');
    this.expect('LPAREN');
    while (this.current().type !== 'RPAREN' && this.current().type !== 'EOF') {
      this.advance();
    }
    this.expect('RPAREN');
    this.expect('LBRACE');
    const body = [];
    while (this.current().type !== 'RBRACE' && this.current().type !== 'EOF') {
      body.push(this.parseStatement());
    }
    this.expect('RBRACE');
    return { body };
  }

  parseStatement() {
    const tok = this.current();
    if (tok.type === 'LBRACE') {
      this.advance();
      const list = [];
      while (this.current().type !== 'RBRACE' && this.current().type !== 'EOF') {
        list.push(this.parseStatement());
      }
      this.expect('RBRACE');
      return { type: 'compound', statements: list };
    }
    if (tok.type === 'INT') {
      const decls = this.parseVarDecl();
      return decls.length === 1 ? decls[0] : { type: 'compound', statements: decls };
    }
    if (tok.type === 'IF') return this.parseIf();
    if (tok.type === 'WHILE') return this.parseWhile();
    if (tok.type === 'FOR') return this.parseFor();
    if (tok.type === 'DO') return this.parseDoWhile();
    if (tok.type === 'RETURN') {
      const rTok = this.advance();
      let expr = null;
      if (this.current().type !== 'SEMI') expr = this.parseExpr();
      this.expect('SEMI');
      return { type: 'return', expr, line: rTok.line };
    }
    if (tok.type === 'SEMI') {
      this.advance();
      return null;
    }
    const expr = this.parseExpr();
    this.expect('SEMI', 'at end of statement');
    return { type: 'expr_stmt', expr, line: tok.line };
  }

  parseVarDecl() {
    this.advance(); // 'int'
    const decls = [];
    const nameTok = this.expect('IDENT', 'as variable name');
    let init = null;
    if (this.match('ASSIGN')) {
      init = this.parseExpr();
    }
    decls.push({ type: 'var_decl', name: nameTok.value, init, line: nameTok.line });

    while (this.match('COMMA')) {
      const nTok = this.expect('IDENT', 'as variable name');
      let inExpr = null;
      if (this.match('ASSIGN')) {
        inExpr = this.parseExpr();
      }
      decls.push({ type: 'var_decl', name: nTok.value, init: inExpr, line: nTok.line });
    }
    this.expect('SEMI', 'after variable declaration');
    return decls;
  }

  parseIf() {
    const tok = this.expect('IF');
    this.expect('LPAREN');
    const cond = this.parseExpr();
    this.expect('RPAREN');
    const thenBranch = this.parseStatement();
    let elseBranch = null;
    if (this.match('ELSE')) {
      elseBranch = this.parseStatement();
    }
    return { type: 'if', cond, thenBranch, elseBranch, line: tok.line };
  }

  parseWhile() {
    const tok = this.expect('WHILE');
    this.expect('LPAREN');
    const cond = this.parseExpr();
    this.expect('RPAREN');
    const body = this.parseStatement();
    return { type: 'while', cond, body, line: tok.line };
  }

  parseFor() {
    const tok = this.expect('FOR');
    this.expect('LPAREN');
    let init = null;
    if (this.current().type === 'INT') {
      init = this.parseVarDecl();
    } else if (this.current().type !== 'SEMI') {
      init = this.parseExpr();
      this.expect('SEMI');
    } else {
      this.expect('SEMI');
    }

    let cond = null;
    if (this.current().type !== 'SEMI') cond = this.parseExpr();
    this.expect('SEMI');

    let post = null;
    if (this.current().type !== 'RPAREN') post = this.parseExpr();
    this.expect('RPAREN');

    const body = this.parseStatement();
    return { type: 'for', init, cond, post, body, line: tok.line };
  }

  parseDoWhile() {
    const tok = this.expect('DO');
    const body = this.parseStatement();
    this.expect('WHILE');
    this.expect('LPAREN');
    const cond = this.parseExpr();
    this.expect('RPAREN');
    this.expect('SEMI');
    return { type: 'do_while', body, cond, line: tok.line };
  }

  parseExpr() {
    return this.parseAssignment();
  }

  parseAssignment() {
    const left = this.parseLogicalOr();
    const tok = this.current();
    if (['ASSIGN', 'ADD_ASSIGN', 'SUB_ASSIGN', 'MUL_ASSIGN', 'DIV_ASSIGN', 'MOD_ASSIGN'].includes(tok.type)) {
      this.advance();
      if (left.type !== 'ident') {
        throw { error_type: 'ParserError', message: 'Invalid left-hand side of assignment', line: tok.line, col: tok.col };
      }
      const right = this.parseAssignment();
      if (tok.type === 'ASSIGN') {
        return { type: 'assign', target: left.name, expr: right, line: tok.line };
      }
      const op = { ADD_ASSIGN: '+', SUB_ASSIGN: '-', MUL_ASSIGN: '*', DIV_ASSIGN: '/', MOD_ASSIGN: '%' }[tok.type];
      return {
        type: 'assign',
        target: left.name,
        expr: { type: 'binary', op, left, right, line: tok.line },
        line: tok.line,
      };
    }
    return left;
  }

  parseLogicalOr() {
    let expr = this.parseLogicalAnd();
    while (this.current().type === 'OR') {
      const op = this.advance().value;
      const right = this.parseLogicalAnd();
      expr = { type: 'binary', op, left: expr, right, line: expr.line };
    }
    return expr;
  }

  parseLogicalAnd() {
    let expr = this.parseEquality();
    while (this.current().type === 'AND') {
      const op = this.advance().value;
      const right = this.parseEquality();
      expr = { type: 'binary', op, left: expr, right, line: expr.line };
    }
    return expr;
  }

  parseEquality() {
    let expr = this.parseRelational();
    while (['EQ', 'NE'].includes(this.current().type)) {
      const op = this.advance().value;
      const right = this.parseRelational();
      expr = { type: 'binary', op, left: expr, right, line: expr.line };
    }
    return expr;
  }

  parseRelational() {
    let expr = this.parseAdditive();
    while (['LT', 'LE', 'GT', 'GE'].includes(this.current().type)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      expr = { type: 'binary', op, left: expr, right, line: expr.line };
    }
    return expr;
  }

  parseAdditive() {
    let expr = this.parseMultiplicative();
    while (['PLUS', 'MINUS'].includes(this.current().type)) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      expr = { type: 'binary', op, left: expr, right, line: expr.line };
    }
    return expr;
  }

  parseMultiplicative() {
    let expr = this.parseUnary();
    while (['MUL', 'DIV', 'MOD'].includes(this.current().type)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      expr = { type: 'binary', op, left: expr, right, line: expr.line };
    }
    return expr;
  }

  parseUnary() {
    const tok = this.current();
    if (['NOT', 'MINUS', 'PLUS'].includes(tok.type)) {
      this.advance();
      const operand = this.parseUnary();
      return { type: 'unary', op: tok.value, operand, line: tok.line };
    }
    if (['INC', 'DEC'].includes(tok.type)) {
      this.advance();
      const operand = this.parsePrimary();
      const op = tok.type === 'INC' ? '+' : '-';
      return {
        type: 'assign',
        target: operand.name,
        expr: { type: 'binary', op, left: operand, right: { type: 'num', value: 1, line: tok.line }, line: tok.line },
        line: tok.line,
      };
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    const expr = this.parsePrimary();
    const tok = this.current();
    if (['INC', 'DEC'].includes(tok.type)) {
      this.advance();
      const op = tok.type === 'INC' ? '+' : '-';
      return {
        type: 'assign',
        target: expr.name,
        expr: { type: 'binary', op, left: expr, right: { type: 'num', value: 1, line: tok.line }, line: tok.line },
        line: tok.line,
      };
    }
    return expr;
  }

  parsePrimary() {
    const tok = this.current();
    if (tok.type === 'NUMBER') {
      this.advance();
      return { type: 'num', value: Number(tok.value), line: tok.line };
    }
    if (tok.type === 'IDENT') {
      this.advance();
      return { type: 'ident', name: tok.value, line: tok.line };
    }
    if (tok.type === 'LPAREN') {
      this.advance();
      const expr = this.parseExpr();
      this.expect('RPAREN');
      return expr;
    }
    throw {
      error_type: 'ParserError',
      message: `Expected expression, got '${tok.value}'`,
      line: tok.line,
      col: tok.col,
    };
  }
}

// -------------------------------------------------------------
// 3. Three-Address Code (TAC) Generator
// -------------------------------------------------------------
function normalizeExpr(op, left, right) {
  if (['+', '*'].includes(op) && String(left) > String(right)) {
    return `${right} ${op} ${left}`;
  }
  return `${left} ${op} ${right}`;
}

class TACGenerator {
  constructor() {
    this.instructions = [];
    this.tempCount = 0;
    this.labelCount = 0;
  }

  newTemp() {
    this.tempCount++;
    return `t${this.tempCount}`;
  }

  newLabel() {
    this.labelCount++;
    return `L${this.labelCount}`;
  }

  emit(raw, type, line, stmt = '', opts = {}) {
    const id = this.instructions.length + 1;
    const instr = {
      id,
      raw,
      type,
      c_line: line,
      c_stmt: stmt,
      def_var: opts.def_var || null,
      use_vars: opts.use_vars || [],
      expr: opts.expr || null,
      target: opts.target || null,
      op: opts.op || null,
      arg1: opts.arg1 || null,
      arg2: opts.arg2 || null,
      result: opts.result || null,
      is_leader: false,
      leader_reason: null,
    };
    this.instructions.push(instr);
    return instr;
  }

  generate(stmts) {
    for (const stmt of stmts) {
      this.genStmt(stmt);
    }
    return this.instructions;
  }

  genStmt(stmt) {
    if (!stmt) return;
    if (stmt.type === 'compound') {
      for (const s of stmt.statements) this.genStmt(s);
    } else if (stmt.type === 'var_decl') {
      if (stmt.init) {
        const val = this.genExpr(stmt.init);
        const uses = isNaN(Number(val)) ? [val] : [];
        this.emit(`${stmt.name} = ${val}`, 'assign', stmt.line, `int ${stmt.name} = ${val};`, {
          def_var: stmt.name,
          use_vars: uses,
          result: stmt.name,
          arg1: val,
        });
      }
    } else if (stmt.type === 'expr_stmt') {
      this.genExpr(stmt.expr);
    } else if (stmt.type === 'assign') {
      const val = this.genExpr(stmt.expr);
      const uses = isNaN(Number(val)) ? [val] : [];
      this.emit(`${stmt.target} = ${val}`, 'assign', stmt.line, `${stmt.target} = ${val};`, {
        def_var: stmt.target,
        use_vars: uses,
        result: stmt.target,
        arg1: val,
      });
    } else if (stmt.type === 'if') {
      const condVal = this.genExpr(stmt.cond);
      const trueLbl = this.newLabel();
      const falseLbl = this.newLabel();
      const endLbl = this.newLabel();

      const uses = isNaN(Number(condVal)) ? [condVal] : [];
      this.emit(`if ${condVal} goto ${trueLbl}`, 'if_goto', stmt.line, `if (${condVal})`, {
        use_vars: uses,
        target: trueLbl,
      });
      this.emit(`goto ${falseLbl}`, 'goto', stmt.line, '', { target: falseLbl });

      this.emit(`${trueLbl}:`, 'label', stmt.line, '', { target: trueLbl });
      this.genStmt(stmt.thenBranch);

      if (stmt.elseBranch) {
        this.emit(`goto ${endLbl}`, 'goto', stmt.line, '', { target: endLbl });
        this.emit(`${falseLbl}:`, 'label', stmt.line, '', { target: falseLbl });
        this.genStmt(stmt.elseBranch);
        this.emit(`${endLbl}:`, 'label', stmt.line, '', { target: endLbl });
      } else {
        this.emit(`${falseLbl}:`, 'label', stmt.line, '', { target: falseLbl });
      }
    } else if (stmt.type === 'while') {
      const startLbl = this.newLabel();
      const bodyLbl = this.newLabel();
      const exitLbl = this.newLabel();

      this.emit(`${startLbl}:`, 'label', stmt.line, '', { target: startLbl });
      const condVal = this.genExpr(stmt.cond);
      const uses = isNaN(Number(condVal)) ? [condVal] : [];
      this.emit(`if ${condVal} goto ${bodyLbl}`, 'if_goto', stmt.line, `while (${condVal})`, {
        use_vars: uses,
        target: bodyLbl,
      });
      this.emit(`goto ${exitLbl}`, 'goto', stmt.line, '', { target: exitLbl });

      this.emit(`${bodyLbl}:`, 'label', stmt.line, '', { target: bodyLbl });
      this.genStmt(stmt.body);
      this.emit(`goto ${startLbl}`, 'goto', stmt.line, '', { target: startLbl });

      this.emit(`${exitLbl}:`, 'label', stmt.line, '', { target: exitLbl });
    } else if (stmt.type === 'for') {
      if (Array.isArray(stmt.init)) {
        for (const s of stmt.init) this.genStmt(s);
      } else if (stmt.init) {
        this.genStmt(stmt.init);
      }
      const startLbl = this.newLabel();
      const bodyLbl = this.newLabel();
      const exitLbl = this.newLabel();

      this.emit(`${startLbl}:`, 'label', stmt.line, '', { target: startLbl });
      if (stmt.cond) {
        const condVal = this.genExpr(stmt.cond);
        const uses = isNaN(Number(condVal)) ? [condVal] : [];
        this.emit(`if ${condVal} goto ${bodyLbl}`, 'if_goto', stmt.line, '', {
          use_vars: uses,
          target: bodyLbl,
        });
        this.emit(`goto ${exitLbl}`, 'goto', stmt.line, '', { target: exitLbl });
      }

      this.emit(`${bodyLbl}:`, 'label', stmt.line, '', { target: bodyLbl });
      this.genStmt(stmt.body);
      if (stmt.post) this.genExpr(stmt.post);
      this.emit(`goto ${startLbl}`, 'goto', stmt.line, '', { target: startLbl });

      this.emit(`${exitLbl}:`, 'label', stmt.line, '', { target: exitLbl });
    } else if (stmt.type === 'do_while') {
      const loopLbl = this.newLabel();
      this.emit(`${loopLbl}:`, 'label', stmt.line, '', { target: loopLbl });
      this.genStmt(stmt.body);
      const condVal = this.genExpr(stmt.cond);
      const uses = isNaN(Number(condVal)) ? [condVal] : [];
      this.emit(`if ${condVal} goto ${loopLbl}`, 'if_goto', stmt.line, '', {
        use_vars: uses,
        target: loopLbl,
      });
    } else if (stmt.type === 'return') {
      if (stmt.expr) {
        const val = this.genExpr(stmt.expr);
        const uses = isNaN(Number(val)) ? [val] : [];
        this.emit(`return ${val}`, 'return', stmt.line, `return ${val};`, {
          use_vars: uses,
          arg1: val,
        });
      } else {
        this.emit('return', 'return', stmt.line, 'return;');
      }
    }
  }

  genExpr(expr) {
    if (!expr) return '0';
    if (expr.type === 'num') return String(expr.value);
    if (expr.type === 'ident') return expr.name;
    if (expr.type === 'assign') {
      const val = this.genExpr(expr.expr);
      const uses = isNaN(Number(val)) ? [val] : [];
      this.emit(`${expr.target} = ${val}`, 'assign', expr.line, `${expr.target} = ${val};`, {
        def_var: expr.target,
        use_vars: uses,
        result: expr.target,
        arg1: val,
      });
      return expr.target;
    }
    if (expr.type === 'binary') {
      const leftVal = this.genExpr(expr.left);
      const rightVal = this.genExpr(expr.right);
      const t = this.newTemp();
      const uses = [];
      if (isNaN(Number(leftVal))) uses.push(leftVal);
      if (isNaN(Number(rightVal))) uses.push(rightVal);
      const normE = normalizeExpr(expr.op, leftVal, rightVal);
      this.emit(`${t} = ${leftVal} ${expr.op} ${rightVal}`, 'binary', expr.line, `${t} = ${normE}`, {
        def_var: t,
        use_vars: uses,
        expr: normE,
        result: t,
        op: expr.op,
        arg1: leftVal,
        arg2: rightVal,
      });
      return t;
    }
    if (expr.type === 'unary') {
      const val = this.genExpr(expr.operand);
      const t = this.newTemp();
      const uses = isNaN(Number(val)) ? [val] : [];
      this.emit(`${t} = ${expr.op}${val}`, 'unary', expr.line, `${t} = ${expr.op}${val}`, {
        def_var: t,
        use_vars: uses,
        result: t,
        op: expr.op,
        arg1: val,
      });
      return t;
    }
    return '0';
  }
}

// -------------------------------------------------------------
// 4. Basic Block Partitioning (Leaders Detection)
// -------------------------------------------------------------
class BasicBlockBuilder {
  constructor(instructions) {
    this.instructions = instructions;
    this.labelToIndex = {};
    this.leaders = new Set();
    this.leaderReasons = {};
    this.blocks = [];
    this.instrToBlock = {};
  }

  partition() {
    const n = this.instructions.length;
    if (n === 0) return [];

    // Map labels
    for (let i = 0; i < n; i++) {
      const instr = this.instructions[i];
      if (instr.type === 'label' && instr.target) {
        const clean = instr.target.replace(/:$/, '');
        this.labelToIndex[clean] = i;
        this.labelToIndex[instr.target] = i;
      }
    }

    // Rule 1: First instruction is leader
    this.leaders.add(0);
    this.leaderReasons[0] = 'Rule 1: First instruction of intermediate code';

    // Rules 2 & 3
    for (let i = 0; i < n; i++) {
      const instr = this.instructions[i];
      if (['goto', 'if_goto'].includes(instr.type)) {
        const tgt = instr.target?.replace(/:$/, '');
        if (tgt && this.labelToIndex[tgt] !== undefined) {
          const tgtIdx = this.labelToIndex[tgt];
          this.leaders.add(tgtIdx);
          const r = `Rule 2: Target of jump at instruction #${instr.id}`;
          this.leaderReasons[tgtIdx] = this.leaderReasons[tgtIdx] ? `${this.leaderReasons[tgtIdx]}; ${r}` : r;
        }
        if (i + 1 < n) {
          this.leaders.add(i + 1);
          const r = `Rule 3: Follows jump instruction #${instr.id}`;
          this.leaderReasons[i + 1] = this.leaderReasons[i + 1] ? `${this.leaderReasons[i + 1]}; ${r}` : r;
        }
      }
    }

    // Mark leaders
    for (let i = 0; i < n; i++) {
      if (this.leaders.has(i)) {
        this.instructions[i].is_leader = true;
        this.instructions[i].leader_reason = this.leaderReasons[i] || 'Leader instruction';
      }
    }

    const sortedLeaders = Array.from(this.leaders).sort((a, b) => a - b);

    // ENTRY block
    this.blocks.push({
      id: 'ENTRY',
      name: 'ENTRY',
      instructions: [],
      predecessors: [],
      successors: [],
      is_entry: true,
      is_exit: false,
    });

    for (let i = 0; i < sortedLeaders.length; i++) {
      const startIdx = sortedLeaders[i];
      const endIdx = i + 1 < sortedLeaders.length ? sortedLeaders[i + 1] : n;
      const bInstrs = this.instructions.slice(startIdx, endIdx);
      const bId = `B${i + 1}`;
      this.blocks.push({
        id: bId,
        name: `Block ${i + 1}`,
        instructions: bInstrs,
        predecessors: [],
        successors: [],
        is_entry: false,
        is_exit: false,
      });

      for (let j = startIdx; j < endIdx; j++) {
        this.instrToBlock[j] = bId;
      }
    }

    // EXIT block
    this.blocks.push({
      id: 'EXIT',
      name: 'EXIT',
      instructions: [],
      predecessors: [],
      successors: [],
      is_entry: false,
      is_exit: true,
    });

    return this.blocks;
  }
}

// -------------------------------------------------------------
// 5. CFG Construction
// -------------------------------------------------------------
class CFGBuilder {
  constructor(bbBuilder) {
    this.bbBuilder = bbBuilder;
    this.blocks = bbBuilder.blocks;
    this.instructions = bbBuilder.instructions;
    this.edges = [];
  }

  isBackEdge(src, tgt) {
    const s = parseInt(src.replace(/\D/g, ''), 10) || 0;
    const t = parseInt(tgt.replace(/\D/g, ''), 10) || 0;
    return t > 0 && s > 0 && t <= s;
  }

  addEdge(src, tgt, type, label = null) {
    if (this.edges.some((e) => e.source === src && e.target === tgt && e.type === type)) return;
    this.edges.push({ source: src, target: tgt, type, label });

    for (const b of this.blocks) {
      if (b.id === src && !b.successors.includes(tgt)) b.successors.push(tgt);
      if (b.id === tgt && !b.predecessors.includes(src)) b.predecessors.push(src);
    }
  }

  build() {
    const userBlocks = this.blocks.filter((b) => !b.is_entry && !b.is_exit);
    if (userBlocks.length === 0) {
      this.addEdge('ENTRY', 'EXIT', 'fallthrough', 'Start');
      return this.finalize();
    }

    this.addEdge('ENTRY', userBlocks[0].id, 'fallthrough', 'Start');

    for (let i = 0; i < userBlocks.length; i++) {
      const block = userBlocks[i];
      if (block.instructions.length === 0) {
        if (i + 1 < userBlocks.length) {
          this.addEdge(block.id, userBlocks[i + 1].id, 'fallthrough');
        } else {
          this.addEdge(block.id, 'EXIT', 'fallthrough', 'End');
        }
        continue;
      }

      const last = block.instructions[block.instructions.length - 1];
      let hasJump = false;

      if (last.type === 'goto') {
        hasJump = true;
        const tgt = last.target?.replace(/:$/, '');
        if (tgt && this.bbBuilder.labelToIndex[tgt] !== undefined) {
          const tgtIdx = this.bbBuilder.labelToIndex[tgt];
          const tgtBlockId = this.bbBuilder.instrToBlock[tgtIdx];
          if (tgtBlockId) {
            const edgeType = this.isBackEdge(block.id, tgtBlockId) ? 'back_edge' : 'unconditional';
            this.addEdge(block.id, tgtBlockId, edgeType, edgeType === 'back_edge' ? 'Loop Back' : 'goto');
          }
        }
      } else if (last.type === 'if_goto') {
        hasJump = true;
        const tgt = last.target?.replace(/:$/, '');
        if (tgt && this.bbBuilder.labelToIndex[tgt] !== undefined) {
          const tgtIdx = this.bbBuilder.labelToIndex[tgt];
          const tgtBlockId = this.bbBuilder.instrToBlock[tgtIdx];
          if (tgtBlockId) {
            const edgeType = this.isBackEdge(block.id, tgtBlockId) ? 'back_edge' : 'conditional_true';
            this.addEdge(block.id, tgtBlockId, edgeType, edgeType === 'back_edge' ? 'Loop Back' : 'True');
          }
        }
        if (i + 1 < userBlocks.length) {
          this.addEdge(block.id, userBlocks[i + 1].id, 'conditional_false', 'False');
        } else {
          this.addEdge(block.id, 'EXIT', 'conditional_false', 'False -> Exit');
        }
      } else if (last.type === 'return') {
        hasJump = true;
        this.addEdge(block.id, 'EXIT', 'fallthrough', 'Return');
      }

      if (!hasJump) {
        if (i + 1 < userBlocks.length) {
          this.addEdge(block.id, userBlocks[i + 1].id, 'fallthrough');
        } else {
          this.addEdge(block.id, 'EXIT', 'fallthrough', 'End');
        }
      }
    }

    for (const b of userBlocks) {
      if (b.successors.length === 0) {
        this.addEdge(b.id, 'EXIT', 'fallthrough');
      }
    }

    return this.finalize();
  }

  finalize() {
    const varsSet = new Set();
    const exprsSet = new Set();
    const defsList = [];
    let dCount = 1;

    for (let idx = 0; idx < this.instructions.length; idx++) {
      const instr = this.instructions[idx];
      if (instr.def_var) {
        varsSet.add(instr.def_var);
        const defId = `d${dCount++}`;
        defsList.push({
          id: defId,
          var: instr.def_var,
          instr_id: instr.id,
          code: instr.raw,
          c_line: instr.c_line,
          c_stmt: instr.c_stmt,
          block: this.bbBuilder.instrToBlock[idx] || 'UNKNOWN',
        });
      }
      for (const u of instr.use_vars) varsSet.add(u);
      if (instr.expr) exprsSet.add(instr.expr);
    }

    return {
      blocks: this.blocks,
      edges: this.edges,
      total_instructions: this.instructions.length,
      variables: Array.from(varsSet).sort(),
      expressions: Array.from(exprsSet).sort(),
      definitions: defsList,
    };
  }
}

// -------------------------------------------------------------
// 6. Reaching Definitions Analysis
// -------------------------------------------------------------
function solveReachingDefinitions(cfg) {
  const definitions = cfg.definitions;
  const defMap = Object.fromEntries(definitions.map((d) => [d.id, d]));
  const varToDefs = {};
  for (const d of definitions) {
    if (!varToDefs[d.var]) varToDefs[d.var] = new Set();
    varToDefs[d.var].add(d.id);
  }

  const blockGen = {};
  const blockKill = {};

  for (const b of cfg.blocks) {
    blockGen[b.id] = new Set();
    blockKill[b.id] = new Set();
  }

  const userBlocks = cfg.blocks.filter((b) => !b.is_entry && !b.is_exit);
  for (const block of userBlocks) {
    let gen = new Set();
    const killedVars = new Set();

    for (const instr of block.instructions) {
      if (instr.def_var) {
        const dObj = definitions.find((d) => d.instr_id === instr.id);
        if (dObj) {
          gen = new Set([...gen].filter((d) => defMap[d]?.var !== instr.def_var));
          gen.add(dObj.id);
          killedVars.add(instr.def_var);
        }
      }
    }

    const kill = new Set();
    for (const v of killedVars) {
      const allDefs = varToDefs[v] || new Set();
      for (const d of allDefs) {
        if (!gen.has(d)) kill.add(d);
      }
    }
    blockGen[block.id] = gen;
    blockKill[block.id] = kill;
  }

  const inSets = Object.fromEntries(cfg.blocks.map((b) => [b.id, new Set()]));
  const outSets = Object.fromEntries(cfg.blocks.map((b) => [b.id, new Set(blockGen[b.id] || [])]));

  const initialIn = Object.fromEntries(Object.entries(inSets).map(([k, v]) => [k, Array.from(v).sort()]));
  const initialOut = Object.fromEntries(Object.entries(outSets).map(([k, v]) => [k, Array.from(v).sort()]));

  const steps = [];
  let iteration = 1;
  let changed = true;
  const predMap = Object.fromEntries(cfg.blocks.map((b) => [b.id, b.predecessors || []]));

  while (changed && iteration <= 30) {
    changed = false;
    for (const block of cfg.blocks) {
      const bId = block.id;
      const preds = predMap[bId] || [];
      const newIn = new Set();
      for (const p of preds) {
        for (const item of outSets[p] || []) newIn.add(item);
      }

      const gen = blockGen[bId] || new Set();
      const kill = blockKill[bId] || new Set();

      const newOut = new Set(gen);
      for (const item of newIn) {
        if (!kill.has(item)) newOut.add(item);
      }

      const inDiff = Array.from(newIn).sort().join(',') !== Array.from(inSets[bId]).sort().join(',');
      const outDiff = Array.from(newOut).sort().join(',') !== Array.from(outSets[bId]).sort().join(',');
      const stepChanged = inDiff || outDiff;
      if (stepChanged) changed = true;

      const explParts = [];
      if (preds.length > 0) {
        explParts.push(`IN = ∪ OUT(${preds.join(', ')}) = {${Array.from(newIn).sort().join(', ') || '∅'}}`);
      } else {
        explParts.push('IN = ∅ (No predecessors / Entry)');
      }
      explParts.push(`OUT = GEN ∪ (IN − KILL) = {${Array.from(newOut).sort().join(', ') || '∅'}}`);

      steps.push({
        iteration,
        block_id: bId,
        direction: 'forward',
        in_set: Array.from(newIn).sort(),
        out_set: Array.from(newOut).sort(),
        gen_set: Array.from(gen).sort(),
        kill_set: Array.from(kill).sort(),
        has_changed: stepChanged,
        explanation: explParts.join(' | '),
      });

      inSets[bId] = newIn;
      outSets[bId] = newOut;
    }
    iteration++;
  }

  // Diagnostics: Uninitialized warnings
  const diagnostics = [];
  for (const block of userBlocks) {
    const currentInDefs = inSets[block.id] || new Set();
    const definedVars = new Set([...currentInDefs].map((d) => defMap[d]?.var).filter(Boolean));
    for (const instr of block.instructions) {
      for (const u of instr.use_vars) {
        if (!u.startsWith('t') && !definedVars.has(u)) {
          diagnostics.push({
            type: 'uninitialized_warning',
            severity: 'warning',
            message: `Variable '${u}' may be read before being initialized (at line ${instr.c_line}: '${instr.c_stmt || instr.raw}')`,
            block: block.id,
            line: instr.c_line,
            source: 'Reaching Definitions',
          });
        }
      }
      if (instr.def_var) definedVars.add(instr.def_var);
    }
  }

  return {
    analysis_type: 'Reaching Definitions',
    direction: 'forward',
    meet_operator: '∪ (Union)',
    confluence_equation: 'IN[B] = ⋃_{P ∈ Pred(B)} OUT[P]',
    transfer_equation: 'OUT[B] = GEN[B] ∪ (IN[B] − KILL[B])',
    universal_set: definitions.map((d) => d.id),
    block_gen: Object.fromEntries(Object.entries(blockGen).map(([k, v]) => [k, Array.from(v).sort()])),
    block_kill: Object.fromEntries(Object.entries(blockKill).map(([k, v]) => [k, Array.from(v).sort()])),
    initial_in: initialIn,
    initial_out: initialOut,
    final_in: Object.fromEntries(Object.entries(inSets).map(([k, v]) => [k, Array.from(v).sort()])),
    final_out: Object.fromEntries(Object.entries(outSets).map(([k, v]) => [k, Array.from(v).sort()])),
    steps,
    total_iterations: iteration - 1,
    definitions_table: definitions,
    diagnostics,
  };
}

// -------------------------------------------------------------
// 7. Live Variables Analysis
// -------------------------------------------------------------
function solveLiveVariables(cfg) {
  const variables = cfg.variables || [];
  const blockDef = {};
  const blockUse = {};

  for (const b of cfg.blocks) {
    blockDef[b.id] = new Set();
    blockUse[b.id] = new Set();
  }

  const userBlocks = cfg.blocks.filter((b) => !b.is_entry && !b.is_exit);
  for (const block of userBlocks) {
    const defs = new Set();
    const uses = new Set();

    for (const instr of block.instructions) {
      for (const u of instr.use_vars) {
        if (!defs.has(u)) uses.add(u);
      }
      if (instr.def_var) defs.add(instr.def_var);
    }
    blockUse[block.id] = uses;
    blockDef[block.id] = defs;
  }

  const inSets = Object.fromEntries(cfg.blocks.map((b) => [b.id, new Set()]));
  const outSets = Object.fromEntries(cfg.blocks.map((b) => [b.id, new Set()]));

  const initialIn = Object.fromEntries(Object.entries(inSets).map(([k, v]) => [k, Array.from(v).sort()]));
  const initialOut = Object.fromEntries(Object.entries(outSets).map(([k, v]) => [k, Array.from(v).sort()]));

  const steps = [];
  let iteration = 1;
  let changed = true;
  const succMap = Object.fromEntries(cfg.blocks.map((b) => [b.id, b.successors || []]));
  const reversedBlocks = [...cfg.blocks].reverse();

  while (changed && iteration <= 30) {
    changed = false;
    for (const block of reversedBlocks) {
      const bId = block.id;
      const succs = succMap[bId] || [];
      const newOut = new Set();
      for (const s of succs) {
        for (const item of inSets[s] || []) newOut.add(item);
      }

      const use = blockUse[bId] || new Set();
      const def = blockDef[bId] || new Set();

      const newIn = new Set(use);
      for (const item of newOut) {
        if (!def.has(item)) newIn.add(item);
      }

      const inDiff = Array.from(newIn).sort().join(',') !== Array.from(inSets[bId]).sort().join(',');
      const outDiff = Array.from(newOut).sort().join(',') !== Array.from(outSets[bId]).sort().join(',');
      const stepChanged = inDiff || outDiff;
      if (stepChanged) changed = true;

      const explParts = [];
      if (succs.length > 0) {
        explParts.push(`OUT = ∪ IN(${succs.join(', ')}) = {${Array.from(newOut).sort().join(', ') || '∅'}}`);
      } else {
        explParts.push('OUT = ∅ (Program Exit / No successors)');
      }
      explParts.push(`IN = USE ∪ (OUT − DEF) = {${Array.from(newIn).sort().join(', ') || '∅'}}`);

      steps.push({
        iteration,
        block_id: bId,
        direction: 'backward',
        in_set: Array.from(newIn).sort(),
        out_set: Array.from(newOut).sort(),
        gen_set: Array.from(use).sort(),
        kill_set: Array.from(def).sort(),
        has_changed: stepChanged,
        explanation: explParts.join(' | '),
      });

      inSets[bId] = newIn;
      outSets[bId] = newOut;
    }
    iteration++;
  }

  // Diagnostics: Dead assignment detection
  const diagnostics = [];
  for (const block of userBlocks) {
    let currentLive = new Set(outSets[block.id] || []);
    for (let i = block.instructions.length - 1; i >= 0; i--) {
      const instr = block.instructions[i];
      if (instr.def_var && !instr.def_var.startsWith('t')) {
        if (!currentLive.has(instr.def_var) && instr.type !== 'return') {
          diagnostics.push({
            type: 'dead_assignment',
            severity: 'info',
            message: `Dead assignment: Variable '${instr.def_var}' is assigned at line ${instr.c_line} ('${instr.c_stmt || instr.raw}'), but is never live afterwards.`,
            block: block.id,
            line: instr.c_line,
            source: 'Live Variable Analysis',
          });
        }
        currentLive.delete(instr.def_var);
      }
      for (const u of instr.use_vars) currentLive.add(u);
    }
  }

  return {
    analysis_type: 'Live Variable Analysis',
    direction: 'backward',
    meet_operator: '∪ (Union)',
    confluence_equation: 'OUT[B] = ⋃_{S ∈ Succ(B)} IN[S]',
    transfer_equation: 'IN[B] = USE[B] ∪ (OUT[B] − DEF[B])',
    universal_set: variables,
    block_gen: Object.fromEntries(Object.entries(blockUse).map(([k, v]) => [k, Array.from(v).sort()])),
    block_kill: Object.fromEntries(Object.entries(blockDef).map(([k, v]) => [k, Array.from(v).sort()])),
    initial_in: initialIn,
    initial_out: initialOut,
    final_in: Object.fromEntries(Object.entries(inSets).map(([k, v]) => [k, Array.from(v).sort()])),
    final_out: Object.fromEntries(Object.entries(outSets).map(([k, v]) => [k, Array.from(v).sort()])),
    steps,
    total_iterations: iteration - 1,
    diagnostics,
  };
}

// -------------------------------------------------------------
// 8. Available Expressions Analysis
// -------------------------------------------------------------
function operandsOfExpr(exprStr) {
  const parts = exprStr.split(/\s+/);
  const operators = new Set(['+', '-', '*', '/', '%', '<', '<=', '>', '>=', '==', '!=', '&&', '||']);
  return new Set(parts.filter((p) => p && !operators.has(p) && isNaN(Number(p))));
}

function solveAvailableExpressions(cfg) {
  const universal = cfg.expressions || [];
  const U = new Set(universal);

  const blockGen = {};
  const blockKill = {};

  for (const b of cfg.blocks) {
    blockGen[b.id] = new Set();
    blockKill[b.id] = new Set();
  }

  const userBlocks = cfg.blocks.filter((b) => !b.is_entry && !b.is_exit);
  for (const block of userBlocks) {
    let gen = new Set();
    const killedOperands = new Set();

    for (const instr of block.instructions) {
      if (instr.expr && U.has(instr.expr)) {
        gen.add(instr.expr);
      }
      if (instr.def_var) {
        killedOperands.add(instr.def_var);
        gen = new Set([...gen].filter((e) => !operandsOfExpr(e).has(instr.def_var)));
      }
    }

    const kill = new Set();
    for (const e of U) {
      const ops = operandsOfExpr(e);
      let overlaps = false;
      for (const k of killedOperands) {
        if (ops.has(k)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) kill.add(e);
    }

    blockGen[block.id] = gen;
    blockKill[block.id] = kill;
  }

  const inSets = {};
  const outSets = {};

  inSets.ENTRY = new Set();
  outSets.ENTRY = new Set();

  for (const b of cfg.blocks) {
    if (b.id !== 'ENTRY') {
      inSets[b.id] = new Set(U);
      outSets[b.id] = new Set(U);
    }
  }

  const initialIn = Object.fromEntries(Object.entries(inSets).map(([k, v]) => [k, Array.from(v).sort()]));
  const initialOut = Object.fromEntries(Object.entries(outSets).map(([k, v]) => [k, Array.from(v).sort()]));

  const steps = [];
  let iteration = 1;
  let changed = true;
  const predMap = Object.fromEntries(cfg.blocks.map((b) => [b.id, b.predecessors || []]));

  while (changed && iteration <= 30) {
    changed = false;
    for (const block of cfg.blocks) {
      const bId = block.id;
      if (bId === 'ENTRY') continue;

      const preds = predMap[bId] || [];
      let newIn = new Set();

      if (preds.length > 0) {
        const firstPredOut = outSets[preds[0]] || new Set();
        newIn = new Set(firstPredOut);
        for (let pIdx = 1; pIdx < preds.length; pIdx++) {
          const predOut = outSets[preds[pIdx]] || new Set();
          newIn = new Set([...newIn].filter((x) => predOut.has(x)));
        }
      }

      const gen = blockGen[bId] || new Set();
      const kill = blockKill[bId] || new Set();

      const newOut = new Set(gen);
      for (const item of newIn) {
        if (!kill.has(item)) newOut.add(item);
      }

      const inDiff = Array.from(newIn).sort().join(',') !== Array.from(inSets[bId]).sort().join(',');
      const outDiff = Array.from(newOut).sort().join(',') !== Array.from(outSets[bId]).sort().join(',');
      const stepChanged = inDiff || outDiff;
      if (stepChanged) changed = true;

      const explParts = [];
      if (preds.length > 0) {
        explParts.push(`IN = ∩ OUT(${preds.join(', ')}) = {${Array.from(newIn).sort().join(', ') || '∅'}}`);
      } else {
        explParts.push('IN = ∅ (No predecessors)');
      }
      explParts.push(`OUT = GEN ∪ (IN − KILL) = {${Array.from(newOut).sort().join(', ') || '∅'}}`);

      steps.push({
        iteration,
        block_id: bId,
        direction: 'forward',
        in_set: Array.from(newIn).sort(),
        out_set: Array.from(newOut).sort(),
        gen_set: Array.from(gen).sort(),
        kill_set: Array.from(kill).sort(),
        has_changed: stepChanged,
        explanation: explParts.join(' | '),
      });

      inSets[bId] = newIn;
      outSets[bId] = newOut;
    }
    iteration++;
  }

  // Diagnostics: CSE opportunities
  const diagnostics = [];
  for (const block of userBlocks) {
    let currentAvail = new Set(inSets[block.id] || []);
    for (const instr of block.instructions) {
      if (instr.expr && currentAvail.has(instr.expr)) {
        diagnostics.push({
          type: 'cse_opportunity',
          severity: 'success',
          message: `Common Subexpression: Expression '${instr.expr}' at line ${instr.c_line} ('${instr.c_stmt || instr.raw}') is already available and can be reused.`,
          block: block.id,
          line: instr.c_line,
          source: 'Available Expressions',
        });
      }
      if (instr.expr) currentAvail.add(instr.expr);
      if (instr.def_var) {
        currentAvail = new Set([...currentAvail].filter((e) => !operandsOfExpr(e).has(instr.def_var)));
      }
    }
  }

  return {
    analysis_type: 'Available Expressions',
    direction: 'forward',
    meet_operator: '∩ (Intersection)',
    confluence_equation: 'IN[B] = ⋂_{P ∈ Pred(B)} OUT[P]',
    transfer_equation: 'OUT[B] = GEN[B] ∪ (IN[B] − KILL[B])',
    universal_set: universal,
    block_gen: Object.fromEntries(Object.entries(blockGen).map(([k, v]) => [k, Array.from(v).sort()])),
    block_kill: Object.fromEntries(Object.entries(blockKill).map(([k, v]) => [k, Array.from(v).sort()])),
    initial_in: initialIn,
    initial_out: initialOut,
    final_in: Object.fromEntries(Object.entries(inSets).map(([k, v]) => [k, Array.from(v).sort()])),
    final_out: Object.fromEntries(Object.entries(outSets).map(([k, v]) => [k, Array.from(v).sort()])),
    steps,
    total_iterations: iteration - 1,
    universal_set_items: universal,
    diagnostics,
  };
}

// -------------------------------------------------------------
// 9. Full Master Compiler Pipeline
// -------------------------------------------------------------
export function compileAndAnalyzeClient(sourceCode) {
  if (!sourceCode || !sourceCode.trim()) {
    throw {
      error_type: 'InputError',
      message: 'Source code cannot be empty. Please enter C source code.',
      line: 1,
      col: 1,
    };
  }

  // 1. Lexer
  const lexer = new Lexer(sourceCode);
  const tokens = lexer.tokenize();

  // 2. Parser
  const parser = new Parser(tokens);
  const astStmts = parser.parseProgram();

  // 3. TAC Generation
  const tacGen = new TACGenerator();
  const instructions = tacGen.generate(astStmts);

  if (!instructions || instructions.length === 0) {
    throw {
      error_type: 'CompilationError',
      message: 'No executable instructions generated from source code',
      line: 1,
      col: 1,
    };
  }

  // 4. Basic Block Partitioning (Leaders)
  const bbBuilder = new BasicBlockBuilder(instructions);
  bbBuilder.partition();

  // 5. CFG Construction
  const cfgBuilder = new CFGBuilder(bbBuilder);
  const cfg = cfgBuilder.build();

  // 6. Data-Flow Solvers
  const rd = solveReachingDefinitions(cfg);
  const lv = solveLiveVariables(cfg);
  const ae = solveAvailableExpressions(cfg);

  const optimizations = [
    ...(rd.diagnostics || []),
    ...(lv.diagnostics || []),
    ...(ae.diagnostics || []),
  ];

  return {
    engine: 'client',
    cfg,
    reaching_definitions: rd,
    live_variables: lv,
    available_expressions: ae,
    optimizations,
  };
}

