import { refTokenLengthBefore } from './selection.ts'

/** An in-progress edit. Shared by the cell editor and the formula bar so both can point. */
export interface EditState {
  readonly a1: string
  readonly draft: string
  readonly caret: number
  readonly from: 'cell' | 'bar'
}

/**
 * Insert a reference at the caret, replacing one that pointing already put there.
 *
 * Replacing is what makes dragging out a range feel right: every pointer move rewrites the
 * same token instead of appending `B2B3B4`.
 */
export function insertReference(edit: EditState, label: string, replace: boolean): EditState {
  const drop = replace ? refTokenLengthBefore(edit.draft, edit.caret) : 0
  const head = edit.draft.slice(0, edit.caret - drop)
  const tail = edit.draft.slice(edit.caret)
  return { ...edit, draft: head + label + tail, caret: head.length + label.length }
}
