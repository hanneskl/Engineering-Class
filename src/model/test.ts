/**
 * The rules of a test, kept apart from its content (`TestLesson`) and its
 * screen (`TestLessonView`): one attempt per question, a score, and an
 * option order drawn from the student's seed so neighbours can't copy.
 */

import type { TestLesson, TestTask } from './types'
import type { Option } from './frage'
import { rngFor, shuffle } from './rng'
import { withTask, type Progress } from '../progress/store'

/** The order the options are shown in — by original index. Stable per student. */
export function optionOrder(seed: number, task: TestTask): number[] {
  return shuffle(
    rngFor(seed, task.id),
    task.frage.optionen.map((_, i) => i),
  )
}

export function isAnswered(progress: Progress, taskId: string): boolean {
  return progress.tests[taskId] !== undefined
}

export function chosenOption(progress: Progress, task: TestTask): Option | undefined {
  const a = progress.tests[task.id]
  return a ? task.frage.optionen[a.chosen] : undefined
}

/**
 * Records the one and only attempt. A second answer to the same question
 * changes nothing — the first one stands, right or wrong.
 */
export function answer(progress: Progress, task: TestTask, chosen: number): Progress {
  if (isAnswered(progress, task.id)) return progress
  const option = task.frage.optionen[chosen]
  if (!option) return progress
  const next = withTask(progress, task.id, { solved: option.ok, attempts: 1, hintsUsed: 0 })
  return { ...next, tests: { ...next.tests, [task.id]: { chosen } } }
}

/** The first question still open, or -1 once every one is answered. */
export function nextOpen(progress: Progress, lesson: TestLesson): number {
  return lesson.tasks.findIndex((t) => !isAnswered(progress, t.id))
}

export function isSubmitted(progress: Progress, lesson: TestLesson): boolean {
  return lesson.tasks.length > 0 && nextOpen(progress, lesson) === -1
}

export function score(progress: Progress, lesson: TestLesson): { correct: number; total: number } {
  const correct = lesson.tasks.filter((t) => chosenOption(progress, t)?.ok).length
  return { correct, total: lesson.tasks.length }
}
