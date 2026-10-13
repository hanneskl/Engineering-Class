/**
 * The rules of a test, kept apart from its content (`TestLesson`) and its
 * screen (`TestLessonView`): answers can be changed until the test is
 * handed in, then everything is locked; a score; and an option order drawn
 * from the student's seed so neighbours can't copy.
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
 * Records (or changes) the pick for one question. Once the test is handed
 * in the pick is locked and a further answer changes nothing.
 */
export function answer(progress: Progress, task: TestTask, chosen: number): Progress {
  if (progress.tests[task.id]?.locked) return progress
  const option = task.frage.optionen[chosen]
  if (!option) return progress
  const next = withTask(progress, task.id, { solved: option.ok, attempts: 1, hintsUsed: 0 })
  return { ...next, tests: { ...next.tests, [task.id]: { chosen } } }
}

/** Hands the test in: every answer is locked, right or wrong. */
export function submit(progress: Progress, lesson: TestLesson): Progress {
  const tests = { ...progress.tests }
  for (const t of lesson.tasks) {
    const a = tests[t.id]
    if (a) tests[t.id] = { ...a, locked: true }
  }
  return { ...progress, tests }
}

/** The first question still open, or -1 once every one is answered. */
export function nextOpen(progress: Progress, lesson: TestLesson): number {
  return lesson.tasks.findIndex((t) => !isAnswered(progress, t.id))
}

export function allAnswered(progress: Progress, lesson: TestLesson): boolean {
  return lesson.tasks.length > 0 && nextOpen(progress, lesson) === -1
}

export function isSubmitted(progress: Progress, lesson: TestLesson): boolean {
  return lesson.tasks.length > 0 && lesson.tasks.every((t) => progress.tests[t.id]?.locked)
}

export function score(progress: Progress, lesson: TestLesson): { correct: number; total: number } {
  const correct = lesson.tasks.filter((t) => chosenOption(progress, t)?.ok).length
  return { correct, total: lesson.tasks.length }
}

/** Ten or more right: worth a little celebration. */
export const CELEBRATE_FROM = 10
