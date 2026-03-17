// Recursive-descent arithmetic parser.
// parseLinear: evaluates the expression numerically.
// parseReciprocal: converts each numeric token via toHartree() before evaluation.

type Token =
  | { t: 'num'; v: number }
  | { t: 'op';  v: '+' | '-' | '*' | '/' }
  | { t: 'lparen' }
  | { t: 'rparen' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch))  { i++; continue; }
    if (ch === '(')     { tokens.push({ t: 'lparen' }); i++; continue; }
    if (ch === ')')     { tokens.push({ t: 'rparen' }); i++; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ t: 'op', v: ch as '+' | '-' | '*' | '/' });
      i++;
      continue;
    }
    // Number token (supports scientific notation: 1.5e-3, 3.2E+4)
    const numMatch = input.slice(i).match(/^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/);
    if (numMatch) {
      const v = parseFloat(numMatch[0]);
      tokens.push({ t: 'num', v });
      i += numMatch[0].length;
      continue;
    }
    return []; // unrecognised character → signal invalid input
  }
  return tokens;
}

function evaluate(tokens: Token[], toHartree?: (n: number) => number): number {
  let pos = 0;

  function peek(): Token | undefined { return tokens[pos]; }
  function consume(): Token          { return tokens[pos++]; }

  // parseExpr: additive level — numbers here get toHartree applied
  function parseExpr(): number {
    let left = parseTerm(true);
    for (;;) {
      const tok = peek();
      if (tok?.t === 'op' && (tok.v === '+' || tok.v === '-')) {
        consume();
        const right = parseTerm(true);
        left = tok.v === '+' ? left + right : left - right;
      } else break;
    }
    return left;
  }

  // parseTerm: multiplicative level — numbers here are plain scalars (no toHartree)
  function parseTerm(convertNums: boolean): number {
    let left = parseUnary(convertNums);
    for (;;) {
      const tok = peek();
      if (tok?.t === 'op' && (tok.v === '*' || tok.v === '/')) {
        consume();
        // After * or /, treat subsequent numbers as plain scalars
        const right = parseUnary(false);
        left = tok.v === '*' ? left * right : left / right;
      } else break;
    }
    return left;
  }

  function parseUnary(convertNums: boolean): number {
    const tok = peek();
    if (tok?.t === 'op' && tok.v === '-') { consume(); return -parseUnary(convertNums); }
    return parsePrimary(convertNums);
  }

  function parsePrimary(convertNums: boolean): number {
    const tok = peek();
    if (!tok) return NaN;
    if (tok.t === 'num') {
      consume();
      const v = tok.v;
      return (convertNums && toHartree !== undefined) ? toHartree(v) : v;
    }
    if (tok.t === 'lparen') {
      consume();
      // Inside parens, reset to full conversion context (additive level)
      const v = parseExpr();
      if (peek()?.t === 'rparen') consume();
      return v;
    }
    return NaN;
  }

  if (tokens.length === 0) return NaN;
  const result = parseExpr();
  return pos === tokens.length ? result : NaN;
}

/** Parse a linear-unit arithmetic expression. Returns NaN on error. */
export function parseLinear(input: string): number {
  if (!input.trim()) return NaN;
  return evaluate(tokenize(input));
}

/**
 * Parse a reciprocal-unit expression.
 * Each numeric literal in an additive position is converted to Hartree via
 * toHartree() before arithmetic is applied. Numbers used as plain scalars
 * in multiplicative positions (e.g. the 2 in `(300+600)/2`) are not converted.
 */
export function parseReciprocal(input: string, toHartree: (n: number) => number): number {
  if (!input.trim()) return NaN;
  return evaluate(tokenize(input), toHartree);
}
