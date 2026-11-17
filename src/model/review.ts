/**
 * Spaced repetition for the tests — a Leitner box per student and question.
 *
 * A test a student starts is no longer just its own questions: up to ten of
 * them (the direct repetition of last week's lesson), plus up to ten due
 * questions from every earlier test. A question answered right comes back
 * after 1, then 2, 4, 8 and 16 weeks; answered wrong, it comes back the next
 * week and climbs the ladder again from 2. After 16 weeks it stays at 16 —
 * by then the Quali has happened.
 *
 * Only an answer log is stored. Box and due week are always recomputed from
 * it, so the rules can change without migrating anyone's progress.
 */

import type { TestLesson, TestTask } from './types'
import { rngFor, shuffle } from './rng'
import type { Progress } from '../progress/store'

/** Weeks until a question is due again, by how many times in a row it was right. */
export const INTERVALS = [1, 2, 4, 8, 16] as const

/** Questions from the test itself, and from earlier tests. Twenty in all. */
export const OWN_QUESTIONS = 10
export const REVIEW_QUESTIONS = 10

/** One answer in a handed-in test. `id` is the original question id. */
export type LogEntry = { id: string; week: number; ok: boolean }

/** What a started test is made of, frozen so it cannot change under the student. */
export type TestPlan = { week: number; own: string[]; review: string[] }

/** Calendar weeks counted from a Monday: tests are scheduled by school week, not by day. */
export function weekOf(date: Date): number {
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((day - Date.UTC(1970, 0, 5)) / (7 * 86_400_000))
}

/**
 * Answers given before this existed carry no date. They count as given the
 * week before it shipped, so every one of them is due straight away and the
 * wrong ones are served first.
 */
export const LEGACY_WEEK = weekOf(new Date(2026, 10, 16)) - 1

export type Card = {
  id: string
  /** Week from which the question may come back. */
  due: number
  /** Whether the latest answer was right. */
  lastOk: boolean
}

/** Folds the answer log, oldest first, into one card per question. */
export function schedule(log: readonly LogEntry[]): Map<string, Card> {
  const cards = new Map<string, Card & { step: number }>()
  for (const entry of [...log].sort((a, b) => a.week - b.week)) {
    const before = cards.get(entry.id)
    // Wrong resets to the one-week step; right climbs one step, from -1 for a first answer.
    const step = entry.ok ? Math.min((before?.step ?? -1) + 1, INTERVALS.length - 1) : 0
    cards.set(entry.id, { id: entry.id, step, due: entry.week + INTERVALS[step]!, lastOk: entry.ok })
  }
  return cards
}

/**
 * The due questions to repeat, most urgent first: the longest overdue, a
 * wrong last answer before a right one, and a per-student shuffle for the rest.
 */
export function pickReview(
  cards: ReadonlyMap<string, Card>,
  week: number,
  exclude: ReadonlySet<string>,
  seed: number,
  count: number,
): string[] {
  const due = [...cards.values()].filter((card) => card.due <= week && !exclude.has(card.id))
  const order = new Map(shuffle(rngFor(seed, `review-${week}`), due.map((c) => c.id)).map((id, i) => [id, i]))
  return due
    .sort(
      (a, b) =>
        a.due - b.due ||
        Number(a.lastOk) - Number(b.lastOk) ||
        order.get(a.id)! - order.get(b.id)!,
    )
    .slice(0, count)
    .map((card) => card.id)
}

/** A repeated question gets an id of its own, so its first answer stays untouched. */
export const REVIEW_MARK = '~'
export const reviewId = (testId: string, questionId: string) => `${testId}${REVIEW_MARK}${questionId}`
export const originalId = (taskId: string) => taskId.slice(taskId.indexOf(REVIEW_MARK) + 1)

/**
 * The answer log, plus the answers of tests handed in before plans existed.
 * A test with a plan logged its own answers when it was handed in.
 */
export function fullLog(progress: Progress, tests: readonly TestLesson[]): LogEntry[] {
  const legacy: LogEntry[] = []
  for (const test of tests) {
    if (progress.testPlans[test.id]) continue
    for (const task of test.tasks) {
      const answer = progress.tests[task.id]
      if (!answer?.locked) continue
      const ok = task.frage.optionen[answer.chosen]?.ok ?? false
      legacy.push({ id: task.id, week: LEGACY_WEEK, ok })
    }
  }
  return [...legacy, ...progress.testLog]
}

/** What this student's test would hold if they started it this week. */
export function draftPlan(
  lesson: TestLesson,
  tests: readonly TestLesson[],
  progress: Progress,
  week: number,
): TestPlan {
  const ownIds = lesson.tasks.map((t) => t.id)
  const own =
    ownIds.length <= OWN_QUESTIONS
      ? ownIds
      : (() => {
          const picked = new Set(shuffle(rngFor(progress.seed, `own-${lesson.id}`), ownIds).slice(0, OWN_QUESTIONS))
          return ownIds.filter((id) => picked.has(id))
        })()
  const cards = schedule(fullLog(progress, tests))
  const review = pickReview(cards, week, new Set(ownIds), progress.seed, REVIEW_QUESTIONS)
  return { week, own, review }
}

/**
 * The test as this student sees it. Tests marked `ohneWiederholung` stay as
 * written, and so does one already begun before plans existed.
 */
export function composeTest(
  lesson: TestLesson,
  tests: readonly TestLesson[],
  progress: Progress,
  week: number,
): TestLesson {
  if (lesson.ohneWiederholung) return lesson
  let plan = progress.testPlans[lesson.id]
  if (!plan) {
    if (lesson.tasks.some((t) => progress.tests[t.id])) return lesson
    plan = draftPlan(lesson, tests, progress, week)
  }

  const bank = new Map(tests.flatMap((t) => t.tasks).map((task) => [task.id, task]))
  const own = lesson.tasks.filter((task) => plan.own.includes(task.id))
  const review = plan.review.flatMap((id): TestTask[] => {
    const task = bank.get(id)
    if (!task) return []
    const taskId = reviewId(lesson.id, id)
    return [{ ...task, id: taskId, frage: { ...task.frage, id: taskId } }]
  })
  return { ...lesson, tasks: [...own, ...review] }
}

/** Freezes the test the moment the student starts it. */
export function startTest(
  lesson: TestLesson,
  tests: readonly TestLesson[],
  progress: Progress,
  week: number,
): Progress {
  if (lesson.ohneWiederholung || progress.testPlans[lesson.id]) return progress
  if (lesson.tasks.some((t) => progress.tests[t.id])) return progress
  const plan = draftPlan(lesson, tests, progress, week)
  return { ...progress, testPlans: { ...progress.testPlans, [lesson.id]: plan } }
}

/** Every answer of a handed-in test goes into the log, under its original question id. */
export function logAnswers(progress: Progress, composed: TestLesson, week: number): Progress {
  if (!progress.testPlans[composed.id]) return progress
  const entries = composed.tasks.flatMap((task): LogEntry[] => {
    const answer = progress.tests[task.id]
    if (!answer) return []
    return [{ id: originalId(task.id), week, ok: task.frage.optionen[answer.chosen]?.ok ?? false }]
  })
  return { ...progress, testLog: [...progress.testLog, ...entries] }
}
