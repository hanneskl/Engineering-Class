import { formatValue, runChecks, translateInput, type CellStyle, type Sheet } from '@quali/core'
import { SCENARIOS, scenarioById, totalPoints, type TaskDef } from '@quali/scenarios'
import { useMemo, useState } from 'react'
import { Grid } from './Grid.tsx'
import { handlePointKey, stopPointing, type EditState } from './editing.ts'
import {
  canPoint,
  cellsOf,
  rectLabel,
  rectOf,
  single,
  toA1,
  toPos,
  type Pos,
  type Rect,
  type Selection,
} from './selection.ts'

type Status = 'open' | 'passed' | 'failed'

interface TaskState {
  readonly status: Status
  readonly message: string
}

interface Clipboard {
  readonly rect: Rect
  readonly inputs: readonly (readonly string[])[]
  readonly styles: readonly (readonly CellStyle[])[]
}

export function App() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]!.id)
  const scenario = useMemo(() => scenarioById(scenarioId), [scenarioId])

  const [sheet, setSheet] = useState<Sheet>(() => scenario.seed())
  const [revision, setRevision] = useState(0)
  const [selection, setSelection] = useState<Selection>(single({ row: 0, col: 0 }))
  const [edit, setEdit] = useState<EditState | null>(null)
  const [clipboard, setClipboard] = useState<Clipboard | null>(null)
  const [states, setStates] = useState<Record<string, TaskState>>({})

  const rect = rectOf(selection)
  const activeA1 = toA1(selection.anchor)

  function touch(): void {
    setRevision((value) => value + 1)
  }

  function reset(id: string): void {
    const next = scenarioById(id)
    setScenarioId(id)
    setSheet(next.seed())
    setStates({})
    setSelection(single({ row: 0, col: 0 }))
    setEdit(null)
    setClipboard(null)
    touch()
  }

  function commit(a1: string, input: string): void {
    sheet.setInput(a1, input)
    touch()
  }

  function clear(target: Rect): void {
    for (const pos of cellsOf(target)) sheet.setInput(toA1(pos), '')
    touch()
  }

  /** Drag-to-fill: repeat the source pattern across the extension, translating references. */
  function fill(source: Rect, extension: Rect): void {
    const height = source.bottom - source.top + 1
    const width = source.right - source.left + 1

    for (const pos of cellsOf(extension)) {
      // Walk backwards from the source so a multi-cell pattern repeats instead of stretching.
      const offsetRow = ((pos.row - source.top) % height + height) % height
      const offsetCol = ((pos.col - source.left) % width + width) % width
      const from = { row: source.top + offsetRow, col: source.left + offsetCol }
      const fromA1 = toA1(from)
      sheet.setInput(
        toA1(pos),
        translateInput(sheet.getInput(fromA1), pos.row - from.row, pos.col - from.col),
      )
      sheet.setStyle(toA1(pos), sheet.getStyle(fromA1))
    }
    setSelection({
      anchor: { row: Math.min(source.top, extension.top), col: Math.min(source.left, extension.left) },
      focus: { row: Math.max(source.bottom, extension.bottom), col: Math.max(source.right, extension.right) },
    })
    touch()
  }

  /** Copy: remember the formulas internally, and hand the displayed values to the OS. */
  function copy(target: Rect): string {
    const inputs: string[][] = []
    const styles: CellStyle[][] = []
    const lines: string[] = []

    for (let row = target.top; row <= target.bottom; row++) {
      const inputRow: string[] = []
      const styleRow: CellStyle[] = []
      const cells: string[] = []
      for (let col = target.left; col <= target.right; col++) {
        const a1 = toA1({ row, col })
        inputRow.push(sheet.getInput(a1))
        styleRow.push(sheet.getStyle(a1))
        cells.push(formatValue(sheet.getValue(a1), sheet.getStyle(a1).numberFormat).text)
      }
      inputs.push(inputRow)
      styles.push(styleRow)
      lines.push(cells.join('\t'))
    }

    setClipboard({ rect: target, inputs, styles })
    return lines.join('\n')
  }

  function paste(target: Pos, external: string | null): void {
    if (clipboard) {
      const dRow = target.row - clipboard.rect.top
      const dCol = target.col - clipboard.rect.left
      // A single copied cell fills the whole selection, as in Excel.
      const spread =
        clipboard.inputs.length === 1 && clipboard.inputs[0]!.length === 1
          ? rect
          : {
              top: target.row,
              left: target.col,
              bottom: target.row + clipboard.inputs.length - 1,
              right: target.col + clipboard.inputs[0]!.length - 1,
            }

      for (const pos of cellsOf(spread)) {
        const sourceRow = clipboard.inputs.length === 1 ? 0 : pos.row - target.row
        const sourceCol = clipboard.inputs[0]!.length === 1 ? 0 : pos.col - target.col
        const input = clipboard.inputs[sourceRow]?.[sourceCol] ?? ''
        const style = clipboard.styles[sourceRow]?.[sourceCol]
        const rowShift = clipboard.inputs.length === 1 ? pos.row - clipboard.rect.top : dRow
        const colShift = clipboard.inputs[0]!.length === 1 ? pos.col - clipboard.rect.left : dCol
        sheet.setInput(toA1(pos), translateInput(input, rowShift, colShift))
        if (style) sheet.setStyle(toA1(pos), style)
      }
      touch()
      return
    }

    if (!external) return
    // Nothing of ours on the clipboard — treat outside text as literal rows and columns.
    external.split(/\r?\n/).forEach((line, rowOffset) => {
      line.split('\t').forEach((value, colOffset) => {
        sheet.setInput(toA1({ row: target.row + rowOffset, col: target.col + colOffset }), value)
      })
    })
    touch()
  }

  function check(task: TaskDef): void {
    const outcome = runChecks(task.checks, {
      sheet,
      target: task.target,
      solution: task.solution,
    })
    setStates((previous) => ({
      ...previous,
      [task.id]: {
        status: outcome.passed ? 'passed' : 'failed',
        message: outcome.messages[0] ?? '',
      },
    }))
  }

  const earned = scenario.tasks
    .filter((task) => states[task.id]?.status === 'passed')
    .reduce((sum, task) => sum + task.points, 0)

  const barValue = edit ? edit.draft : sheet.getInput(activeA1)

  return (
    <div className="app">
      <header>
        <div>
          <h1>Quali Excel Trainer</h1>
          <p className="subtitle">{scenario.subtitleDe}</p>
        </div>
        <div className="header-right">
          <select value={scenarioId} onChange={(event) => reset(event.target.value)}>
            {SCENARIOS.map((item) => (
              <option key={item.id} value={item.id}>{item.titleDe}</option>
            ))}
          </select>
          <span className="score">{earned} / {totalPoints(scenario)} Punkte</span>
          <button className="ghost" onClick={() => reset(scenarioId)}>Zurücksetzen</button>
        </div>
      </header>

      <main>
        <section className="sheet-pane">
          <div className="formula-bar">
            <span className="address">{rectLabel(rect)}</span>
            <input
              className="formula-input"
              value={barValue}
              placeholder="Formel eingeben, z. B. =SUMME(B2:B6)"
              onChange={(event) =>
                setEdit((previous) =>
                  stopPointing({
                    a1: previous?.a1 ?? activeA1,
                    draft: event.target.value,
                    caret: event.target.selectionStart ?? event.target.value.length,
                    from: 'bar',
                    point: previous?.point ?? null,
                  }),
                )
              }
              onSelect={(event) =>
                setEdit((previous) =>
                  previous
                    ? { ...previous, caret: event.currentTarget.selectionStart ?? previous.caret }
                    : previous,
                )
              }
              onKeyDown={(event) => {
                if (edit) {
                  const pointed = handlePointKey(
                    edit,
                    event.key,
                    event.shiftKey,
                    toPos(edit.a1),
                    { rows: scenario.rows, columns: scenario.columns },
                  )
                  if (pointed) {
                    event.preventDefault()
                    setEdit(pointed)
                    return
                  }
                }
                if (event.key === 'Enter' && edit) {
                  commit(edit.a1, edit.draft)
                  setEdit(null)
                }
                if (event.key === 'Escape') setEdit(null)
              }}
              onBlur={() => {
                // Blurring to point at a cell must not commit; the grid handles that case.
                if (edit && edit.from === 'bar' && !canPoint(edit.draft, edit.caret)) {
                  commit(edit.a1, edit.draft)
                  setEdit(null)
                }
              }}
            />
          </div>
          <div className="tab">{sheet.name}</div>
          <Grid
            sheet={sheet}
            columns={scenario.columns}
            rows={scenario.rows}
            selection={selection}
            onSelectionChange={setSelection}
            edit={edit}
            onEditChange={setEdit}
            onCommit={commit}
            onClear={clear}
            onFill={fill}
            onCopy={copy}
            onPaste={paste}
            copiedRect={clipboard?.rect ?? null}
            revision={revision}
          />
          <p className="hint">
            Ziehen am kleinen Quadrat unten rechts füllt die Formel weiter · Strg+C / Strg+V
            kopiert und fügt ein · beim Schreiben einer Formel fügt ein Klick auf eine Zelle
            deren Bezug ein
          </p>
        </section>

        <aside className="tasks">
          <div className="tasks-head">
            <h2>Arbeitsaufträge</h2>
            <button onClick={() => scenario.tasks.forEach(check)}>Alles prüfen</button>
          </div>
          <p className="rule">Alle Berechnungen sind mit Formeln durchzuführen!</p>

          <ol>
            {scenario.tasks.map((task, index) => {
              const state = states[task.id] ?? { status: 'open' as Status, message: '' }
              return (
                <li key={task.id} className={`task ${state.status}`}>
                  <div className="task-head">
                    <span className="mark">
                      {state.status === 'passed' ? '✓' : state.status === 'failed' ? '✗' : index + 1}
                    </span>
                    <span className="points">{task.points} P</span>
                  </div>
                  <p className="prompt">{task.promptDe}</p>
                  {state.status === 'failed' && <p className="feedback">{state.message}</p>}
                  <button className="ghost small" onClick={() => check(task)}>Prüfen</button>
                </li>
              )
            })}
          </ol>
        </aside>
      </main>
    </div>
  )
}

