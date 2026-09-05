import {
  DEFAULT_STYLE,
  formatValue,
  translateInput,
  type CellStyle,
  type CfRule,
  type ChartKind,
  type NumberFormat,
  type Sheet,
} from '@quali/core'
import {
  rebuildSheet,
  scenarioById,
  serialiseMerges,
  type Submission,
} from '@quali/scenarios'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Grid } from './ui/Grid.tsx'
import { Ribbon, borderWeights, type BorderPreset } from './ui/Ribbon.tsx'
import { Chart } from './ui/Chart.tsx'
import { handlePointKey, stopPointing, type EditState } from './ui/editing.ts'
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
} from './ui/selection.ts'

/** Everything the student has typed, formatted and drawn — what gets graded. */
export type Work = Omit<Submission, 'scenarioId' | 'taskId'>

interface Clipboard {
  readonly rect: Rect
  readonly inputs: readonly (readonly string[])[]
  readonly styles: readonly (readonly CellStyle[])[]
}

/**
 * The spreadsheet itself: ribbon, formula bar, grid, charts.
 *
 * It used to be the whole app, with its own header, scenario dropdown, score
 * and sign-in. All of that now belongs to the module shell around it (M10),
 * the same shell M2 and M9 use — so this component knows only about the
 * scenario it was handed and reports back what the student has done.
 */
export function SheetEditor({
  scenarioId,
  initialWork,
  onWork,
}: {
  scenarioId: string
  /** What the student had here last time, restored from their progress file. */
  initialWork?: Work
  onWork: (work: Work) => void
}) {
  const scenario = useMemo(() => scenarioById(scenarioId), [scenarioId])

  // One sheet per scenario, kept alive across switches so a student can move between
  // scenarios without losing work. Only Zurücksetzen re-seeds.
  const sheetsRef = useRef(new Map<string, Sheet>())
  // Restoration is a first-mount affair: after that the live sheet is the truth, and
  // re-reading saved work would undo whatever the student just typed.
  const restored = useRef(false)
  function sheetFor(id: string): Sheet {
    const existing = sheetsRef.current.get(id)
    if (existing) return existing
    // rebuildSheet is the same function the server grades with, so a restored
    // sheet is exactly the sheet the checker would have seen.
    const created =
      !restored.current && initialWork
        ? rebuildSheet(scenarioById(id), initialWork)
        : scenarioById(id).seed()
    restored.current = true
    sheetsRef.current.set(id, created)
    return created
  }
  const sheet = sheetFor(scenarioId)

  const [revision, setRevision] = useState(0)
  const [selection, setSelection] = useState<Selection>(single({ row: 0, col: 0 }))
  const [edit, setEdit] = useState<EditState | null>(null)
  const [clipboard, setClipboard] = useState<Clipboard | null>(null)
  const [renamingTab, setRenamingTab] = useState(false)

  const rect = rectOf(selection)
  const activeA1 = toA1(selection.anchor)

  function touch(): void {
    setRevision((value) => value + 1)
  }

  // Moving to another scenario keeps whatever is already in it; the cursor starts
  // over so the student is not left selecting a cell from the sheet they just left.
  useEffect(() => {
    setSelection(single({ row: 0, col: 0 }))
    setEdit(null)
    setClipboard(null)
  }, [scenarioId])


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

  function applyStyle(patch: Partial<CellStyle>): void {
    for (const pos of cellsOf(rect)) sheet.setStyle(toA1(pos), patch)
    touch()
  }

  function applyNumberFormat(numberFormat: NumberFormat): void {
    applyStyle({ numberFormat })
  }

  /**
   * Borders are range-aware: „Außenrahmen" outlines the selection's perimeter rather than
   * boxing every cell, which is what „dicke Außenlinie" in the 2025 paper asks for.
   */
  function applyBorders(preset: BorderPreset): void {
    const weight = borderWeights(preset)
    const everySide = preset === 'all' || preset === 'none'

    for (const pos of cellsOf(rect)) {
      sheet.setStyle(toA1(pos), {
        borders: {
          top: everySide || pos.row === rect.top ? weight : 'none',
          bottom: everySide || pos.row === rect.bottom ? weight : 'none',
          left: everySide || pos.col === rect.left ? weight : 'none',
          right: everySide || pos.col === rect.right ? weight : 'none',
        },
      })
    }
    touch()
  }

  /** „Verbinden und zentrieren" is one gesture in Excel, so it is one button here. */
  function toggleMerge(): void {
    const range = { start: { row: rect.top, col: rect.left, colAbs: false, rowAbs: false },
                    end: { row: rect.bottom, col: rect.right, colAbs: false, rowAbs: false } }
    if (sheet.isMerged(range)) {
      sheet.unmerge(range)
    } else {
      sheet.merge(range)
      sheet.setStyle(toA1({ row: rect.top, col: rect.left }), { hAlign: 'center' })
    }
    touch()
  }

  const mergedNow = sheet.isMerged({
    start: { row: rect.top, col: rect.left, colAbs: false, rowAbs: false },
    end: { row: rect.bottom, col: rect.right, colAbs: false, rowAbs: false },
  })

  /** Apply a conditional-formatting rule over the current selection (skills F16–F18). */
  function addConditionalFormat(
    condition: CfRule['condition'],
    format: Partial<CellStyle>,
  ): void {
    sheet.addConditionalFormat({
      range: {
        start: { row: rect.top, col: rect.left, colAbs: false, rowAbs: false },
        end: { row: rect.bottom, col: rect.right, colAbs: false, rowAbs: false },
      },
      condition,
      format,
    })
    touch()
  }

  /** Insert a chart reading the current selection — Excel's "Einfügen → Diagramm". */
  function insertChart(kind: ChartKind): void {
    sheet.addChart({
      id: `chart-${Date.now()}`,
      kind,
      source: {
        start: { row: rect.top, col: rect.left, colAbs: false, rowAbs: false },
        end: { row: rect.bottom, col: rect.right, colAbs: false, rowAbs: false },
      },
      title: null,
      axisTitles: { x: null, y: null },
      dataLabels: kind === 'pie' ? 'percent' : 'none',
    })
    touch()
  }

  /**
   * Everything the student has done, which is what gets re-graded.
   * Formatting has to travel with the inputs — without it no style check can pass, and the
   * cells a formatting task targets are often ones the scenario seeded.
   */
  function currentWork(): Omit<Submission, 'scenarioId' | 'taskId'> {
    const inputs: Record<string, string> = {}
    for (const a1 of sheet.populatedCells()) inputs[a1] = sheet.getInput(a1)

    const styles: Record<string, Partial<CellStyle>> = {}
    for (let row = 0; row < scenario.rows; row++) {
      for (let col = 0; col < scenario.columns; col++) {
        const a1 = toA1({ row, col })
        const style = sheet.getStyle(a1)
        if (style !== DEFAULT_STYLE) styles[a1] = style
      }
    }
    return {
      inputs,
      styles,
      merges: serialiseMerges(sheet),
      charts: [...sheet.charts],
      conditionalFormats: [...sheet.conditionalFormats],
      sheetName: sheet.name,
    }
  }

  /**
   * Report the work upward after every change, so the module shell can grade it.
   *
   * Grading used to sit behind a „Prüfen" button on each task. The shell checks
   * continuously instead — ARCHITECTURE.md §5.4, no submit button — and every
   * other module in here already works that way.
   */
  useEffect(() => {
    onWork(currentWork())
    // `revision` is the change signal; `sheet` is mutated in place, so it is not one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, scenarioId])

  const barValue = edit ? edit.draft : sheet.getInput(activeA1)

  return (
    <div className="sheet-pane">
          <Ribbon
            current={sheet.getStyle(activeA1)}
            onStyle={applyStyle}
            onNumberFormat={applyNumberFormat}
            onBorders={applyBorders}
            onMerge={toggleMerge}
            isMerged={mergedNow}
            onInsertChart={insertChart}
            onConditionalFormat={addConditionalFormat}
            onClearConditionalFormats={() => { sheet.clearConditionalFormats(); touch() }}
          />
          <div className="formula-bar">
            <span className="address">{rectLabel(rect)}</span>
            <input
              className="formula-input"
              value={barValue}
              placeholder="Formel eingeben, z. B. =SUMME(B2:B6)"
              onChange={(event) => {
                // React clears `currentTarget` once the handler returns, and a functional
                // updater runs later — so every DOM read has to happen here, not inside it.
                const draft = event.target.value
                const caret = event.target.selectionStart ?? draft.length
                setEdit((previous) =>
                  stopPointing({
                    a1: previous?.a1 ?? activeA1,
                    draft,
                    caret,
                    from: 'bar',
                    point: previous?.point ?? null,
                  }),
                )
              }}
              onSelect={(event) => {
                const caret = event.currentTarget.selectionStart
                setEdit((previous) =>
                  previous ? { ...previous, caret: caret ?? previous.caret } : previous,
                )
              }}
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
          {renamingTab ? (
            <input
              className="tab-input"
              autoFocus
              defaultValue={sheet.name}
              onBlur={(event) => { sheet.name = event.target.value.trim() || sheet.name; setRenamingTab(false); touch() }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
                if (event.key === 'Escape') setRenamingTab(false)
              }}
            />
          ) : (
            <div
              className="tab"
              title="Doppelklick zum Umbenennen"
              onDoubleClick={() => setRenamingTab(true)}
            >
              {sheet.name}
            </div>
          )}
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
          {sheet.charts.length > 0 && (
            <div className="charts">
              {sheet.charts.map((spec) => (
                <div className="chart-card" key={spec.id}>
                  <Chart sheet={sheet} spec={spec} />
                  <div className="chart-controls">
                    <input
                      value={spec.title ?? ''}
                      placeholder="Diagrammtitel"
                      onChange={(event) => {
                        sheet.updateChart(spec.id, { title: event.target.value || null })
                        touch()
                      }}
                    />
                    <select
                      value={spec.dataLabels}
                      title="Datenbeschriftungen"
                      onChange={(event) => {
                        sheet.updateChart(spec.id, {
                          dataLabels: event.target.value as typeof spec.dataLabels,
                        })
                        touch()
                      }}
                    >
                      <option value="none">Keine Beschriftung</option>
                      <option value="value">Werte</option>
                      <option value="percent">Prozentwerte</option>
                    </select>
                    <button
                      className="ghost small drop"
                      title="Diagramm löschen"
                      onClick={() => { sheet.removeChart(spec.id); touch() }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="hint">
            Ziehen am kleinen Quadrat unten rechts füllt die Formel weiter · Strg+C / Strg+V
            kopiert und fügt ein · beim Schreiben einer Formel fügt ein Klick auf eine Zelle
            deren Bezug ein
          </p>
    </div>
  )
}

