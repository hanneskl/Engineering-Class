import { describe, expect, it } from 'vitest'
import {
  STEPS,
  answerFrage,
  clearSlot,
  contextFrom,
  emptyWalk,
  frageById,
  framesFor,
  placeStep,
  restart,
  shuffledSteps,
  stationsFor,
  stepTo,
  type Protocol,
  type Walk,
  type WalkContext,
} from './web'
import {
  answered,
  evaluateWeb,
  isWebSolved,
  orderedSteps,
  routeWithStations,
  sawStep,
  visitedSites,
  walkedWith,
} from './webRules'
import { m5Befehle } from '../lessons/m5-befehle'
import { m6Internetseite } from '../lessons/m6-internetseite'
import { webTaskRules } from './types'

const ctxFor = (host = 'google.com', protocol: Protocol = 'http'): WalkContext =>
  contextFrom(m5Befehle.starter, host, protocol)

/** Clicks "Weiter" from the start to the last station. */
function walkThrough(walk: Walk, ctx: WalkContext): Walk {
  return framesFor(ctx).reduce((w, _f, i) => stepTo(w, ctx, i), walk)
}

/** Walks and answers every question along the way correctly. */
function walkAndAnswer(walk: Walk, ctx: WalkContext): Walk {
  return framesFor(ctx).reduce((w, frame, i) => {
    const stepped = stepTo(w, ctx, i)
    const frage = frame.frage ? frageById(frame.frage) : undefined
    if (!frage) return stepped
    const right = frage.optionen.find((o) => o.ok(ctx))!
    return answerFrage(stepped, ctx, frage, right)
  }, walk)
}

describe('the seven steps', () => {
  it('runs through them in order, without skipping one', () => {
    const ns = framesFor(ctxFor()).map((f) => f.n)
    expect(ns[0]).toBe(1)
    expect(ns.at(-1)).toBe(STEPS.length)
    expect(ns).toEqual([...ns].sort((a, b) => a - b))
    expect(new Set(ns).size).toBe(STEPS.length)
  })

  it('asks DNS before it sends the request', () => {
    const frames = framesFor(ctxFor())
    const dns = frames.findIndex((f) => f.at === 'dns')
    const request = frames.findIndex((f) => f.packet?.titel.startsWith('HTTP-Request'))
    expect(dns).toBeGreaterThanOrEqual(0)
    expect(dns).toBeLessThan(request)
  })

  it('the DNS answer carries the IP address, not the page', () => {
    const answer = framesFor(ctxFor()).find((f) => f.packet?.titel === 'DNS-Antwort')!
    expect(answer.packet!.zeilen.join(' ')).toContain('142.250.185.78')
    expect(answer.packet!.zeilen.join(' ')).not.toContain('<html>')
  })
})

describe('http against https', () => {
  const requestOf = (protocol: Protocol) =>
    framesFor(ctxFor('google.com', protocol)).find((f) => f.packet?.titel.startsWith('HTTP-Request'))!
      .packet!

  it('http leaves everything readable', () => {
    const p = requestOf('http')
    expect(p.verschluesselt).toBe(false)
    expect(p.zeilen.join('\n')).toContain('Host: google.com')
  })

  it('https hides the content but keeps the addresses', () => {
    const p = requestOf('https')
    expect(p.verschluesselt).toBe(true)
    const text = p.zeilen.join('\n')
    // The lesson of the module: a router must still be able to route it.
    expect(text).toContain('192.168.178.20')
    expect(text).toContain('142.250.185.78')
    expect(text).not.toContain('Host: google.com')
    expect(text).not.toContain('GET /')
  })

  it('the right answer about eavesdropping flips with the protocol', () => {
    const frage = frageById('mitleser')!
    const bothReadable = frage.optionen[0]!
    const sealed = frage.optionen[1]!
    expect(bothReadable.ok(ctxFor('google.com', 'http'))).toBe(true)
    expect(bothReadable.ok(ctxFor('google.com', 'https'))).toBe(false)
    expect(sealed.ok(ctxFor('google.com', 'https'))).toBe(true)
    // "Gar nichts" is never right: the addresses are always on the outside.
    expect(frage.optionen[2]!.ok(ctxFor('google.com', 'https'))).toBe(false)
  })
})

describe('the route depends on where the page lives', () => {
  it('wikipedia is one station further away than google', () => {
    const wan = (host: string) => stationsFor(ctxFor(host)).filter((s) => s.zone === 'wan').length
    expect(wan('wikipedia.org')).toBe(wan('google.com') + 1)
  })

  it('the boundary question is asked even when the plan has no modem', () => {
    const noModem = {
      devices: m5Befehle.starter.devices.filter((d) => d.type !== 'modem'),
      links: m5Befehle.starter.links,
    }
    const ctx = contextFrom(noModem, 'google.com', 'http')
    expect(framesFor(ctx).some((f) => f.frage === 'grenze')).toBe(true)
  })

  it('falls back to a sensible network when nothing has been drawn yet', () => {
    const ctx = contextFrom(undefined, 'google.com', 'http')
    expect(ctx.deviceIp).toMatch(/^192\.168\./)
    expect(framesFor(ctx).some((f) => f.at === 'server')).toBe(true)
  })
})

describe('what the walk remembers', () => {
  it('nothing is ticked before the student has done anything', () => {
    const rules = m6Internetseite.tasks.flatMap((t) => webTaskRules(t))
    expect(evaluateWeb({ walk: emptyWalk() }, rules).length).toBe(rules.length)
  })

  it('stepping back does not un-see a station', () => {
    const ctx = ctxFor()
    let walk = walkThrough(emptyWalk(), ctx)
    walk = stepTo(walk, ctx, 0)
    expect(sawStep(7, 'x')({ walk })).toEqual([])
    expect(visitedSites(1)({ walk })).toEqual([])
  })

  it('a wrong answer is remembered but does not count', () => {
    const ctx = ctxFor()
    const frage = frageById('dns')!
    const wrong = frage.optionen.find((o) => !o.ok(ctx))!
    const walk = answerFrage(emptyWalk(), ctx, frage, wrong)
    expect(walk.answers['dns']).toBe(wrong.text)
    expect(answered('dns', 'm', 'w')({ walk })).toHaveLength(1)
    const fixed = answerFrage(walk, ctx, frage, frage.optionen.find((o) => o.ok(ctx))!)
    expect(answered('dns', 'm', 'w')({ walk: fixed })).toEqual([])
  })

  it('http and https are counted apart', () => {
    const walk = walkThrough(emptyWalk(), ctxFor('google.com', 'http'))
    expect(walkedWith('http')({ walk })).toEqual([])
    expect(walkedWith('https')({ walk })).toHaveLength(1)
  })

  it('only the longer route satisfies the four-station goal', () => {
    const short = walkThrough(emptyWalk(), ctxFor('google.com'))
    expect(routeWithStations(4)({ walk: short })).toHaveLength(1)
    const long = walkThrough(short, ctxFor('wikipedia.org'))
    expect(routeWithStations(4)({ walk: long })).toEqual([])
    expect(visitedSites(2)({ walk: long })).toEqual([])
  })
})

describe('ordering the seven steps', () => {
  it('an incomplete order and a wrong one get different diagnoses', () => {
    const half = { ...emptyWalk(), order: [1, 2, 3] }
    const wrong = { ...emptyWalk(), order: [1, 3, 2, 4, 5, 6, 7] }
    const a = orderedSteps()({ walk: half })[0]!
    const b = orderedSteps()({ walk: wrong })[0]!
    expect(a.message).not.toBe(b.message)
    expect(b.message).toContain('Platz 2')
    expect(orderedSteps()({ walk: { ...emptyWalk(), order: [1, 2, 3, 4, 5, 6, 7] } })).toEqual([])
  })

  it('taking a card back out leaves the others where they are', () => {
    let order = [1, 2, 3, 4, 5, 6, 7]
    order = clearSlot(order, 1)
    expect(order).toEqual([1, 0, 3, 4, 5, 6, 7])
    // The card goes back into the hole, not onto the end.
    order = placeStep(order, 2)
    expect(order).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('fills the first free slot and never overflows', () => {
    const full = [1, 2, 3, 4, 5, 6, 7]
    expect(placeStep([], 4)).toEqual([4, 0, 0, 0, 0, 0, 0])
    expect(placeStep(full, 1)).toEqual(full)
  })

  it('the shuffled pile is a real permutation and never already sorted', () => {
    for (const seed of [1, 7, 42, 1234, 99999]) {
      const cards = shuffledSteps(seed)
      expect([...cards].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
      expect(cards).not.toEqual([1, 2, 3, 4, 5, 6, 7])
    }
  })
})

describe('the lesson can actually be solved', () => {
  it('walking both sites with both protocols and answering ticks every task', () => {
    let walk = emptyWalk()
    for (const host of ['google.com', 'wikipedia.org']) {
      for (const protocol of ['http', 'https'] as Protocol[]) {
        const ctx = contextFrom(m5Befehle.starter, host, protocol)
        walk = walkAndAnswer(restart(walk, { host, protocol }), ctx)
      }
    }
    walk = { ...walk, order: [1, 2, 3, 4, 5, 6, 7] }
    for (const task of m6Internetseite.tasks) {
      expect(isWebSolved({ walk }, webTaskRules(task)), task.id).toBe(true)
    }
  })
})
