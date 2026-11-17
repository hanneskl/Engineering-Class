import { describe, expect, it } from 'vitest'
import {
  LEGACY_WEEK,
  composeTest,
  logAnswers,
  pickReview,
  schedule,
  startTest,
  weekOf,
  type LogEntry,
} from './review'
import { answer, submit } from './test'
import type { TestLesson, TestTask } from './types'
import { emptyProgress, resetTasks, type Progress } from '../progress/store'

const W = 3000

const dueAfter = (oks: boolean[]) => {
  const log: LogEntry[] = oks.map((ok, i) => ({ id: 'q', week: W + i, ok }))
  const card = schedule(log).get('q')!
  return card.due - (W + oks.length - 1)
}

describe('schedule', () => {
  it('brings a right answer back after 1, 2, 4, 8 and 16 weeks', () => {
    expect([1, 2, 3, 4, 5].map((n) => dueAfter(Array(n).fill(true)))).toEqual([1, 2, 4, 8, 16])
  })

  it('stays at 16 weeks after that — by then the Quali has happened', () => {
    expect(dueAfter(Array(8).fill(true))).toBe(16)
  })

  it('brings a wrong answer back next week, then climbs from 2', () => {
    expect(dueAfter([true, true, true, false])).toBe(1)
    expect(dueAfter([true, true, true, false, true])).toBe(2)
    expect(dueAfter([true, true, true, false, true, true])).toBe(4)
  })
})

describe('pickReview', () => {
  const cards = schedule([
    { id: 'old-wrong', week: W - 5, ok: false },
    { id: 'new-wrong', week: W - 1, ok: false },
    { id: 'old-right', week: W - 5, ok: true },
    { id: 'new-right', week: W - 1, ok: true },
    { id: 'not-due', week: W - 1, ok: true },
    { id: 'not-due', week: W, ok: true },
  ])

  it('takes the longest overdue first, a wrong answer before a right one', () => {
    expect(pickReview(cards, W, new Set(), 1, 10)).toEqual([
      'old-wrong',
      'old-right',
      'new-wrong',
      'new-right',
    ])
  })

  it('stops at the limit, and the rest waits', () => {
    expect(pickReview(cards, W, new Set(), 1, 2)).toEqual(['old-wrong', 'old-right'])
  })

  it('leaves out the test’s own questions', () => {
    expect(pickReview(cards, W, new Set(['old-wrong']), 1, 10)).not.toContain('old-wrong')
  })
})

/* -------------------------------------------------------------- composing */

function question(id: string): TestTask {
  return {
    id,
    frage: {
      id,
      text: `Frage ${id}`,
      optionen: [
        { text: 'richtig', ok: true, warum: 'Weil es stimmt, ganz einfach.' },
        { text: 'falsch', ok: false, warum: 'Weil es nicht stimmt, leider.' },
      ],
    },
  }
}

function test(id: string, count: number): TestLesson {
  return {
    kind: 'test',
    id,
    module: id.toUpperCase(),
    title: id,
    quali: '',
    intro: { heading: '', body: [] },
    tasks: Array.from({ length: count }, (_, i) => question(`${id}-${i + 1}`)),
  }
}

const old = test('a', 15)
const fresh = test('b', 12)
const TESTS = [old, fresh]

/** A student who handed in test a before plans existed: every other answer wrong. */
function veteran(): Progress {
  let p = emptyProgress('Mia')
  old.tasks.forEach((t, i) => {
    p = answer(p, t, i % 2)
  })
  return submit(p, old)
}

describe('composeTest', () => {
  it('leaves a test begun before plans existed as written', () => {
    expect(composeTest(old, TESTS, veteran(), W).tasks).toHaveLength(15)
  })

  it('gives a fresh test ten own questions and ten repeated ones, wrong ones first', () => {
    const composed = composeTest(fresh, TESTS, veteran(), LEGACY_WEEK + 1)
    expect(composed.tasks).toHaveLength(20)
    expect(composed.tasks.slice(0, 10).every((t) => t.id.startsWith('b-'))).toBe(true)
    const repeated = composed.tasks.slice(10)
    expect(repeated.every((t) => t.id.startsWith('b~a-'))).toBe(true)
    // Seven of a's fifteen answers were wrong (a-2, a-4 … a-14); all of them come first.
    expect(repeated.slice(0, 7).map((t) => Number(t.id.split('-')[1]) % 2)).toEqual(Array(7).fill(0))
  })

  it('holds just the own questions for a student with nothing due', () => {
    expect(composeTest(fresh, TESTS, emptyProgress('Ben'), W).tasks).toHaveLength(10)
  })

  it('leaves a test marked ohneWiederholung alone', () => {
    const fixed = { ...fresh, ohneWiederholung: true as const }
    expect(composeTest(fixed, TESTS, veteran(), W).tasks).toHaveLength(12)
  })
})

describe('a test from start to hand-in', () => {
  const week = LEGACY_WEEK + 1

  function handedIn(): Progress {
    let p = startTest(fresh, TESTS, veteran(), week)
    const composed = composeTest(fresh, TESTS, p, week)
    for (const t of composed.tasks) p = answer(p, t, 0)
    return logAnswers(submit(p, composed), composed, week)
  }

  it('freezes what it holds once started, whatever happens to the log', () => {
    const started = startTest(fresh, TESTS, veteran(), week)
    const before = composeTest(fresh, TESTS, started, week).tasks.map((t) => t.id)
    const later = composeTest(fresh, TESTS, { ...started, testLog: [] }, week + 20)
    expect(later.tasks.map((t) => t.id)).toEqual(before)
  })

  it('keeps the first answer of a repeated question untouched', () => {
    const p = handedIn()
    expect(p.tests['a-2']).toEqual({ chosen: 1, locked: true })
    expect(p.tests['b~a-2']).toEqual({ chosen: 0, locked: true })
  })

  it('logs every answer under its original id, so a fixed one moves up the ladder', () => {
    const p = handedIn()
    expect(p.testLog).toHaveLength(20)
    expect(p.testLog.find((e) => e.id === 'a-2')).toEqual({ id: 'a-2', week, ok: true })
    // Wrong before, right now: back after two weeks, not one.
    expect(schedule(p.testLog.concat({ id: 'a-2', week: LEGACY_WEEK, ok: false })).get('a-2')!.due).toBe(
      week + 2,
    )
  })

  it('is drawn up afresh after a reset, with the history kept', () => {
    const p = handedIn()
    const ids = composeTest(fresh, TESTS, p, week).tasks.map((t) => t.id)
    const reset = resetTasks(p, ids)
    expect(reset.testPlans.b).toBeUndefined()
    expect(reset.testLog).toHaveLength(20)
  })
})

describe('weekOf', () => {
  it('counts Monday to Sunday as one week', () => {
    expect(weekOf(new Date(2026, 10, 16))).toBe(weekOf(new Date(2026, 10, 22)))
    expect(weekOf(new Date(2026, 10, 23))).toBe(weekOf(new Date(2026, 10, 16)) + 1)
  })
})
