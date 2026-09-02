import { describe, expect, it } from 'vitest'
import {
  FELDER,
  PUBLIC_IP,
  SITES,
  answerTrace,
  cookieId,
  sawAnsicht,
  currentCookie,
  deleteCookie,
  emptyTraces,
  feldWert,
  serverLine,
  sitesPerCookie,
  toggleFeld,
  traceFrage,
  trackerRows,
  visit,
  type Traces,
} from './traces'
import {
  answeredTrace,
  evaluateTraces,
  isTracesSolved,
  markedIdentifying,
  renewedCookie,
  sawAllViews,
  trackedAcross,
  visitedAtLeast,
} from './traceRules'
import { m7Spuren } from '../lessons/m7-spuren'
import { traceTaskRules } from './types'

const SEED = 4711
const clock = (i: number) => new Date(2026, 8, 2, 15, 4, i)

/** Surfs the given sites in order. */
function surf(traces: Traces, ...siteIds: string[]): Traces {
  return siteIds.reduce((t, id, i) => visit(t, SEED, id, clock(i)), traces)
}

/** Answers a question with its correct option. */
function answerRight(traces: Traces, id: string): Traces {
  const frage = traceFrage(id)!
  return answerTrace(traces, frage, frage.optionen.find((o) => o.ok)!)
}

describe('the server log', () => {
  it('shows the public address, never the one from the flat', () => {
    const line = serverLine(surf(emptyTraces(), 'shop').visits[0]!)
    expect(line).toContain(PUBLIC_IP)
    expect(line).not.toContain('192.168.')
  })

  it('writes one line per visit, with page, browser and cookie', () => {
    const t = surf(emptyTraces(), 'shop', 'spiele')
    expect(t.visits).toHaveLength(2)
    const line = serverLine(t.visits[0]!)
    expect(line).toContain('/herren/laufschuhe')
    expect(line).toContain('Chrome')
    expect(line).toContain(`cookie=${cookieId(SEED, 0)}`)
  })

  it('gives every student a different cookie', () => {
    expect(cookieId(1, 0)).not.toBe(cookieId(2, 0))
    expect(cookieId(1, 0)).toHaveLength(8)
  })

  it('ignores a site that does not exist', () => {
    expect(visit(emptyTraces(), SEED, 'gibtsnicht', clock(0)).visits).toHaveLength(0)
  })
})

describe('the tracker', () => {
  it('sees only the sites it is built into', () => {
    const t = surf(emptyTraces(), 'shop', 'schule', 'spiele')
    expect(t.visits).toHaveLength(3)
    // The school page carries no tracker, so it never reaches the ad company.
    expect(trackerRows(t).map((v) => v.siteId)).toEqual(['shop', 'spiele'])
  })

  it('joins different sites under one cookie', () => {
    const t = surf(emptyTraces(), 'suche', 'shop', 'arzt')
    const sites = [...sitesPerCookie(t).values()]
    expect(sites).toHaveLength(1)
    expect(sites[0]!.size).toBe(3)
    expect(trackedAcross(3)({ traces: t })).toEqual([])
  })

  it('starts a new file after the cookie is deleted', () => {
    let t = surf(emptyTraces(), 'suche', 'shop')
    const alt = currentCookie(t, SEED)
    t = deleteCookie(t)
    expect(currentCookie(t, SEED)).not.toBe(alt)
    t = surf(t, 'spiele')
    // Two ids now, and the old rows are still there — deleting is not undoing.
    expect(sitesPerCookie(t).size).toBe(2)
    expect(t.visits).toHaveLength(3)
    expect(renewedCookie()({ traces: t })).toEqual([])
  })

  it('deleting alone is not enough — you have to look at what follows', () => {
    const t = deleteCookie(surf(emptyTraces(), 'suche'))
    expect(renewedCookie()({ traces: t })).toHaveLength(1)
  })
})

describe('marking what identifies you', () => {
  const t0 = surf(emptyTraces(), 'shop')

  it('exactly the IP address and the cookie count', () => {
    const soll = FELDER.filter((f) => f.identifiziert).map((f) => f.id)
    expect(soll).toEqual(['ip', 'cookie'])
    const marked = soll.reduce((t, id) => toggleFeld(t, id), t0)
    expect(markedIdentifying()({ traces: marked })).toEqual([])
  })

  it('a wrong field is answered with what it really says', () => {
    const marked = toggleFeld(toggleFeld(toggleFeld(t0, 'ip'), 'cookie'), 'zeit')
    const finding = markedIdentifying()({ traces: marked })[0]!
    expect(finding.message).toContain('Uhrzeit')
    expect(finding.why).toContain('wann')
  })

  it('missing one is not the same complaint as marking nothing', () => {
    const nichts = markedIdentifying()({ traces: t0 })[0]!
    const halb = markedIdentifying()({ traces: toggleFeld(t0, 'ip') })[0]!
    expect(nichts.message).not.toBe(halb.message)
  })

  it('clicking a field twice takes the mark off again', () => {
    expect(toggleFeld(toggleFeld(t0, 'ip'), 'ip').markiert).toEqual([])
  })

  it('every field has a value to show', () => {
    for (const f of FELDER) expect(feldWert(t0.visits[0]!, f.id)).not.toBe('')
  })
})

describe('the questions', () => {
  it('a wrong answer explains itself and does not count', () => {
    const frage = traceFrage('cookie-ort')!
    const wrong = frage.optionen.find((o) => !o.ok)!
    const t = answerTrace(emptyTraces(), frage, wrong)
    expect(t.answers['cookie-ort']).toBe(wrong.text)
    expect(answeredTrace('cookie-ort', 'm', 'w')({ traces: t })).toHaveLength(1)
    expect(wrong.warum.length).toBeGreaterThan(20)
  })

  it('the cookie lives in the browser', () => {
    const right = traceFrage('cookie-ort')!.optionen.find((o) => o.ok)!
    expect(right.text).toMatch(/Browser/)
  })

  it('every question has exactly one right answer and a reason for each option', () => {
    for (const frage of [
      'ip-name',
      'cookie-ort',
      'weiss-quer',
      'weiss-inhalt',
      'anonym',
      'schutz',
    ]) {
      const f = traceFrage(frage)!
      expect(f.optionen.filter((o) => o.ok), frage).toHaveLength(1)
      for (const o of f.optionen) expect(o.warum.length, `${frage}/${o.text}`).toBeGreaterThan(20)
    }
  })
})

describe('the lesson', () => {
  it('nothing is ticked before the student has surfed', () => {
    const rules = m7Spuren.tasks.flatMap((t) => traceTaskRules(t))
    expect(evaluateTraces({ traces: emptyTraces() }, rules).length).toBe(rules.length)
  })

  it('one site is not three', () => {
    expect(visitedAtLeast(3)({ traces: surf(emptyTraces(), 'shop') })).toHaveLength(1)
  })

  it('can be worked through end to end', () => {
    let traces = surf(emptyTraces(), 'suche', 'shop', 'arzt', 'schule')
    traces = toggleFeld(toggleFeld(traces, 'ip'), 'cookie')
    traces = surf(deleteCookie(traces), 'spiele')
    for (const a of ['server', 'tracker', 'provider']) traces = sawAnsicht(traces, a)
    for (const id of ['ip-name', 'cookie-ort', 'weiss-quer', 'weiss-inhalt', 'anonym', 'schutz']) {
      traces = answerRight(traces, id)
    }
    for (const task of m7Spuren.tasks) {
      expect(isTracesSolved({ traces }, traceTaskRules(task)), task.id).toBe(true)
    }
  })

  it('the three views only count once there is something in them', () => {
    const leer = emptyTraces()
    expect(sawAllViews()({ traces: leer })[0]!.message).toMatch(/Besuch zuerst/)
    let t = surf(leer, 'shop')
    t = sawAnsicht(sawAnsicht(t, 'server'), 'tracker')
    expect(sawAllViews()({ traces: t })[0]!.message).toMatch(/allen drei/)
    expect(sawAllViews()({ traces: sawAnsicht(t, 'provider') })).toEqual([])
  })

  it('every question a task asks for actually exists', () => {
    for (const task of m7Spuren.tasks) {
      for (const id of task.fragen ?? []) expect(traceFrage(id), id).toBeDefined()
    }
  })

  it('there are enough tracked sites for the three-site goal', () => {
    expect(SITES.filter((s) => s.tracker).length).toBeGreaterThanOrEqual(3)
  })
})
