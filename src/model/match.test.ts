import { describe, expect, it } from 'vitest'
import {
  alleRichtig,
  answerMatch,
  emptyMatches,
  falsch,
  fertig,
  kartenIn,
  mischen,
  offen,
  place,
  takeBack,
  type Matches,
  type Zuordnung,
} from './match'
import {
  allePlatziert,
  alleRichtigZugeordnet,
  answeredMatch,
  evaluateMatch,
  isMatchSolved,
} from './matchRules'
import { m1Geraete } from '../lessons/m1-geraete'
import { matchTaskRules } from './types'

const zuordnungen = m1Geraete.tasks.map((t) => t.zuordnung).filter(Boolean) as Zuordnung[]

/** Puts every card where it belongs. */
function loese(z: Zuordnung, m: Matches = emptyMatches()): Matches {
  return z.karten.reduce((acc, k) => place(acc, k.id, k.platzId), m)
}

describe('the content holds together', () => {
  it('every card belongs to a place that exists', () => {
    for (const z of zuordnungen) {
      const ids = new Set(z.plaetze.map((p) => p.id))
      for (const k of z.karten) expect(ids.has(k.platzId), `${z.id}/${k.id}`).toBe(true)
    }
  })

  it('every place gets exactly one card, unless it is a category', () => {
    for (const z of zuordnungen) {
      if (z.mehrfach) continue
      for (const p of z.plaetze) {
        const n = z.karten.filter((k) => k.platzId === p.id).length
        expect(n, `${z.id}/${p.id}`).toBe(1)
      }
    }
  })

  it('card ids are unique across the whole lesson, since one task may hold several', () => {
    const ids = zuordnungen.flatMap((z) => z.karten.map((k) => k.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every card can say why it belongs where it belongs', () => {
    for (const z of zuordnungen) {
      for (const k of z.karten) expect(k.warum.length, `${z.id}/${k.id}`).toBeGreaterThan(20)
    }
  })

  it('every question has one right answer and a reason for each option', () => {
    for (const task of m1Geraete.tasks) {
      for (const f of task.fragen ?? []) {
        expect(f.optionen.filter((o) => o.ok), f.id).toHaveLength(1)
        for (const o of f.optionen) expect(o.warum.length, `${f.id}/${o.text}`).toBeGreaterThan(20)
      }
    }
  })

  it('uses the exam wording for the components', () => {
    const funktion = zuordnungen.find((z) => z.id === 'z-funktion')!
    const text = funktion.karten.map((k) => k.text).join('\n')
    expect(text).toContain('Verbindet mehrere Geräte in einem kabelgebundenen Netzwerk (LAN) miteinander.')
    expect(text).toContain('Verbindet kabellose Geräte (WLAN) mit einem kabelgebundenen Netzwerk (LAN).')
  })
})

describe('placing cards', () => {
  const z = zuordnungen[0]!

  it('a card leaves the pile when it is put down and comes back when taken up', () => {
    const k = z.karten[0]!
    const m = place(emptyMatches(), k.id, z.plaetze[1]!.id)
    expect(offen(z, m)).not.toContain(k)
    expect(kartenIn(z, m, z.plaetze[1]!.id)).toEqual([k])
    expect(offen(z, takeBack(m, k.id))).toContain(k)
  })

  it('moving a card to another place does not leave a copy behind', () => {
    const k = z.karten[0]!
    let m = place(emptyMatches(), k.id, z.plaetze[1]!.id)
    m = place(m, k.id, z.plaetze[2]!.id)
    expect(kartenIn(z, m, z.plaetze[1]!.id)).toEqual([])
    expect(kartenIn(z, m, z.plaetze[2]!.id)).toEqual([k])
  })

  it('is only finished once the pile is empty', () => {
    const halb = place(emptyMatches(), z.karten[0]!.id, z.karten[0]!.platzId)
    expect(fertig(z, halb)).toBe(false)
    expect(alleRichtig(z, halb)).toBe(false)
    expect(fertig(z, loese(z))).toBe(true)
    expect(alleRichtig(z, loese(z))).toBe(true)
  })

  it('names the misplaced cards, but only once everything is down', () => {
    const swapped = z.karten.reduce(
      (m, k, i) => place(m, k.id, z.karten[i === 0 ? 1 : i === 1 ? 0 : i]!.platzId),
      emptyMatches(),
    )
    expect(falsch(z, swapped)).toHaveLength(2)
  })
})

describe('the rules', () => {
  const z = zuordnungen[0]!

  it('nothing is ticked before a card has been touched', () => {
    const rules = m1Geraete.tasks.flatMap((t) => matchTaskRules(t))
    expect(evaluateMatch({ matches: emptyMatches() }, rules).length).toBe(rules.length)
  })

  it('counts what is still in the pile', () => {
    const m = place(emptyMatches(), z.karten[0]!.id, z.karten[0]!.platzId)
    const finding = allePlatziert(z)({ matches: m })[0]!
    expect(finding.message).toContain(`${z.karten.length - 1} Karten`)
    expect(allePlatziert(z)({ matches: loese(z) })).toEqual([])
  })

  it('holds back the verdict until the last card is down', () => {
    const m = place(emptyMatches(), z.karten[0]!.id, z.plaetze[3]!.id)
    // One card is already wrong, but saying so now would be guessing help.
    expect(alleRichtigZugeordnet(z)({ matches: m })[0]!.message).toMatch(/zuerst alle Karten/)
  })

  it('a single misplaced card is reported in the singular', () => {
    const m = place(loese(z), z.karten[0]!.id, z.karten[1]!.platzId)
    expect(alleRichtigZugeordnet(z)({ matches: m })[0]!.message).toMatch(/^Eine Karte/)
    expect(alleRichtigZugeordnet(z)({ matches: loese(z) })).toEqual([])
  })

  it('a wrong answer is kept but does not count', () => {
    const f = m1Geraete.tasks.find((t) => t.id === 'm1-kabel')!.fragen![0]!
    const wrong = f.optionen.find((o) => !o.ok)!
    const m = answerMatch(emptyMatches(), f, wrong)
    expect(m.answers[f.id]).toBe(wrong.text)
    expect(answeredMatch(f.id, 'm', 'w')({ matches: m })).toHaveLength(1)
    const right = answerMatch(m, f, f.optionen.find((o) => o.ok)!)
    expect(answeredMatch(f.id, 'm', 'w')({ matches: right })).toEqual([])
  })
})

describe('dealing the pile', () => {
  it('shuffles into a different order for different students', () => {
    const z = zuordnungen[1]!
    const a = mischen(z.karten, 1).map((k) => k.id)
    const b = mischen(z.karten, 999).map((k) => k.id)
    expect(a).not.toEqual(b)
    expect([...a].sort()).toEqual([...b].sort())
  })

  it('is stable for one student', () => {
    const z = zuordnungen[1]!
    expect(mischen(z.karten, 42)).toEqual(mischen(z.karten, 42))
  })
})

describe('the lesson can be worked through', () => {
  it('every task can be solved', () => {
    for (const task of m1Geraete.tasks) {
      let m = emptyMatches()
      if (task.zuordnung) m = loese(task.zuordnung, m)
      for (const f of task.fragen ?? []) m = answerMatch(m, f, f.optionen.find((o) => o.ok)!)
      expect(isMatchSolved({ matches: m }, matchTaskRules(task)), task.id).toBe(true)
    }
  })
})
