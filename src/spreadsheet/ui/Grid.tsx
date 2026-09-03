import { colToLetters, formatValue, type Sheet } from '@quali/core'
import { useEffect, useRef, useState } from 'react'
import {
  handlePointKey,
  pointAt,
  pointedRect,
  stopPointing,
  type EditState,
} from './editing.ts'
import {
  canPoint,
  cellsOf,
  fillExtension,
  rectContains,
  rectOf,
  single,
  toA1,
  toPos,
  type Pos,
  type Rect,
  type Selection,
} from './selection.ts'

interface GridProps {
  sheet: Sheet
  columns: number
  rows: number
  selection: Selection
  onSelectionChange: (selection: Selection) => void
  edit: EditState | null
  onEditChange: (edit: EditState | null) => void
  onCommit: (a1: string, input: string) => void
  onClear: (rect: Rect) => void
  onFill: (source: Rect, extension: Rect) => void
  onCopy: (rect: Rect) => string
  onPaste: (target: Pos, external: string | null) => void
  /** Source of the last copy, drawn with a dashed outline. */
  copiedRect: Rect | null
  revision: number
}

type Drag =
  | { kind: 'none' }
  | { kind: 'select' }
  | { kind: 'point'; anchor: Pos }
  | { kind: 'fill'; source: Rect }

export function Grid(props: GridProps) {
  const { sheet, columns, rows, selection, onSelectionChange, edit, onEditChange } = props
  const [drag, setDrag] = useState<Drag>({ kind: 'none' })
  const [fillPreview, setFillPreview] = useState<Rect | null>(null)
  const editorRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const rect = rectOf(selection)

  useEffect(() => {
    if (edit?.from === 'cell') editorRef.current?.focus()
  }, [edit?.from, edit?.a1])

  // Keep the caret where pointing put it, so the next reference lands in the right place.
  useEffect(() => {
    if (edit?.from === 'cell' && editorRef.current) {
      editorRef.current.setSelectionRange(edit.caret, edit.caret)
    }
  }, [edit?.caret, edit?.draft, edit?.from])

  useEffect(() => {
    if (drag.kind === 'none') return
    function end(): void {
      if (drag.kind === 'fill' && fillPreview) props.onFill(drag.source, fillPreview)
      setDrag({ kind: 'none' })
      setFillPreview(null)
    }
    window.addEventListener('mouseup', end)
    return () => window.removeEventListener('mouseup', end)
  }, [drag, fillPreview, props])

  function beginEdit(a1: string, initial?: string): void {
    const draft = initial ?? sheet.getInput(a1)
    onEditChange({ a1, draft, caret: draft.length, from: 'cell', point: null })
  }

  function commitEdit(): void {
    if (edit) props.onCommit(edit.a1, edit.draft)
    onEditChange(null)
    gridRef.current?.focus()
  }

  function pointing(): boolean {
    return edit !== null && (edit.point !== null || canPoint(edit.draft, edit.caret))
  }

  function onCellMouseDown(event: React.MouseEvent, pos: Pos): void {
    if (edit && pointing()) {
      // Keep focus in the editor: a blur here would commit the half-written formula.
      event.preventDefault()
      onEditChange(pointAt(edit, pos, pos))
      setDrag({ kind: 'point', anchor: pos })
      return
    }
    if (edit) commitEdit()

    if (event.shiftKey) {
      onSelectionChange({ anchor: selection.anchor, focus: pos })
    } else {
      onSelectionChange(single(pos))
    }
    setDrag({ kind: 'select' })
    gridRef.current?.focus()
  }

  function onCellMouseEnter(pos: Pos): void {
    switch (drag.kind) {
      case 'select':
        onSelectionChange({ anchor: selection.anchor, focus: pos })
        return
      case 'point':
        if (edit) onEditChange(pointAt(edit, drag.anchor, pos))
        return
      case 'fill':
        setFillPreview(fillExtension(drag.source, pos))
        return
      default:
    }
  }

  function move(dRow: number, dCol: number, extend: boolean): void {
    const from = extend ? selection.focus : selection.anchor
    const row = Math.min(Math.max(from.row + dRow, 0), rows - 1)
    const col = Math.min(Math.max(from.col + dCol, 0), columns - 1)
    const pos = { row, col }
    onSelectionChange(extend ? { anchor: selection.anchor, focus: pos } : single(pos))
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (edit) return
    const shift = event.shiftKey
    switch (event.key) {
      case 'ArrowUp': event.preventDefault(); move(-1, 0, shift); return
      case 'ArrowDown': event.preventDefault(); move(1, 0, shift); return
      case 'ArrowLeft': event.preventDefault(); move(0, -1, shift); return
      case 'ArrowRight': event.preventDefault(); move(0, 1, shift); return
      case 'Enter': event.preventDefault(); move(1, 0, false); return
      case 'Tab': event.preventDefault(); move(0, shift ? -1 : 1, false); return
      case 'F2': event.preventDefault(); beginEdit(toA1(selection.anchor)); return
      case 'Delete': case 'Backspace': event.preventDefault(); props.onClear(rect); return
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      beginEdit(toA1(selection.anchor), event.key)
    }
  }

  return (
    <div
      className={drag.kind === 'none' ? 'grid' : 'grid dragging'}
      ref={gridRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onCopy={(event) => {
        if (edit) return
        event.preventDefault()
        event.clipboardData.setData('text/plain', props.onCopy(rect))
      }}
      onPaste={(event) => {
        if (edit) return
        event.preventDefault()
        props.onPaste({ row: rect.top, col: rect.left }, event.clipboardData.getData('text/plain'))
      }}
      data-revision={revisionOf(props)}
    >
      <table>
        <thead>
          <tr>
            <th className="corner" />
            {Array.from({ length: columns }, (_, col) => (
              <th key={col} className={col >= rect.left && col <= rect.right ? 'head lit' : 'head'}>
                {colToLetters(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => {
            const row = rowIndex
            return (
              <tr key={row}>
                <th className={row >= rect.top && row <= rect.bottom ? 'row-head lit' : 'row-head'}>
                  {row + 1}
                </th>
                {Array.from({ length: columns }, (_, col) => {
                  const pos = { row, col }
                  const a1 = toA1(pos)

                  // A merged block renders as one cell: the top-left spans it, the rest vanish.
                  const merge = sheet.merges.find(
                    (m) =>
                      row >= Math.min(m.start.row, m.end.row) &&
                      row <= Math.max(m.start.row, m.end.row) &&
                      col >= Math.min(m.start.col, m.end.col) &&
                      col <= Math.max(m.start.col, m.end.col),
                  )
                  if (merge && !(row === merge.start.row && col === merge.start.col)) return null
                  const colSpan = merge ? Math.abs(merge.end.col - merge.start.col) + 1 : undefined
                  const rowSpan = merge ? Math.abs(merge.end.row - merge.start.row) + 1 : undefined

                  // effectiveStyle applies conditional formatting on top of the student's own.
                  const style = sheet.effectiveStyle(a1)
                  const formatted = formatValue(sheet.getValue(a1), style.numberFormat)
                  const isAnchor = row === selection.anchor.row && col === selection.anchor.col
                  const inRange = rectContains(rect, pos)
                  const isEditing = edit?.from === 'cell' && edit.a1 === a1
                  const isHandle = row === rect.bottom && col === rect.right

                  const classes = ['cell']
                  if (inRange) classes.push('in-range')
                  if (isAnchor) classes.push('anchor')
                  if (fillPreview && rectContains(fillPreview, pos)) classes.push('fill-preview')
                  if (props.copiedRect && rectContains(props.copiedRect, pos)) classes.push('copied')
                  const pointRect = pointedRect(edit)
                  if (pointRect && rectContains(pointRect, pos)) classes.push('pointing')

                  return (
                    <td
                      key={a1}
                      className={classes.join(' ')}
                      colSpan={colSpan}
                      rowSpan={rowSpan}
                      style={{
                        background: style.fill ?? undefined,
                        fontWeight: style.bold ? 700 : undefined,
                        fontStyle: style.italic ? 'italic' : undefined,
                        textDecoration: style.underline ? 'underline' : undefined,
                        // Named font first, then a sans-serif stack — Calibri and Aptos are
                        // not installed on Linux and would otherwise fall back to a serif.
                        fontFamily: `${style.fontFamily}, Arial, Helvetica, sans-serif`,
                        fontSize: style.fontSize,
                        color: formatted.negativeRed ? '#c00' : style.color,
                        whiteSpace: style.wrap ? 'normal' : 'nowrap',
                        verticalAlign: style.vAlign ?? undefined,
                        borderTopWidth: borderPx(style.borders.top),
                        borderBottomWidth: borderPx(style.borders.bottom),
                        borderLeftWidth: borderPx(style.borders.left),
                        borderRightWidth: borderPx(style.borders.right),
                        borderTopColor: borderColour(style.borders.top),
                        borderBottomColor: borderColour(style.borders.bottom),
                        borderLeftColor: borderColour(style.borders.left),
                        borderRightColor: borderColour(style.borders.right),
                        textAlign:
                          style.hAlign ??
                          (typeof sheet.getValue(a1) === 'number' ? 'right' : 'left'),
                      }}
                      onMouseDown={(event) => onCellMouseDown(event, pos)}
                      onMouseEnter={() => onCellMouseEnter(pos)}
                      onDoubleClick={() => beginEdit(a1)}
                    >
                      {isEditing ? (
                        <input
                          ref={editorRef}
                          className="editor"
                          value={edit.draft}
                          onChange={(event) =>
                            onEditChange(
                              stopPointing({
                                ...edit,
                                draft: event.target.value,
                                caret: event.target.selectionStart ?? event.target.value.length,
                              }),
                            )
                          }
                          onSelect={(event) =>
                            onEditChange({
                              ...edit,
                              caret: event.currentTarget.selectionStart ?? edit.caret,
                            })
                          }
                          onBlur={commitEdit}
                          onKeyDown={(event) => {
                            const pointed = handlePointKey(
                              edit,
                              event.key,
                              event.shiftKey,
                              toPos(edit.a1),
                              { rows, columns },
                            )
                            if (pointed) {
                              event.preventDefault()
                              onEditChange(pointed)
                              return
                            }
                            if (event.key === 'Enter') { event.preventDefault(); commitEdit() }
                            if (event.key === 'Escape') { onEditChange(null); gridRef.current?.focus() }
                          }}
                        />
                      ) : (
                        formatted.text
                      )}
                      {isHandle && !edit && <span className="fill-handle"
                        onMouseDown={(event) => {
                          event.stopPropagation()
                          event.preventDefault()
                          setDrag({ kind: 'fill', source: rect })
                        }}
                      />}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function borderPx(weight: string): string | undefined {
  return weight === 'thick' ? '3px' : weight === 'medium' ? '2px' : undefined
}

function borderColour(weight: string): string | undefined {
  return weight === 'none' ? undefined : '#111827'
}

/** The parent bumps this on every sheet mutation to force a re-render. */
function revisionOf(props: GridProps): number {
  return props.revision
}

export { cellsOf }
