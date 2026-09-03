import { colToLetters, parseA1 } from '@quali/core'

export interface Pos {
  readonly row: number
  readonly col: number
}

/** Anchor is where the selection started; focus is where it currently ends. */
export interface Selection {
  readonly anchor: Pos
  readonly focus: Pos
}

export interface Rect {
  readonly top: number
  readonly left: number
  readonly bottom: number
  readonly right: number
}

export function toPos(a1: string): Pos {
  const ref = parseA1(a1)
  if (!ref) throw new Error(`Ungültiger Zellbezug „${a1}".`)
  return { row: ref.row, col: ref.col }
}

export function toA1(pos: Pos): string {
  return `${colToLetters(pos.col)}${pos.row + 1}`
}

export function single(pos: Pos): Selection {
  return { anchor: pos, focus: pos }
}

export function rectOf(selection: Selection): Rect {
  return {
    top: Math.min(selection.anchor.row, selection.focus.row),
    bottom: Math.max(selection.anchor.row, selection.focus.row),
    left: Math.min(selection.anchor.col, selection.focus.col),
    right: Math.max(selection.anchor.col, selection.focus.col),
  }
}

export function rectContains(rect: Rect, pos: Pos): boolean {
  return pos.row >= rect.top && pos.row <= rect.bottom &&
    pos.col >= rect.left && pos.col <= rect.right
}

export function isSingle(rect: Rect): boolean {
  return rect.top === rect.bottom && rect.left === rect.right
}

export function cellsOf(rect: Rect): Pos[] {
  const out: Pos[] = []
  for (let row = rect.top; row <= rect.bottom; row++) {
    for (let col = rect.left; col <= rect.right; col++) out.push({ row, col })
  }
  return out
}

/** `C2` for one cell, `C2:C6` for a range — what the address box shows. */
export function rectLabel(rect: Rect): string {
  const start = toA1({ row: rect.top, col: rect.left })
  return isSingle(rect) ? start : `${start}:${toA1({ row: rect.bottom, col: rect.right })}`
}

/**
 * The strip a fill-handle drag adds to the source rectangle.
 *
 * Excel commits to one axis: whichever direction the pointer travelled further from the
 * source wins, so a slightly diagonal drag still fills cleanly down or across.
 */
export function fillExtension(source: Rect, pointer: Pos): Rect | null {
  const below = pointer.row - source.bottom
  const above = source.top - pointer.row
  const right = pointer.col - source.right
  const left = source.left - pointer.col

  const vertical = Math.max(below, above)
  const horizontal = Math.max(right, left)
  if (vertical <= 0 && horizontal <= 0) return null

  if (vertical >= horizontal) {
    return below > 0
      ? { ...source, top: source.bottom + 1, bottom: pointer.row }
      : { ...source, top: pointer.row, bottom: source.top - 1 }
  }
  return right > 0
    ? { ...source, left: source.right + 1, right: pointer.col }
    : { ...source, left: pointer.col, right: source.left - 1 }
}

/**
 * True when a cell reference may be inserted at the caret — Excel's "point mode".
 *
 * A formula accepts a reference right after `=`, an operator, an opening bracket or an
 * argument separator; anywhere else a click means "I am done here, select that cell".
 */
export function canPoint(draft: string, caret: number): boolean {
  if (!draft.trimStart().startsWith('=')) return false
  const before = draft.slice(0, caret).trimEnd()
  if (before === '' || before === '=') return true
  return /[=+\-*/^(;:<>&]$/.test(before)
}

/** Length of a reference token ending at the caret, so pointing again replaces it. */
export function refTokenLengthBefore(draft: string, caret: number): number {
  const match = /(\$?[A-Za-z]+\$?[0-9]+(?::\$?[A-Za-z]+\$?[0-9]+)?)$/.exec(draft.slice(0, caret))
  return match ? match[0].length : 0
}
