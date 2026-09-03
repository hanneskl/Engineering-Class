/**
 * A1-style cell references, and the reference translation that fill-down depends on.
 *
 * Absolute markers (`$`) are carried on the reference itself, because check `C5`
 * ("hasAbsoluteRef") and the fill-down translation both need to know which parts are pinned.
 */

export interface CellRef {
  /** 0-based column index. A = 0. */
  readonly col: number
  /** 0-based row index. Row 1 = 0. */
  readonly row: number
  readonly colAbs: boolean
  readonly rowAbs: boolean
}

export interface RangeRef {
  readonly start: CellRef
  readonly end: CellRef
}

const A1_PATTERN = /^(\$?)([A-Z]+)(\$?)([0-9]+)$/

export function lettersToCol(letters: string): number {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export function colToLetters(col: number): string {
  let n = col + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

export function parseA1(text: string): CellRef | null {
  const m = A1_PATTERN.exec(text.toUpperCase())
  if (!m) return null
  const [, colDollar, letters, rowDollar, digits] = m
  const row = Number(digits) - 1
  if (row < 0) return null
  return {
    col: lettersToCol(letters!),
    row,
    colAbs: colDollar === '$',
    rowAbs: rowDollar === '$',
  }
}

export function formatA1(ref: CellRef): string {
  return `${ref.colAbs ? '$' : ''}${colToLetters(ref.col)}${ref.rowAbs ? '$' : ''}${ref.row + 1}`
}

/** Canonical key for the cell map — absolute markers do not change identity. */
export function refKey(ref: CellRef): string {
  return `${colToLetters(ref.col)}${ref.row + 1}`
}

/**
 * Move a reference by (dRow, dCol). Pinned parts stay put — this is exactly what makes
 * `=B3*$G$2` filled down become `=B4*$G$2`.
 */
export function translate(ref: CellRef, dRow: number, dCol: number): CellRef {
  return {
    col: ref.colAbs ? ref.col : ref.col + dCol,
    row: ref.rowAbs ? ref.row : ref.row + dRow,
    colAbs: ref.colAbs,
    rowAbs: ref.rowAbs,
  }
}

export function isOutOfBounds(ref: CellRef): boolean {
  return ref.col < 0 || ref.row < 0
}

/** Every cell in a range, row-major. Handles ranges given in any corner order. */
export function expandRange(range: RangeRef): CellRef[] {
  const top = Math.min(range.start.row, range.end.row)
  const bottom = Math.max(range.start.row, range.end.row)
  const left = Math.min(range.start.col, range.end.col)
  const right = Math.max(range.start.col, range.end.col)
  const out: CellRef[] = []
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      out.push({ col, row, colAbs: false, rowAbs: false })
    }
  }
  return out
}
