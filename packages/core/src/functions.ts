/**
 * The nine functions the Quali actually requires — German names only.
 *
 * This whitelist is a feature, not a limitation: the exam is German-only, so `SUM` must be
 * rejected. An unknown name yields #NAME? with a message naming the German equivalent where
 * we can guess it, which is a teaching moment rather than a dead end.
 */

import {
  err,
  isBlank,
  isError,
  toNumber,
  toText,
  type CellError,
  type CellValue,
} from './values.js'

/** A scalar argument, or the flattened contents of a range. */
export type FunctionArg = CellValue | CellValue[]

export type BuiltinFunction = (args: FunctionArg[]) => CellValue

/**
 * Numbers Excel would aggregate.
 * Inside a range, text and booleans are ignored; a scalar argument is coerced.
 */
function collectNumbers(args: FunctionArg[]): number[] | CellError {
  const out: number[] = []
  for (const arg of args) {
    if (Array.isArray(arg)) {
      for (const value of arg) {
        if (isError(value)) return value
        if (typeof value === 'number') out.push(value)
      }
    } else {
      if (isError(arg)) return arg
      if (isBlank(arg)) continue
      const n = toNumber(arg)
      if (isError(n)) return n
      out.push(n)
    }
  }
  return out
}

function firstScalar(arg: FunctionArg): CellValue {
  return Array.isArray(arg) ? (arg[0] ?? null) : arg
}

/** Excel rounds half away from zero; JavaScript's Math.round rounds half up. */
export function roundHalfAwayFromZero(value: number, digits: number): number {
  const factor = 10 ** digits
  const scaled = value * factor
  // Nudge to absorb binary representation error (e.g. 1.005 * 100 = 100.49999…).
  const corrected = Number(scaled.toPrecision(15))
  const rounded = corrected < 0 ? -Math.round(-corrected) : Math.round(corrected)
  return rounded / factor
}

type Comparison = { op: string; operand: CellValue }

/** ZÄHLENWENN criteria: a bare value, or a comparison such as `">100"`. */
function parseCriterion(raw: CellValue): Comparison {
  if (typeof raw !== 'string') return { op: '=', operand: raw }
  const match = /^(<>|<=|>=|<|>|=)?\s*(.*)$/.exec(raw.trim())
  if (!match) return { op: '=', operand: raw }
  const op = match[1] ?? '='
  const rest = match[2] ?? ''
  const asNumber = Number(rest.replace(',', '.'))
  const operand: CellValue = rest !== '' && Number.isFinite(asNumber) ? asNumber : rest
  return { op, operand }
}

function matchesCriterion(value: CellValue, criterion: Comparison): boolean {
  const { op, operand } = criterion

  if (typeof operand === 'number') {
    if (typeof value !== 'number') return op === '<>'
    switch (op) {
      case '=': return value === operand
      case '<>': return value !== operand
      case '<': return value < operand
      case '<=': return value <= operand
      case '>': return value > operand
      case '>=': return value >= operand
    }
  }

  const left = toText(value).toUpperCase()
  const right = toText(operand).toUpperCase()
  switch (op) {
    case '=': return left === right
    case '<>': return left !== right
    case '<': return left < right
    case '<=': return left <= right
    case '>': return left > right
    case '>=': return left >= right
  }
  return false
}

export const FUNCTIONS: Readonly<Record<string, BuiltinFunction>> = {
  SUMME(args) {
    const numbers = collectNumbers(args)
    if (isError(numbers)) return numbers
    return numbers.reduce((sum, n) => sum + n, 0)
  },

  PRODUKT(args) {
    const numbers = collectNumbers(args)
    if (isError(numbers)) return numbers
    if (numbers.length === 0) return 0
    return numbers.reduce((product, n) => product * n, 1)
  },

  MITTELWERT(args) {
    const numbers = collectNumbers(args)
    if (isError(numbers)) return numbers
    if (numbers.length === 0) return err('#DIV/0!', 'MITTELWERT braucht mindestens eine Zahl.')
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
  },

  MAX(args) {
    const numbers = collectNumbers(args)
    if (isError(numbers)) return numbers
    return numbers.length === 0 ? 0 : Math.max(...numbers)
  },

  MIN(args) {
    const numbers = collectNumbers(args)
    if (isError(numbers)) return numbers
    return numbers.length === 0 ? 0 : Math.min(...numbers)
  },

  ANZAHL(args) {
    const numbers = collectNumbers(args)
    if (isError(numbers)) return numbers
    return numbers.length
  },

  WENN(args) {
    if (args.length < 2) {
      return err('#WERT!', 'WENN braucht mindestens eine Bedingung und einen Dann-Wert.')
    }
    const condition = firstScalar(args[0]!)
    if (isError(condition)) return condition
    const truthy =
      typeof condition === 'number'
        ? condition !== 0
        : typeof condition === 'boolean'
          ? condition
          : !isBlank(condition)
    if (truthy) return firstScalar(args[1]!)
    return args.length >= 3 ? firstScalar(args[2]!) : false
  },

  ZÄHLENWENN(args) {
    if (args.length < 2) {
      return err('#WERT!', 'ZÄHLENWENN braucht einen Bereich und ein Kriterium.')
    }
    const first = args[0]!
    const values = Array.isArray(first) ? first : [first]
    const criterion = parseCriterion(firstScalar(args[1]!))
    let count = 0
    for (const value of values) {
      if (isError(value)) return value
      if (isBlank(value)) continue
      if (matchesCriterion(value, criterion)) count++
    }
    return count
  },

  RUNDEN(args) {
    if (args.length < 2) {
      return err('#WERT!', 'RUNDEN braucht eine Zahl und die Anzahl der Nachkommastellen.')
    }
    const value = toNumber(firstScalar(args[0]!))
    if (isError(value)) return value
    const digits = toNumber(firstScalar(args[1]!))
    if (isError(digits)) return digits
    return roundHalfAwayFromZero(value, Math.trunc(digits))
  },
}

/** Function names students commonly reach for, mapped to the German name to nudge them to. */
const ENGLISH_HINTS: Readonly<Record<string, string>> = {
  SUM: 'SUMME',
  AVERAGE: 'MITTELWERT',
  COUNT: 'ANZAHL',
  IF: 'WENN',
  COUNTIF: 'ZÄHLENWENN',
  ROUND: 'RUNDEN',
  PRODUCT: 'PRODUKT',
}

export function unknownFunctionError(name: string): CellError {
  const hint = ENGLISH_HINTS[name.toUpperCase()]
  return err(
    '#NAME?',
    hint
      ? `„${name}" ist der englische Name. Verwende die deutsche Funktion ${hint}.`
      : `Die Funktion „${name}" gibt es nicht.`,
  )
}

export function isKnownFunction(name: string): boolean {
  return Object.hasOwn(FUNCTIONS, name.toUpperCase())
}
