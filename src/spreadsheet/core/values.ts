/**
 * Cell values and the German error codes Excel shows students.
 *
 * Kept deliberately small: the exam corpus only ever produces these five errors.
 */

export type ErrorCode = '#DIV/0!' | '#WERT!' | '#NAME?' | '#BEZUG!' | '#ZAHL!'

export interface CellError {
  readonly kind: 'error'
  readonly code: ErrorCode
  /** German explanation shown to the student. */
  readonly message: string
}

/** `null` is an empty cell. Excel treats it as 0 in arithmetic but skips it in SUMME. */
export type CellValue = number | string | boolean | CellError | null

const MESSAGES: Record<ErrorCode, string> = {
  '#DIV/0!': 'Division durch null.',
  '#WERT!': 'Falscher Werttyp — hier wird eine Zahl erwartet.',
  '#NAME?': 'Unbekannter Funktionsname.',
  '#BEZUG!': 'Ungültiger Zellbezug.',
  '#ZAHL!': 'Ungültige Zahl.',
}

export function err(code: ErrorCode, message?: string): CellError {
  return { kind: 'error', code, message: message ?? MESSAGES[code] }
}

/** Accepts `unknown` so it can also narrow the `T | CellError` unions helpers return. */
export function isError(v: unknown): v is CellError {
  return typeof v === 'object' && v !== null && (v as CellError).kind === 'error'
}

export function isBlank(v: CellValue): boolean {
  return v === null || v === ''
}

/**
 * Coerce to a number the way Excel does in arithmetic contexts.
 * Empty cells are 0; booleans are 1/0; unparseable text is #WERT!.
 */
export function toNumber(v: CellValue): number | CellError {
  if (isError(v)) return v
  if (v === null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  const trimmed = v.trim()
  if (trimmed === '') return 0
  // Accept German decimal commas in text that looks numeric.
  const n = Number(trimmed.replace(',', '.'))
  return Number.isFinite(n) ? n : err('#WERT!')
}

export function toBoolean(v: CellValue): boolean | CellError {
  if (isError(v)) return v
  if (v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const t = v.trim().toUpperCase()
  if (t === 'WAHR' || t === 'TRUE') return true
  if (t === 'FALSCH' || t === 'FALSE') return false
  return err('#WERT!')
}

export function toText(v: CellValue): string {
  if (isError(v)) return v.code
  if (v === null) return ''
  if (typeof v === 'boolean') return v ? 'WAHR' : 'FALSCH'
  if (typeof v === 'number') return formatNumberDe(v)
  return v
}

/** German display formatting: comma as decimal separator. */
export function formatNumberDe(n: number): string {
  if (!Number.isFinite(n)) return '#ZAHL!'
  return String(n).replace('.', ',')
}
