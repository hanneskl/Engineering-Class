import {
  canPoint,
  rectLabel,
  rectOf,
  refTokenLengthBefore,
  type Pos,
  type Rect,
} from './selection.ts'

/**
 * An in-progress edit. Shared by the cell editor and the formula bar so both can point.
 *
 * `point` is Excel's point mode: once a reference has been inserted, the draft no longer *ends*
 * in an operator, so `canPoint` alone can no longer tell us we are still placing a reference.
 * Holding the mode explicitly is what lets a second arrow press move the reference instead of
 * appending a new one.
 */
export interface EditState {
  readonly a1: string
  readonly draft: string
  readonly caret: number
  readonly from: 'cell' | 'bar'
  readonly point: { readonly anchor: Pos; readonly cursor: Pos } | null
}

export interface GridBounds {
  readonly rows: number
  readonly columns: number
}

const DELTAS: Record<string, Pos> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
}

/**
 * Insert a reference at the caret, replacing one that pointing already put there.
 *
 * Replacing is what makes both dragging and arrowing feel right: every move rewrites the same
 * token instead of appending `B2B3B4`.
 */
export function insertReference(edit: EditState, label: string, replace: boolean): EditState {
  const drop = replace ? refTokenLengthBefore(edit.draft, edit.caret) : 0
  const head = edit.draft.slice(0, edit.caret - drop)
  const tail = edit.draft.slice(edit.caret)
  return { ...edit, draft: head + label + tail, caret: head.length + label.length }
}

/** Move the pointed reference to a rectangle, rewriting the token in the draft. */
export function pointAt(edit: EditState, anchor: Pos, cursor: Pos): EditState {
  const label = rectLabel(rectOf({ anchor, focus: cursor }))
  return { ...insertReference(edit, label, true), point: { anchor, cursor } }
}

function clamp(pos: Pos, bounds: GridBounds): Pos {
  return {
    row: Math.min(Math.max(pos.row, 0), bounds.rows - 1),
    col: Math.min(Math.max(pos.col, 0), bounds.columns - 1),
  }
}

/**
 * Arrow keys while writing a formula: start pointing at a neighbour, then move that reference.
 * Shift extends it into a range. Returns null when the key is not ours to handle, so the
 * caret keeps its normal behaviour inside ordinary text.
 */
export function handlePointKey(
  edit: EditState,
  key: string,
  shift: boolean,
  origin: Pos,
  bounds: GridBounds,
): EditState | null {
  const delta = DELTAS[key]
  if (!delta) return null
  if (edit.point === null && !canPoint(edit.draft, edit.caret)) return null

  if (edit.point === null) {
    // First arrow press steps away from the cell being edited.
    const cursor = clamp({ row: origin.row + delta.row, col: origin.col + delta.col }, bounds)
    return pointAt(edit, cursor, cursor)
  }

  const cursor = clamp(
    { row: edit.point.cursor.row + delta.row, col: edit.point.cursor.col + delta.col },
    bounds,
  )
  // Shift keeps the anchor so the reference grows into a range; a bare arrow moves both.
  return pointAt(edit, shift ? edit.point.anchor : cursor, cursor)
}

/** Leaving point mode: the reference stays in the text, but arrows go back to the caret. */
export function stopPointing(edit: EditState): EditState {
  return edit.point === null ? edit : { ...edit, point: null }
}

export function pointedRect(edit: EditState | null): Rect | null {
  if (!edit?.point) return null
  return rectOf({ anchor: edit.point.anchor, focus: edit.point.cursor })
}
