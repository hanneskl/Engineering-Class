/**
 * Grading a submission.
 *
 * This is the authoritative scoring path. The browser runs it for instant feedback and the
 * Supabase edge function runs the identical code to decide what actually gets written to
 * `attempts` — the client is never trusted with `passed` or `points`.
 */

import { runChecks, Sheet } from '@quali/core'
import { scenarioById, type Scenario, type TaskDef } from './index.ts'

export interface Submission {
  readonly scenarioId: string
  readonly taskId: string
  /** Every cell the student has filled, as raw input strings keyed by A1 address. */
  readonly inputs: Readonly<Record<string, string>>
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
 */
export function rebuildSheet(scenario: Scenario, inputs: Readonly<Record<string, string>>): Sheet {
  const sheet = scenario.seed()
  const seeded = new Set(sheet.populatedCells())

  for (const [a1, input] of Object.entries(inputs)) {
    if (seeded.has(a1.toUpperCase())) continue
    sheet.setInput(a1, input)
  }
  return sheet
}

export function gradeSubmission(submission: Submission): Grade {
  const scenario = scenarioById(submission.scenarioId)
  const task = taskById(scenario, submission.taskId)
  const sheet = rebuildSheet(scenario, submission.inputs)

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
