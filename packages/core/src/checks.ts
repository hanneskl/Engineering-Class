/**
 * Check predicates.
 *
 * Every predicate is pure, independently testable, and returns a German message on failure —
 * the message is the teaching surface, so it should say what is wrong without handing over the
 * answer.
 */

import { isKnownFunction, unknownFunctionError } from './functions.ts'
import { canonical, formatNode, parseFormula, translateNode, walk, type Node } from './parser.ts'
import { expandRange, formatA1, parseA1, type RangeRef } from './refs.ts'
import { isFormulaInput, type Sheet } from './sheet.ts'
import { isError, toText, type CellValue } from './values.ts'

export interface CheckResult {
  readonly passed: boolean
  readonly message: string
}

export interface TaskContext {
  readonly sheet: Sheet
  /** A1 address of the cell under test. */
  readonly target: string
  /** The task's solution, as a formula. The expected value is derived from it, never stored. */
  readonly solution?: string
}

export type Check = (ctx: TaskContext) => CheckResult

const OK: CheckResult = { passed: true, message: '' }

function fail(message: string): CheckResult {
  return { passed: false, message }
}

const EPSILON = 1e-9

export function valuesEqual(a: CellValue, b: CellValue): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    if (a === b) return true
    return Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(a), Math.abs(b))
  }
  if (isError(a) || isError(b)) {
    return isError(a) && isError(b) && a.code === b.code
  }
  if (typeof a === 'string' || typeof b === 'string') {
    return toText(a).trim().toUpperCase() === toText(b).trim().toUpperCase()
  }
  return a === b
}

function astOf(sheet: Sheet, a1: string): Node | null {
  const ast = sheet.getAst(a1)
  return ast !== null && !(ast instanceof Error) ? ast : null
}

/* -------------------------------------------------------------------------- */
/* Formula-tier checks — the anti-cheat core                                   */
/* -------------------------------------------------------------------------- */

/**
 * The cell must contain a formula. This is the rule every exam states outright:
 * „Alle Berechnungen sind mit Formeln durchzuführen!"
 */
export function isFormula(): Check {
  return ({ sheet, target }) => {
    const input = sheet.getInput(target)
    if (input.trim() === '') {
      return fail(`${target} ist noch leer.`)
    }
    if (!isFormulaInput(input)) {
      return fail(
        `Du hast „${input.trim()}" eingetippt. Das Ergebnis muss mit einer Formel berechnet ` +
          `werden — beginne die Eingabe mit „=".`,
      )
    }
    const ast = sheet.getAst(target)
    if (ast instanceof Error) {
      return fail(`Die Formel in ${target} ist fehlerhaft: ${ast.message}`)
    }
    return OK
  }
}

/** The formula must call at least one of these functions. */
export function usesFunction(...names: string[]): Check {
  const wanted = names.map((name) => name.toUpperCase())
  return ({ sheet, target }) => {
    const ast = astOf(sheet, target)
    if (!ast) return fail(`In ${target} steht keine gültige Formel.`)

    let found = false
    let unknown: string | null = null
    walk(ast, (node) => {
      if (node.type !== 'call') return
      if (wanted.includes(node.name)) found = true
      else if (!isKnownFunction(node.name)) unknown ??= node.name
    })
    if (found) return OK

    // A misremembered name deserves the specific hint — most often the English one.
    if (unknown) return fail(unknownFunctionError(unknown).message)

    const list = wanted.join(' oder ')
    return fail(`Verwende in ${target} die Funktion ${list}.`)
  }
}

/** The formula must use this operator, e.g. `*` for „Produkt rote Felder". */
export function usesOperator(op: string): Check {
  return ({ sheet, target }) => {
    const ast = astOf(sheet, target)
    if (!ast) return fail(`In ${target} steht keine gültige Formel.`)

    let found = false
    walk(ast, (node) => {
      if (node.type === 'binary' && node.op === op) found = true
    })
    return found ? OK : fail(`Verwende in ${target} den Rechenoperator „${op}".`)
  }
}

/**
 * The formula must pin a reference with `$`. When `a1` is given, that specific cell must be
 * fully absolute — this is skill C5, „Absoluter Bezug auf $B$8 ist Pflicht".
 */
export function hasAbsoluteRef(a1?: string): Check {
  const wanted = a1 ? parseA1(a1) : null
  return ({ sheet, target }) => {
    const ast = astOf(sheet, target)
    if (!ast) return fail(`In ${target} steht keine gültige Formel.`)

    let found = false
    walk(ast, (node) => {
      if (node.type !== 'ref') return
      const { ref } = node
      if (wanted) {
        if (ref.col === wanted.col && ref.row === wanted.row && ref.colAbs && ref.rowAbs) {
          found = true
        }
      } else if (ref.colAbs || ref.rowAbs) {
        found = true
      }
    })
    if (found) return OK

    return fail(
      wanted
        ? `Der Bezug auf ${a1} muss absolut sein: schreibe $${a1!.replace(/(\D+)(\d+)/, '$1$$$2')}.`
        : `In ${target} fehlt ein absoluter Bezug mit „$".`,
    )
  }
}

/** The formula must NOT use any of these functions — for tasks that forbid a shortcut. */
export function avoidsFunction(...names: string[]): Check {
  const banned = names.map((name) => name.toUpperCase())
  return ({ sheet, target }) => {
    const ast = astOf(sheet, target)
    if (!ast) return OK
    let found: string | null = null
    walk(ast, (node) => {
      if (node.type === 'call' && banned.includes(node.name)) found = node.name
    })
    return found ? fail(`Löse ${target} ohne die Funktion ${found}.`) : OK
  }
}

/* -------------------------------------------------------------------------- */
/* Value-tier checks                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The cell's value must equal the solution formula's value, evaluated against the same data.
 * Nothing is hardcoded, so randomised sample data works without maintaining an answer key.
 */
export function matchesSolution(): Check {
  return ({ sheet, target, solution }) => {
    if (!solution) throw new Error('matchesSolution braucht eine solution im TaskContext.')

    const expected = sheet.evaluateFormula(solution)
    const actual = sheet.getValue(target)

    if (isError(actual)) {
      return fail(`${target} liefert einen Fehler: ${actual.code} — ${actual.message}`)
    }
    if (valuesEqual(actual, expected)) return OK

    return fail(`Das Ergebnis in ${target} stimmt noch nicht (${toText(actual)}).`)
  }
}

/** The cell's value must equal a fixed expected value. */
export function valueEquals(expected: CellValue): Check {
  return ({ sheet, target }) => {
    const actual = sheet.getValue(target)
    return valuesEqual(actual, expected)
      ? OK
      : fail(`In ${target} wird „${toText(expected)}" erwartet, dort steht „${toText(actual)}".`)
  }
}

/* -------------------------------------------------------------------------- */
/* Fill-down                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every cell in the range must carry the correctly translated formula.
 *
 * This is the check that catches a student who solved the first cell properly and then typed
 * the remaining results by hand — the most common way to fake a fill-down task.
 *
 * `anchorSolution` is the solution for the range's top-left cell; it is translated for each
 * subsequent cell, honouring `$` pins.
 */
export function filledDown(range: string, anchorSolution: string): Check {
  return ({ sheet }) => {
    const parsed = parseRangeText(range)
    if (!parsed) throw new Error(`Ungültiger Bereich „${range}".`)

    const anchorAst = parseFormula(anchorSolution)
    const cells = expandRange(parsed)
    const origin = cells[0]!

    for (const ref of cells) {
      const a1 = formatA1(ref)
      const input = sheet.getInput(a1)

      if (!isFormulaInput(input)) {
        return fail(
          input.trim() === ''
            ? `${a1} ist noch leer — ziehe die Formel bis zum Ende des Bereichs herunter.`
            : `In ${a1} steht „${input.trim()}" statt einer Formel. Ziehe die Formel aus ` +
              `${formatA1(origin)} herunter, statt die Ergebnisse einzutippen.`,
        )
      }

      const expected = formatNode(
        translateNode(anchorAst, ref.row - origin.row, ref.col - origin.col),
      )
      if (canonical(input) !== expected) {
        // A wrong formula in the anchor cell is a different mistake from a bad drag:
        // the student has not got the formula right yet, so say that instead.
        return fail(
          ref.row === origin.row && ref.col === origin.col
            ? `Die Formel in ${a1} stimmt noch nicht. Überlege, welche Bezüge beim ` +
              `Herunterziehen mitwandern sollen und welche mit „$" festgehalten werden müssen.`
            : `Die Formel in ${a1} passt nicht zu der in ${formatA1(origin)}. ` +
              `Ziehe die Formel herunter, damit die Bezüge richtig mitwandern.`,
        )
      }
    }

    return OK
  }
}

/* -------------------------------------------------------------------------- */
/* Structure-tier checks                                                       */
/* -------------------------------------------------------------------------- */

export function sheetNamed(expected: string): Check {
  return ({ sheet }) =>
    sheet.name === expected
      ? OK
      : fail(`Das Tabellenblatt heißt „${sheet.name}" statt „${expected}".`)
}

export function isMerged(range: string): Check {
  return ({ sheet }) => {
    const parsed = parseRangeText(range)
    if (!parsed) throw new Error(`Ungültiger Bereich „${range}".`)
    return sheet.isMerged(parsed) ? OK : fail(`Die Zellen ${range} sind noch nicht verbunden.`)
  }
}

/* -------------------------------------------------------------------------- */

export function parseRangeText(text: string): RangeRef | null {
  const [startText, endText] = text.split(':')
  if (!startText) return null
  const start = parseA1(startText.trim())
  if (!start) return null
  if (!endText) return { start, end: start }
  const end = parseA1(endText.trim())
  return end ? { start, end } : null
}

export interface TaskOutcome {
  readonly passed: boolean
  /** Messages from the checks that failed, in declaration order. */
  readonly messages: string[]
}

/** Run checks in order and stop at the first failure — one clear message beats five. */
export function runChecks(checks: readonly Check[], ctx: TaskContext): TaskOutcome {
  for (const check of checks) {
    const result = check(ctx)
    if (!result.passed) return { passed: false, messages: [result.message] }
  }
  return { passed: true, messages: [] }
}
