import { describe, expect, it } from 'vitest'
import {
  hasChart,
  rowOrder,
  runChecks,
  usesFunctionTimes,
  type Check,
} from './checks.ts'
import { parseA1, type RangeRef } from './refs.ts'
import { Sheet } from './sheet.ts'

const range = (start: string, end: string): RangeRef => ({ start: parseA1(start)!, end: parseA1(end)! })
const run = (sheet: Sheet, check: Check, target = 'A1') => runChecks([check], { sheet, target })

function table(): Sheet {
  const sheet = new Sheet('T')
  sheet.load({ A1: 'Bauer', B1: 30, A2: 'Huber', B2: 10, A3: 'Ader', B3: 20 })
  return sheet
}

const column = (sheet: Sheet, letter: string, rows = 3) =>
  Array.from({ length: rows }, (_, i) => sheet.getValue(`${letter}${i + 1}`))

describe('sortRows', () => {
  it('sorts numbers numerically, ascending and descending, with the row', () => {
    const sheet = table()
    sheet.sortRows(range('A1', 'B3'), 1, 'asc')
    expect(column(sheet, 'B')).toEqual([10, 20, 30])
    expect(column(sheet, 'A')).toEqual(['Huber', 'Ader', 'Bauer'])
    sheet.sortRows(range('A1', 'B3'), 1, 'desc')
    expect(column(sheet, 'B')).toEqual([30, 20, 10])
    expect(column(sheet, 'A')).toEqual(['Bauer', 'Ader', 'Huber'])
  })

  it('compares numbers as numbers, not as text', () => {
    const sheet = new Sheet('T')
    sheet.load({ A1: 100, A2: 9, A3: 20 })
    sheet.sortRows(range('A1', 'A3'), 0, 'asc')
    expect(column(sheet, 'A')).toEqual([9, 20, 100])
  })

  it('sorts text alphabetically, umlauts in their German place', () => {
    const sheet = new Sheet('T')
    sheet.load({ A1: 'Zeller', A2: 'Öttl', A3: 'Adam' })
    sheet.sortRows(range('A1', 'A3'), 0, 'asc')
    expect(column(sheet, 'A')).toEqual(['Adam', 'Öttl', 'Zeller'])
    sheet.sortRows(range('A1', 'A3'), 0, 'desc')
    expect(column(sheet, 'A')).toEqual(['Zeller', 'Öttl', 'Adam'])
  })

  it('moves the formatting with the row', () => {
    const sheet = table()
    sheet.setStyle('A2', { bold: true })
    sheet.sortRows(range('A1', 'B3'), 1, 'asc')
    expect(sheet.getStyle('A1').bold).toBe(true)
    expect(sheet.getStyle('A2').bold).toBe(false)
  })

  it('keeps references to the own row on that row', () => {
    const sheet = table()
    sheet.setInput('C1', '=B1*2')
    sheet.setInput('C2', '=B2*2')
    sheet.setInput('C3', '=B3*2')
    sheet.sortRows(range('A1', 'C3'), 1, 'asc')
    expect(sheet.getInput('C1')).toBe('=B1*2')
    expect(column(sheet, 'C')).toEqual([20, 40, 60])
  })

  it('leaves absolute references where they are', () => {
    const sheet = table()
    sheet.load({ E1: 5 })
    sheet.setInput('C1', '=B1*$E$1')
    sheet.setInput('C2', '=B2*$E$1')
    sheet.setInput('C3', '=B3*$E$1')
    sheet.sortRows(range('A1', 'C3'), 1, 'desc')
    expect(sheet.getInput('C3')).toBe('=B3*$E$1')
    expect(column(sheet, 'C')).toEqual([150, 100, 50])
  })

  it('sorts by a computed column', () => {
    const sheet = table()
    sheet.setInput('C1', '=B1*2')
    sheet.setInput('C2', '=B2*2')
    sheet.setInput('C3', '=B3*2')
    sheet.sortRows(range('A1', 'C3'), 2, 'desc')
    expect(column(sheet, 'A')).toEqual(['Bauer', 'Ader', 'Huber'])
  })

  it('puts empty cells last in both directions', () => {
    for (const direction of ['asc', 'desc'] as const) {
      const sheet = new Sheet('T')
      sheet.load({ A1: 2, A3: 1 })
      sheet.sortRows(range('A1', 'A3'), 0, direction)
      expect(sheet.getValue('A3')).toBe(null)
    }
  })
})

describe('hasHeaderRow', () => {
  it('sees a header in an all-text first row', () => {
    const sheet = table()
    sheet.load({ A5: 'Name', B5: 'Wert', A6: 'Bauer', B6: 3 })
    expect(sheet.hasHeaderRow(range('A5', 'B6'))).toBe(true)
  })

  it('takes a first row with a number for data', () => {
    expect(table().hasHeaderRow(range('A1', 'B3'))).toBe(false)
  })
})

describe('rowOrder', () => {
  const ORIGINAL = [['Bauer', 30], ['Huber', 10], ['Ader', 20]] as const

  it('passes a table sorted as a whole', () => {
    const sheet = table()
    sheet.sortRows(range('A1', 'B3'), 1, 'desc')
    expect(run(sheet, rowOrder('A1:B3', 'B', 'desc', ORIGINAL)).passed).toBe(true)
  })

  it('fails an unsorted table and names the direction', () => {
    const outcome = run(table(), rowOrder('A1:B3', 'B', 'asc', ORIGINAL))
    expect(outcome.passed).toBe(false)
    expect(outcome.messages[0]).toContain('aufsteigend')
  })

  it('fails the wrong direction', () => {
    const sheet = table()
    sheet.sortRows(range('A1', 'B3'), 1, 'asc')
    expect(run(sheet, rowOrder('A1:B3', 'B', 'desc', ORIGINAL)).passed).toBe(false)
  })

  it('catches rows torn apart by sorting one column only', () => {
    const torn = table()
    torn.sortRows(range('B1', 'B3'), 1, 'asc')
    const outcome = run(torn, rowOrder('A1:B3', 'B', 'asc', ORIGINAL))
    expect(outcome.passed).toBe(false)
    expect(outcome.messages[0]).toBe('Du hast nur eine Spalte sortiert – markiere die ganze Tabelle.')
  })
})

describe('usesFunctionTimes', () => {
  const MESSAGE = 'Es gibt drei Fälle – du brauchst ein zweites WENN im Sonst-Teil.'
  const check = usesFunctionTimes('WENN', 2, MESSAGE)

  it('passes a nested WENN', () => {
    const sheet = new Sheet('T')
    sheet.setInput('A1', '=WENN(B1>30;300;WENN(B1>20;100;0))')
    expect(run(sheet, check).passed).toBe(true)
  })

  it('gives its own message for a single WENN', () => {
    const sheet = new Sheet('T')
    sheet.setInput('A1', '=WENN(B1>30;300;0)')
    const outcome = run(sheet, check)
    expect(outcome.passed).toBe(false)
    expect(outcome.messages[0]).toBe(MESSAGE)
  })
})

describe('hasChart with a separate label range', () => {
  const requirement = { kind: 'column', source: 'F3:F11', labels: 'A3:A11' } as const
  const chart = {
    id: 'c',
    kind: 'column',
    source: range('F3', 'F11'),
    title: null,
    axisTitles: { x: null, y: null },
    dataLabels: 'none',
  } as const

  it('passes with both ranges', () => {
    const sheet = new Sheet('T')
    sheet.addChart({ ...chart, labels: range('A3', 'A11') })
    expect(run(sheet, hasChart(requirement)).passed).toBe(true)
  })

  it('fails without the labels and points at the Strg key', () => {
    const sheet = new Sheet('T')
    sheet.addChart(chart)
    const outcome = run(sheet, hasChart(requirement))
    expect(outcome.passed).toBe(false)
    expect(outcome.messages[0]).toContain('Strg')
  })

  it('fails with the wrong label range', () => {
    const sheet = new Sheet('T')
    sheet.addChart({ ...chart, labels: range('B3', 'B11') })
    expect(run(sheet, hasChart(requirement)).passed).toBe(false)
  })
})
