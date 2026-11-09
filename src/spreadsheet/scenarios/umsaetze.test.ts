import { describe, expect, it } from 'vitest'
import { parseA1, type ChartSpec, type RangeRef, type Sheet } from '@quali/core'
import { gradeSubmission, rebuildSheet, serialiseMerges, type Submission } from './grade.ts'
import { PALETTE, scenarioById, totalPoints } from './index.ts'
import { readChartData } from '../ui/Chart.tsx'

const range = (start: string, end: string): RangeRef => ({ start: parseA1(start)!, end: parseA1(end)! })
const scenario = scenarioById('umsaetze')
const ROWS = [4, 5, 6, 7, 8, 9, 10, 11]
const EURO = { numberFormat: { kind: 'currency', decimals: 0, symbol: '€', negativeRed: false } } as const

const CHART: ChartSpec = {
  id: 'c',
  kind: 'column',
  source: range('F3', 'F11'),
  labels: range('A3', 'A11'),
  title: 'Umsatz 1. Quartal',
  axisTitles: { x: null, y: null },
  dataLabels: 'value',
}

/** The sheet as a student who has done everything leaves it, before sorting. */
function solved(): Sheet {
  const sheet = scenario.seed()
  sheet.setInput('A1', 'Umsätze 1. Quartal')
  sheet.merge(range('A1', 'G1'))
  sheet.setStyle('A1', { hAlign: 'center' })
  for (const row of ROWS) {
    sheet.setInput(`F${row}`, `=SUMME(C${row}:E${row})`)
    sheet.setInput(`G${row}`, `=WENN(F${row}>30000;300;WENN(F${row}>20000;100;0))`)
  }
  for (const column of 'CDEF') sheet.setInput(`${column}12`, `=SUMME(${column}4:${column}11)`)
  sheet.setInput('B14', '=ANZAHL(F4:F11)')
  sheet.setInput('B15', '=ZÄHLENWENN(B4:B11;"Grafing")')
  for (const column of 'CDEFG') {
    for (const row of [...ROWS, 12]) sheet.setStyle(`${column}${row}`, EURO)
  }
  sheet.addConditionalFormat({
    range: range('B4', 'B11'),
    condition: { kind: 'equalText', text: 'Grafing' },
    format: { color: PALETTE.blau },
  })
  sheet.addChart(CHART)
  return sheet
}

/** What the editor hands to the grader. */
function workOf(sheet: Sheet): Omit<Submission, 'scenarioId' | 'taskId'> {
  const inputs: Record<string, string> = {}
  for (const a1 of sheet.populatedCells()) inputs[a1] = sheet.getInput(a1)
  const styles: Submission['styles'] = Object.fromEntries(
    Array.from({ length: scenario.rows }, (_, r) => r + 1).flatMap((row) =>
      [...'ABCDEFG'].map((column) => [`${column}${row}`, sheet.getStyle(`${column}${row}`)]),
    ),
  )
  return {
    inputs,
    styles,
    merges: serialiseMerges(sheet),
    charts: [...sheet.charts],
    conditionalFormats: [...sheet.conditionalFormats],
    sheetName: sheet.name,
  }
}

const grade = (sheet: Sheet, taskId: string) =>
  gradeSubmission({ scenarioId: 'umsaetze', taskId, ...workOf(sheet) })

function sorted(): Sheet {
  const sheet = solved()
  sheet.sortRows(range('A4', 'G11'), 5, 'desc')
  return sheet
}

describe('Umsätze und Bonus', () => {
  it('earns full marks when played through, sorting included', () => {
    const sheet = sorted()
    const grades = scenario.tasks.map((task) => grade(sheet, task.id))
    expect(grades.filter((g) => !g.passed)).toEqual([])
    expect(grades.reduce((sum, g) => sum + g.points, 0)).toBe(totalPoints(scenario))
    expect(totalPoints(scenario)).toBe(12)
  })

  it('reaches every bonus branch with the briefing totals', () => {
    const sheet = solved()
    expect(ROWS.map((row) => sheet.getValue(`F${row}`))).toEqual([
      31500, 22200, 17300, 26100, 31400, 19900, 16200, 25100,
    ])
    expect(new Set(ROWS.map((row) => sheet.getValue(`G${row}`)))).toEqual(new Set([300, 100, 0]))
  })

  it('keeps sorted rows when the sheet is rebuilt for grading', () => {
    const rebuilt = rebuildSheet(scenario, workOf(sorted()))
    expect(rebuilt.getValue('A4')).toBe('Huber')
    expect(rebuilt.getValue('F4')).toBe(31500)
    expect(rebuilt.getValue('G4')).toBe(300)
    expect(rebuilt.getValue('F11')).toBe(16200)
  })

  it('fails the sort task until the table is sorted', () => {
    expect(grade(solved(), 'ums-sortieren').passed).toBe(false)
    expect(grade(sorted(), 'ums-sortieren').passed).toBe(true)
  })

  it('names rows torn apart by leaving the names behind', () => {
    const sheet = solved()
    sheet.sortRows(range('B4', 'G11'), 5, 'desc')
    const result = grade(sheet, 'ums-sortieren')
    expect(result.passed).toBe(false)
    expect(result.message).toBe('Du hast nur eine Spalte sortiert – markiere die ganze Tabelle.')
  })

  it('still rejects changed numbers smuggled in through the sortable range', () => {
    const sheet = sorted()
    sheet.setInput('C4', '99999')
    const rebuilt = rebuildSheet(scenario, workOf(sheet))
    expect(rebuilt.getValue('C4')).toBe(9800)
  })

  it('tells a single WENN apart from a wrong one', () => {
    const sheet = solved()
    sheet.setInput('G4', '=WENN(F4>30000;300;0)')
    expect(grade(sheet, 'ums-bonus').message).toBe(
      'Es gibt drei Fälle – du brauchst ein zweites WENN im Sonst-Teil.',
    )
  })

  it('draws names and totals from the two separate ranges, following the sort', () => {
    const data = readChartData(sorted(), CHART)
    expect(data.labels[0]).toBe('Huber')
    expect(data.values[0]).toBe(31500)
    expect(data.values).toHaveLength(8)
  })
})
