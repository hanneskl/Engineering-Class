/**
 * Pratt parser producing the formula AST.
 *
 * The AST is public API: the checker inspects it to answer questions like
 * "did the student use SUMME?" and "is the reference to G2 absolute?" without
 * resorting to string matching on the raw input.
 */

import { formatA1, parseA1, translate, type CellRef } from './refs.js'
import { parseNumberLiteral, tokenize, type Token } from './tokenizer.js'

export type Node =
  | { readonly type: 'number'; readonly value: number }
  | { readonly type: 'string'; readonly value: string }
  | { readonly type: 'boolean'; readonly value: boolean }
  | { readonly type: 'ref'; readonly ref: CellRef }
  | { readonly type: 'range'; readonly start: CellRef; readonly end: CellRef }
  | { readonly type: 'unary'; readonly op: '-' | '+'; readonly operand: Node }
  | { readonly type: 'binary'; readonly op: BinaryOp; readonly left: Node; readonly right: Node }
  | { readonly type: 'call'; readonly name: string; readonly args: readonly Node[] }

export type BinaryOp =
  | '+' | '-' | '*' | '/' | '^' | '&'
  | '=' | '<>' | '<' | '<=' | '>' | '>='

export class ParseError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message)
    this.name = 'ParseError'
  }
}

const PRECEDENCE: Record<BinaryOp, number> = {
  '=': 1, '<>': 1, '<': 1, '<=': 1, '>': 1, '>=': 1,
  '&': 2,
  '+': 3, '-': 3,
  '*': 4, '/': 4,
  '^': 5,
}

const UNARY_PRECEDENCE = 6

/**
 * Parse a formula. Accepts input with or without the leading `=`.
 * Throws ParseError with a German message on malformed input.
 */
export function parseFormula(input: string): Node {
  const source = input.startsWith('=') ? input.slice(1) : input
  const parser = new Parser(tokenize(source))
  const node = parser.parseExpression(0)
  parser.expectEof()
  return node
}

class Parser {
  private index = 0

  constructor(private readonly tokens: readonly Token[]) {}

  private peek(): Token {
    return this.tokens[this.index]!
  }

  private next(): Token {
    return this.tokens[this.index++]!
  }

  expectEof(): void {
    const token = this.peek()
    if (token.type !== 'eof') {
      throw new ParseError(`Unerwartetes „${token.text}" am Ende der Formel.`, token.start)
    }
  }

  parseExpression(minPrecedence: number): Node {
    let left = this.parseUnary()

    for (;;) {
      const token = this.peek()
      if (token.type !== 'op') break
      const op = token.text as BinaryOp
      const precedence = PRECEDENCE[op]
      if (precedence === undefined || precedence < minPrecedence) break
      this.next()
      // `^` is right-associative; everything else is left-associative.
      const nextMin = op === '^' ? precedence : precedence + 1
      const right = this.parseExpression(nextMin)
      left = { type: 'binary', op, left, right }
    }

    return left
  }

  private parseUnary(): Node {
    const token = this.peek()
    if (token.type === 'op' && (token.text === '-' || token.text === '+')) {
      this.next()
      const operand = this.parseExpression(UNARY_PRECEDENCE)
      return { type: 'unary', op: token.text, operand }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): Node {
    const token = this.next()

    switch (token.type) {
      case 'number':
        return { type: 'number', value: parseNumberLiteral(token.text) }

      case 'string':
        return { type: 'string', value: token.text }

      case 'lparen': {
        const inner = this.parseExpression(0)
        const close = this.next()
        if (close.type !== 'rparen') {
          throw new ParseError('Es fehlt eine schließende Klammer.', close.start)
        }
        return inner
      }

      case 'ref': {
        const start = parseA1(token.text)
        if (!start) throw new ParseError(`Ungültiger Zellbezug „${token.text}".`, token.start)
        if (this.peek().type === 'colon') {
          this.next()
          const endToken = this.next()
          if (endToken.type !== 'ref') {
            throw new ParseError('Nach dem Doppelpunkt fehlt ein Zellbezug.', endToken.start)
          }
          const end = parseA1(endToken.text)
          if (!end) {
            throw new ParseError(`Ungültiger Zellbezug „${endToken.text}".`, endToken.start)
          }
          return { type: 'range', start, end }
        }
        return { type: 'ref', ref: start }
      }

      case 'ident': {
        const upper = token.text.toUpperCase()
        if (upper === 'WAHR' || upper === 'FALSCH') {
          return { type: 'boolean', value: upper === 'WAHR' }
        }
        if (this.peek().type !== 'lparen') {
          throw new ParseError(
            `„${token.text}" ist kein gültiger Zellbezug und keine Funktion.`,
            token.start,
          )
        }
        this.next() // consume '('
        const args: Node[] = []
        if (this.peek().type !== 'rparen') {
          for (;;) {
            args.push(this.parseExpression(0))
            if (this.peek().type === 'sep') {
              this.next()
              continue
            }
            break
          }
        }
        const close = this.next()
        if (close.type !== 'rparen') {
          throw new ParseError(
            `Es fehlt eine schließende Klammer bei „${token.text}".`,
            close.start,
          )
        }
        return { type: 'call', name: upper, args }
      }

      default:
        throw new ParseError(
          token.type === 'eof'
            ? 'Die Formel ist unvollständig.'
            : `Unerwartetes „${token.text}".`,
          token.start,
        )
    }
  }
}

/** Walk every node in the tree, parents before children. */
export function walk(node: Node, visit: (node: Node) => void): void {
  visit(node)
  switch (node.type) {
    case 'unary':
      walk(node.operand, visit)
      break
    case 'binary':
      walk(node.left, visit)
      walk(node.right, visit)
      break
    case 'call':
      for (const arg of node.args) walk(arg, visit)
      break
    default:
      break
  }
}

/**
 * Serialise an AST back to a canonical formula string (no leading `=`).
 *
 * Canonical means whitespace and redundant parentheses are gone, so two formulas that differ
 * only cosmetically compare equal. This is what lets the fill-down check compare a student's
 * formula against the translated solution without string-matching their exact typing.
 */
export function formatNode(node: Node): string {
  switch (node.type) {
    case 'number':
      return String(node.value)
    case 'string':
      return `"${node.value.replace(/"/g, '""')}"`
    case 'boolean':
      return node.value ? 'WAHR' : 'FALSCH'
    case 'ref':
      return formatA1(node.ref)
    case 'range':
      return `${formatA1(node.start)}:${formatA1(node.end)}`
    case 'unary':
      return `${node.op}${wrap(node.operand, UNARY_PRECEDENCE)}`
    case 'binary': {
      const precedence = PRECEDENCE[node.op]
      return `${wrap(node.left, precedence)}${node.op}${wrap(node.right, precedence + 1)}`
    }
    case 'call':
      return `${node.name}(${node.args.map(formatNode).join(';')})`
  }
}

function wrap(node: Node, minPrecedence: number): string {
  const text = formatNode(node)
  const precedence =
    node.type === 'binary' ? PRECEDENCE[node.op] : node.type === 'unary' ? UNARY_PRECEDENCE : 99
  return precedence < minPrecedence ? `(${text})` : text
}

/**
 * Offset every relative reference in a tree — the operation fill-down performs.
 * Pinned (`$`) parts stay where they are.
 */
export function translateNode(node: Node, dRow: number, dCol: number): Node {
  switch (node.type) {
    case 'ref':
      return { type: 'ref', ref: translate(node.ref, dRow, dCol) }
    case 'range':
      return {
        type: 'range',
        start: translate(node.start, dRow, dCol),
        end: translate(node.end, dRow, dCol),
      }
    case 'unary':
      return { type: 'unary', op: node.op, operand: translateNode(node.operand, dRow, dCol) }
    case 'binary':
      return {
        type: 'binary',
        op: node.op,
        left: translateNode(node.left, dRow, dCol),
        right: translateNode(node.right, dRow, dCol),
      }
    case 'call':
      return {
        type: 'call',
        name: node.name,
        args: node.args.map((arg) => translateNode(arg, dRow, dCol)),
      }
    default:
      return node
  }
}

/** Canonical form of a formula string, for comparison. Returns null if it does not parse. */
export function canonical(input: string): string | null {
  try {
    return formatNode(parseFormula(input))
  } catch {
    return null
  }
}

/**
 * Translate a cell's raw input by an offset — the operation behind fill-down, drag-to-fill
 * and paste.
 *
 * Literals come back unchanged (Excel copies a dragged number rather than extrapolating it),
 * and so does anything that fails to parse: a broken formula should be copied verbatim, not
 * silently mangled.
 */
export function translateInput(input: string, dRow: number, dCol: number): string {
  if (!input.trimStart().startsWith('=')) return input
  try {
    return `=${formatNode(translateNode(parseFormula(input), dRow, dCol))}`
  } catch {
    return input
  }
}
