import { describe, expect, it } from 'vitest'
import {
  allAnswered,
  answer,
  chosenOption,
  isSubmitted,
  nextOpen,
  optionOrder,
  score,
  submit,
} from './test'
import { t1TestM1 } from '../lessons/t1-test-m1'
import { emptyProgress, taskProgress } from '../progress/store'

const first = t1TestM1.tasks[0]!
const right = (task: typeof first) => task.frage.optionen.findIndex((o) => o.ok)
const wrong = (task: typeof first) => task.frage.optionen.findIndex((o) => !o.ok)

describe('Test M1 content', () => {
  it('has twelve questions, each with exactly one right option and a warum on every option', () => {
    expect(t1TestM1.tasks).toHaveLength(12)
    for (const t of t1TestM1.tasks) {
      expect(t.frage.optionen.filter((o) => o.ok)).toHaveLength(1)
      for (const o of t.frage.optionen) expect(o.warum.length).toBeGreaterThan(10)
    }
  })

  it('uses globally unique task ids', () => {
    const ids = t1TestM1.tasks.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('answering', () => {
  it('records a pick in tasks and tests', () => {
    const p = answer(emptyProgress('Mia'), first, right(first))
    expect(taskProgress(p, first.id)).toEqual({ solved: true, attempts: 1, hintsUsed: 0 })
    expect(p.tests[first.id]).toEqual({ chosen: right(first) })
  })

  it('lets a pick be changed before the test is handed in', () => {
    const once = answer(emptyProgress('Mia'), first, wrong(first))
    const twice = answer(once, first, right(first))
    expect(chosenOption(twice, first)?.ok).toBe(true)
    expect(taskProgress(twice, first.id).solved).toBe(true)
  })

  it('locks every pick once handed in — a further answer changes nothing', () => {
    let p = emptyProgress('Mia')
    for (const t of t1TestM1.tasks) p = answer(p, t, wrong(t))
    const handedIn = submit(p, t1TestM1)
    expect(isSubmitted(handedIn, t1TestM1)).toBe(true)
    const after = answer(handedIn, first, right(first))
    expect(after).toBe(handedIn)
    expect(chosenOption(after, first)?.ok).toBe(false)
  })

  it('ignores an option index that does not exist', () => {
    const p = emptyProgress('Mia')
    expect(answer(p, first, 99)).toBe(p)
  })
})

describe('score and submission', () => {
  it('counts right answers and tells open from handed in', () => {
    let p = emptyProgress('Mia')
    expect(allAnswered(p, t1TestM1)).toBe(false)
    expect(nextOpen(p, t1TestM1)).toBe(0)
    t1TestM1.tasks.forEach((t, i) => {
      p = answer(p, t, i < 9 ? right(t) : wrong(t))
    })
    expect(allAnswered(p, t1TestM1)).toBe(true)
    expect(isSubmitted(p, t1TestM1)).toBe(false)
    expect(nextOpen(p, t1TestM1)).toBe(-1)
    expect(score(p, t1TestM1)).toEqual({ correct: 9, total: 12 })
    expect(isSubmitted(submit(p, t1TestM1), t1TestM1)).toBe(true)
  })
})

describe('option order', () => {
  it('is a permutation, stable for one seed and different across seeds', () => {
    const a = optionOrder(1, first)
    expect([...a].sort()).toEqual(first.frage.optionen.map((_, i) => i))
    expect(optionOrder(1, first)).toEqual(a)
    const others = [2, 3, 4, 5, 6, 7].map((s) => optionOrder(s, first).join())
    expect(others.some((o) => o !== a.join())).toBe(true)
  })
})
