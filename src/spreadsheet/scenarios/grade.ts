/**
 * Grading a submission.
 *
 * This is the authoritative scoring path. The browser runs it for instant feedback and the
 * Supabase edge function runs the identical code to decide what actually gets written to
 * `attempts` — the client is never trusted with `passed` or `points`.
 */

import {
  expandRange,
  formatA1,
  parseA1,
  refKey,
  runChecks,
  Sheet,
  type CellStyle,
  type CfRule,
  type ChartSpec,
  type RangeRef,
} from '@quali/core'
import { scenarioById, type Scenario, type TaskDef } from './index.ts'

export interface Submission {
  readonly scenarioId: string
  readonly taskId: string
  /** Every cell the student has filled, as raw input strings keyed by A1 address. */
  readonly inputs: Readonly<Record<string, string>>
  /**
   * The student's formatting, without which no style check can pass.
   * Unlike inputs these DO apply to seeded cells — „Formatiere die Zeile 3 fett" targets
   * exactly the header row the scenario seeded.
   */
  readonly styles?: Readonly<Record<string, Partial<CellStyle>>>
  /** Merged ranges as `"B1:H1"`. */
  readonly merges?: readonly string[]
  readonly conditionalFormats?: readonly CfRule[]
  readonly charts?: readonly ChartSpec[]
  /** The tab name, which the student can rename — skill S1, in six of seven exam years. */
  readonly sheetName?: string
  /** Per-student data randomisation. Reserved; scenarios are not yet randomised. */
  readonly seed?: number
}

export interface Grade {
  readonly taskId: string
  readonly passed: boolean
  readonly points: number
  readonly message: string
  readonly skills: readonly string[]
}

export function taskById(scenario: Scenario, taskId: string): TaskDef {
  const found = scenario.tasks.find((task) => task.id === taskId)
  if (!found) throw new Error(`Unbekannte Aufgabe „${taskId}".`)
  return found
}

/**
 * Rebuild the student's sheet from a freshly seeded scenario plus their inputs.
 *
 * Cells the scenario seeded with data are **not** overwritten. Re-seeding server-side is what
 * stops a crafted request from rewriting the source numbers so that a wrong answer becomes
 * "correct" — the answer key is a formula evaluated against this same data, so tampering with
 * the data would otherwise move the target as well.
 *
 * The one exception is a scenario's `sortable` range, where seeded cells may change place: see
 * `movedBySorting`.
 */
export function rebuildSheet(scenario: Scenario, submission: Omit<Submission, 'scenarioId' | 'taskId'>): Sheet {
  const sheet = scenario.seed()
  const seeded = new Set(sheet.populatedCells())
  const moved = movedBySorting(scenario, sheet, submission.inputs)

  for (const [a1, input] of Object.entries(submission.inputs)) {
    if (seeded.has(a1.toUpperCase()) && !moved.has(a1.toUpperCase())) continue
    sheet.setInput(a1, input)
  }
  for (const [a1, style] of Object.entries(submission.styles ?? {})) {
    sheet.setStyle(a1, style)
  }
  for (const range of submission.merges ?? []) {
    const parsed = parseRange(range)
    if (parsed) sheet.merge(parsed)
  }
  for (const rule of submission.conditionalFormats ?? []) {
    sheet.addConditionalFormat(rule)
  }
  for (const chart of submission.charts ?? []) {
    sheet.addChart(chart)
  }
  if (submission.sheetName) sheet.name = submission.sheetName
  return sheet
}

/**
 * The seeded cells a student may legitimately have moved by sorting.
 *
 * Sorting rewrites seeded cells, which the re-seeding rule above would otherwise throw away.
 * It is accepted only if every column of the range still holds exactly its seeded values, just
 * in another order, so no number can be altered this way. Columns are compared one by one on
 * purpose: rows torn apart by a half-marked sort must reach the checker, whose message is the
 * teaching.
 */
function movedBySorting(
  scenario: Scenario,
  seed: Sheet,
  inputs: Readonly<Record<string, string>>,
): Set<string> {
  const range = scenario.sortable ? parseRange(scenario.sortable) : null
  if (!range) return new Set()

  const cells = expandRange(range)
  const given = new Map(Object.entries(inputs).map(([a1, input]) => [a1.toUpperCase(), input]))
  for (const col of new Set(cells.map((ref) => ref.col))) {
    const inColumn = cells.filter((ref) => ref.col === col)
    const before = inColumn.map((ref) => seed.getInput(ref)).sort()
    const after = inColumn.map((ref) => given.get(refKey(ref)) ?? '').sort()
    if (before.join('\n') !== after.join('\n')) return new Set()
  }
  return new Set(cells.map(refKey))
}

function parseRange(text: string): RangeRef | null {
  const [a, b] = text.split(':')
  const start = a ? parseA1(a.trim()) : null
  if (!start) return null
  const end = b ? parseA1(b.trim()) : start
  return end ? { start, end } : null
}

/** Serialise a sheet's merges the way a Submission carries them. */
export function serialiseMerges(sheet: Sheet): string[] {
  return sheet.merges.map((m) => `${formatA1(m.start)}:${formatA1(m.end)}`)
}

export function gradeSubmission(submission: Submission): Grade {
  const scenario = scenarioById(submission.scenarioId)
  const task = taskById(scenario, submission.taskId)
  const sheet = rebuildSheet(scenario, submission)

  const outcome = runChecks(task.checks, {
    sheet,
    target: task.target,
    solution: task.solution,
  })

  return {
    taskId: task.id,
    passed: outcome.passed,
    points: outcome.passed ? task.points : 0,
    message: outcome.messages[0] ?? '',
    skills: task.skills,
  }
}
