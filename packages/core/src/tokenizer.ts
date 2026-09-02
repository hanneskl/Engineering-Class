/**
 * Tokenizer for German-locale spreadsheet formulas.
 *
 *   argument separator  ;
 *   decimal separator   ,   (a `.` is also accepted — it is unambiguous in our grammar,
 *                            and rejecting it would fail students for a typing habit
 *                            rather than for a spreadsheet mistake)
 */

export type TokenType =
  | 'number'
  | 'string'
  | 'ident'
  | 'ref'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'sep'
  | 'colon'
  | 'eof'

export interface Token {
  readonly type: TokenType
  readonly text: string
  readonly start: number
}

export class TokenizeError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message)
    this.name = 'TokenizeError'
  }
}

const OPERATORS = ['<>', '<=', '>=', '+', '-', '*', '/', '^', '=', '<', '>', '&']
const REF_PATTERN = /^\$?[A-Za-z]+\$?[0-9]+/
const IDENT_PATTERN = /^[A-Za-zÄÖÜäöü_][A-Za-zÄÖÜäöü0-9_.]*/

export function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < source.length) {
    const ch = source[i]!

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', text: ch, start: i++ })
      continue
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', text: ch, start: i++ })
      continue
    }
    if (ch === ';') {
      tokens.push({ type: 'sep', text: ch, start: i++ })
      continue
    }
    if (ch === ':') {
      tokens.push({ type: 'colon', text: ch, start: i++ })
      continue
    }

    if (ch === '"') {
      const start = i
      i++
      let text = ''
      for (;;) {
        if (i >= source.length) {
          throw new TokenizeError('Ein Anführungszeichen wurde nicht geschlossen.', start)
        }
        if (source[i] === '"') {
          // Doubled quote is an escaped quote.
          if (source[i + 1] === '"') {
            text += '"'
            i += 2
            continue
          }
          i++
          break
        }
        text += source[i]
        i++
      }
      tokens.push({ type: 'string', text, start })
      continue
    }

    // A reference must be tried before an identifier, so that `A1` does not tokenize
    // as the function name `A` followed by the number `1`.
    const rest = source.slice(i)
    const refMatch = REF_PATTERN.exec(rest)
    if (refMatch && !isFunctionCall(rest, refMatch[0].length)) {
      tokens.push({ type: 'ref', text: refMatch[0], start: i })
      i += refMatch[0].length
      continue
    }

    if (ch >= '0' && ch <= '9') {
      const numMatch = /^[0-9]+(?:[.,][0-9]+)?/.exec(rest)!
      tokens.push({ type: 'number', text: numMatch[0], start: i })
      i += numMatch[0].length
      continue
    }

    const identMatch = IDENT_PATTERN.exec(rest)
    if (identMatch) {
      tokens.push({ type: 'ident', text: identMatch[0], start: i })
      i += identMatch[0].length
      continue
    }

    const op = OPERATORS.find((candidate) => rest.startsWith(candidate))
    if (op) {
      tokens.push({ type: 'op', text: op, start: i })
      i += op.length
      continue
    }

    throw new TokenizeError(`Unerwartetes Zeichen „${ch}".`, i)
  }

  tokens.push({ type: 'eof', text: '', start: source.length })
  return tokens
}

/** `LOG10(` is a function name, not the reference `LOG10`. */
function isFunctionCall(rest: string, matchLength: number): boolean {
  return rest.slice(matchLength).trimStart().startsWith('(')
}

/** Parse a numeric literal, accepting either decimal separator. */
export function parseNumberLiteral(text: string): number {
  return Number(text.replace(',', '.'))
}
