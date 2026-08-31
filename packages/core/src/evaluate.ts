/**
 * AST evaluator. Pure: everything it can see comes through EvalScope.
 */

import { FUNCTIONS, isKnownFunction, unknownFunctionError, type FunctionArg } from './functions.js'
import type { Node } from './parser.js'
import { isOutOfBounds, type CellRef } from './refs.js'
import { err, isError, toNumber, toText, type CellValue } from './values.js'

export interface EvalScope {
  getValue(ref: CellRef): CellValue
  getRange(start: CellRef, end: CellRef): CellValue[]
}

export function evaluateNode(node: Node, scope: EvalScope): CellValue {
  switch (node.type) {
    case 'number':
      return node.value
    case 'string':
      return node.value
    case 'boolean':
      return node.value

    case 'ref':
      return isOutOfBounds(node.ref) ? err('#BEZUG!') : scope.getValue(node.ref)

    case 'range':
      // A bare range in a scalar position collapses to its first cell, matching Excel's
      // behaviour closely enough for the exam corpus.
      return scope.getRange(node.start, node.end)[0] ?? null

    case 'unary': {
      const operand = toNumber(evaluateNode(node.operand, scope))
      if (isError(operand)) return operand
      return node.op === '-' ? -operand : operand
    }

    case 'binary':
      return evaluateBinary(node.op, node.left, node.right, scope)

    case 'call': {
      if (!isKnownFunction(node.name)) return unknownFunctionError(node.name)
      const fn = FUNCTIONS[node.name.toUpperCase()]!
      const args: FunctionArg[] = node.args.map((arg) =>
        arg.type === 'range' ? scope.getRange(arg.start, arg.end) : evaluateNode(arg, scope),
      )
      return fn(args)
    }
  }
}

function evaluateBinary(
  op: string,
  leftNode: Node,
  rightNode: Node,
  scope: EvalScope,
): CellValue {
  const left = evaluateNode(leftNode, scope)
  if (isError(left)) return left
  const right = evaluateNode(rightNode, scope)
  if (isError(right)) return right

  if (op === '&') return toText(left) + toText(right)

  if (op === '=' || op === '<>' || op === '<' || op === '<=' || op === '>' || op === '>=') {
    return compare(op, left, right)
  }

  const a = toNumber(left)
  if (isError(a)) return a
  const b = toNumber(right)
  if (isError(b)) return b

  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/':
      return b === 0 ? err('#DIV/0!') : a / b
    case '^': {
      const result = a ** b
      return Number.isFinite(result) ? result : err('#ZAHL!')
    }
  }
  return err('#WERT!')
}

function compare(op: string, left: CellValue, right: CellValue): boolean {
  let ordering: number

  if (typeof left === 'number' && typeof right === 'number') {
    ordering = left === right ? 0 : left < right ? -1 : 1
  } else if (typeof left === 'boolean' || typeof right === 'boolean') {
    const a = left === true ? 1 : left === false ? 0 : NaN
    const b = right === true ? 1 : right === false ? 0 : NaN
    ordering = a === b ? 0 : a < b ? -1 : 1
  } else if (left === null && right === null) {
    ordering = 0
  } else if (typeof left === 'number' && right === null) {
    ordering = left === 0 ? 0 : left < 0 ? -1 : 1
  } else if (left === null && typeof right === 'number') {
    ordering = right === 0 ? 0 : right > 0 ? -1 : 1
  } else {
    // Excel compares text case-insensitively.
    const a = toText(left).toUpperCase()
    const b = toText(right).toUpperCase()
    ordering = a === b ? 0 : a < b ? -1 : 1
  }

  switch (op) {
    case '=': return ordering === 0
    case '<>': return ordering !== 0
    case '<': return ordering < 0
    case '<=': return ordering <= 0
    case '>': return ordering > 0
    case '>=': return ordering >= 0
  }
  return false
}
