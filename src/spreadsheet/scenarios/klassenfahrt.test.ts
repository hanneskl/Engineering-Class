import { describe, expect, it } from 'vitest'
import type { CfRule } from '@quali/core'
import { gradeSubmission, type Submission } from './grade.ts'
import { PALETTE, scenarioById, totalPoints } from './index.ts'

const ROWS = [5, 6, 7, 8, 9, 10, 11, 12]
const scenario = scenarioById('klassenfahrt')

const OFFEN: CfRule = {
  range: {
    start: { row: 4, col: 3, colAbs: false, rowAbs: false },
    end: { row: 11, col: 3, colAbs: false, rowAbs: false },
  },
  condition: { kind: 'equalText', text: 'offen' },
  format: { fill: PALETTE.rot },
}

function solution(): Omit<Submission, 'scenarioId' | 'taskId'> {
  const inputs: Record<string, string> = { B13: '=SUMME(B5:B12)', C13: '=SUMME(C5:C12)' }
  for (const row of ROWS) {
    inputs[`C${row}`] = `=$B$2-B${row}`
    inputs[`D${row}`] = `=WENN(C${row}>0;"offen";"bezahlt")`
  }
  return { inputs, conditionalFormats: [OFFEN] }
}

const grade = (work: Omit<Submission, 'scenarioId' | 'taskId'>, taskId: string) =>
  gradeSubmission({ scenarioId: 'klassenfahrt', taskId, ...work })

describe('Klassenfahrt-Kasse', () => {
  it('earns 6 of 6 points when played through', () => {
    const grades = scenario.tasks.map((task) => grade(solution(), task.id))
    expect(grades.filter((g) => !g.passed)).toEqual([])
    expect(grades.reduce((sum, g) => sum + g.points, 0)).toBe(6)
    expect(totalPoints(scenario)).toBe(6)
  })

  it('names the $ when B2 stays relative and the formula is dragged down', () => {
    const work = solution()
    const inputs = { ...work.inputs }
    for (const row of ROWS) inputs[`C${row}`] = `=B${row - 3}-B${row}`
    const result = grade({ ...work, inputs }, 'kf-rest')
    expect(inputs.C5).toBe('=B2-B5')
    expect(result.passed).toBe(false)
    expect(result.message).toBe(
      'Beim Runterziehen rutscht B2 mit nach unten. Mit $B$2 bleibt der Preis fest.',
    )
  })

  it('fails the colour task without the rule', () => {
    expect(grade({ ...solution(), conditionalFormats: [] }, 'kf-farbe').passed).toBe(false)
  })
})
