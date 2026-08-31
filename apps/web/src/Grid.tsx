import { colToLetters, formatValue, type Sheet } from '@quali/core'
import { useEffect, useRef, useState } from 'react'

interface GridProps {
  sheet: Sheet
  columns: number
  rows: number
  selected: string
  onSelect: (a1: string) => void
  onCommit: (a1: string, input: string) => void
  /** Bumped by the parent whenever the sheet changes, to force a re-render. */
  revision: number
}

export function Grid({ sheet, columns, rows, selected, onSelect, onCommit, revision }: GridProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const editorRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing) editorRef.current?.focus()
  }, [editing])

  function beginEdit(a1: string, initial?: string): void {
    setDraft(initial ?? sheet.getInput(a1))
    setEditing(a1)
  }

  function commit(): void {
    if (editing) onCommit(editing, draft)
    setEditing(null)
    gridRef.current?.focus()
  }

  function move(dRow: number, dCol: number): void {
    const match = /^([A-Z]+)(\d+)$/.exec(selected)
    if (!match) return
    const col = match[1]!.charCodeAt(0) - 65 + dCol
    const row = Number(match[2]) + dRow
    if (col < 0 || col >= columns || row < 1 || row > rows) return
    onSelect(`${colToLetters(col)}${row}`)
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (editing) return
    switch (event.key) {
      case 'ArrowUp': event.preventDefault(); move(-1, 0); return
      case 'ArrowDown': case 'Enter': event.preventDefault(); move(1, 0); return
      case 'ArrowLeft': event.preventDefault(); move(0, -1); return
      case 'ArrowRight': case 'Tab': event.preventDefault(); move(0, 1); return
      case 'F2': event.preventDefault(); beginEdit(selected); return
      case 'Delete': case 'Backspace': event.preventDefault(); onCommit(selected, ''); return
    }
    // Typing over a selection replaces its contents, as in Excel.
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      beginEdit(selected, event.key)
    }
  }

  return (
    <div className="grid" ref={gridRef} tabIndex={0} onKeyDown={onKeyDown} data-revision={revision}>
      <table>
        <thead>
          <tr>
            <th className="corner" />
            {Array.from({ length: columns }, (_, col) => (
              <th key={col}>{colToLetters(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => {
            const row = rowIndex + 1
            return (
              <tr key={row}>
                <th className="row-head">{row}</th>
                {Array.from({ length: columns }, (_, col) => {
                  const a1 = `${colToLetters(col)}${row}`
                  const style = sheet.getStyle(a1)
                  const formatted = formatValue(sheet.getValue(a1), style.numberFormat)
                  const isSelected = a1 === selected
                  const isEditing = a1 === editing
                  return (
                    <td
                      key={a1}
                      className={isSelected ? 'cell selected' : 'cell'}
                      style={{
                        background: style.fill ?? undefined,
                        fontWeight: style.bold ? 700 : undefined,
                        color: formatted.negativeRed ? '#c00' : style.color,
                        textAlign:
                          style.hAlign ??
                          (typeof sheet.getValue(a1) === 'number' ? 'right' : 'left'),
                      }}
                      onClick={() => {
                        onSelect(a1)
                        // Without this the grid never takes focus, so typing after a click
                        // goes nowhere and the cell looks selected but dead.
                        gridRef.current?.focus()
                      }}
                      onDoubleClick={() => beginEdit(a1)}
                    >
                      {isEditing ? (
                        <input
                          ref={editorRef}
                          className="editor"
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          onBlur={commit}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') { event.preventDefault(); commit() }
                            if (event.key === 'Escape') { setEditing(null); gridRef.current?.focus() }
                          }}
                        />
                      ) : (
                        formatted.text
                      )}
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
