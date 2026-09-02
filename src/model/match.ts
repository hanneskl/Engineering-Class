/**
 * M1 — Geräte & Komponenten kennen.
 *
 * The Quali asks this as a Zuordnung: a column of descriptions, a column of
 * components, draw the lines. So that is what the module is — cards that go
 * into places, with three shapes of the same mechanic:
 *
 *   - a place per component, one card each (icon → name, description → device)
 *   - a place per category, several cards each (Client or Server?)
 *   - a place per rank, one card each (LAN … GAN, smallest first)
 *
 * Every card carries the sentence that explains where it belongs, so a card in
 * the wrong place can say why rather than just turn red.
 */

import type { DeviceType } from './plan'
import type { Frage } from './frage'

/** Somewhere a card can go: a component, a category, or a rank. */
export type Platz = {
  id: string
  label: string
  /** Second line, where the place needs one. */
  sub?: string
  /** Drawn instead of a label, for "which device is this?" */
  icon?: DeviceType
  /**
   * A photograph instead of the drawn illustration. Put a file in `public/`
   * and set its path here; the board prefers it over `icon`.
   */
  bild?: string
}

export type Karte = {
  id: string
  text: string
  /** The place it belongs to. */
  platzId: string
  /** Why it belongs there — shown when it is put somewhere else. */
  warum: string
}

export type Zuordnung = {
  id: string
  /** What to do, in one sentence. */
  auftrag: string
  plaetze: Platz[]
  karten: Karte[]
  /** Places take several cards (a category) instead of exactly one. */
  mehrfach?: boolean
  /** Places are ranks: drawn as a numbered ladder. */
  rang?: boolean
}

export type Matches = {
  /** Card id → place id. Cards not in here are still in the pile. */
  gelegt: Record<string, string>
  /** Chosen option per question. */
  answers: Record<string, string>
  /** Evidence the rules read. */
  seen: string[]
}

export const emptyMatches = (): Matches => ({ gelegt: {}, answers: {}, seen: [] })

export function place(m: Matches, karteId: string, platzId: string): Matches {
  return { ...m, gelegt: { ...m.gelegt, [karteId]: platzId } }
}

export function takeBack(m: Matches, karteId: string): Matches {
  const gelegt = { ...m.gelegt }
  delete gelegt[karteId]
  return { ...m, gelegt }
}

/** Cards still in the pile. */
export function offen(z: Zuordnung, m: Matches): Karte[] {
  return z.karten.filter((k) => !m.gelegt[k.id])
}

/** Cards lying in a place, in the order they were dealt. */
export function kartenIn(z: Zuordnung, m: Matches, platzId: string): Karte[] {
  return z.karten.filter((k) => m.gelegt[k.id] === platzId)
}

/** Cards that are placed, but not where they belong. */
export function falsch(z: Zuordnung, m: Matches): Karte[] {
  return z.karten.filter((k) => m.gelegt[k.id] && m.gelegt[k.id] !== k.platzId)
}

/** Everything dealt out — only then is it worth saying what is wrong. */
export function fertig(z: Zuordnung, m: Matches): boolean {
  return offen(z, m).length === 0
}

/**
 * Once the board has been complete, it keeps telling the student what is
 * wrong while they fix it. Without this the red marks and their explanations
 * vanish the moment a card is picked up — exactly when they are being read.
 */
export function geprueft(m: Matches, zuordnungId: string): Matches {
  const mark = `geprueft:${zuordnungId}`
  return m.seen.includes(mark) ? m : { ...m, seen: [...m.seen, mark] }
}

export function wurdeGeprueft(m: Matches, zuordnungId: string): boolean {
  return m.seen.includes(`geprueft:${zuordnungId}`)
}

export function alleRichtig(z: Zuordnung, m: Matches): boolean {
  return fertig(z, m) && falsch(z, m).length === 0
}

export function answerMatch(
  m: Matches,
  frage: Frage,
  option: { text: string; ok: boolean },
): Matches {
  const seen = option.ok && !m.seen.includes(`richtig:${frage.id}`)
    ? [...m.seen, `richtig:${frage.id}`]
    : m.seen
  return { ...m, answers: { ...m.answers, [frage.id]: option.text }, seen }
}

/**
 * Deals the pile in a different order per student, so neighbours cannot copy
 * the sequence — and never in the order the answers are listed in.
 */
export function mischen<T>(karten: T[], seed: number): T[] {
  const out = [...karten]
  let h = (seed >>> 0) || 1
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    const j = h % (i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
