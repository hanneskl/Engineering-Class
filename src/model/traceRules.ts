import type { Finding } from './rules'
import { FELDER, sitesPerCookie, type Traces } from './traces'

/**
 * Rules over the trail the student left. Like the console and walk rules
 * (ARCHITECTURE.md §6) these judge what was done, not what was drawn.
 */

export type TraceState = { traces: Traces }
export type TraceRule = (state: TraceState) => Finding[]

function miss(code: string, message: string, why: string): Finding[] {
  return [{ code, message, why, deviceIds: [] }]
}

export function visitedAtLeast(n: number): TraceRule {
  return ({ traces }) => {
    const sites = new Set(traces.visits.map((v) => v.siteId)).size
    return sites >= n
      ? []
      : miss(
          'TRACE_VISITS',
          `Besuch mindestens ${n} verschiedene Seiten.`,
          'Jeder Besuch schreibt eine Zeile ins Log — erst mehrere Zeilen ergeben ein Bild.',
        )
  }
}

/** One cookie id seen on at least this many different sites. */
export function trackedAcross(n: number): TraceRule {
  return ({ traces }) => {
    const best = Math.max(0, ...[...sitesPerCookie(traces).values()].map((s) => s.size))
    return best >= n
      ? []
      : miss(
          'TRACE_TRACKER',
          `Sorg dafür, dass derselbe Cookie auf ${n} verschiedenen Seiten auftaucht.`,
          'Nicht jede Seite hat einen Tracker eingebaut — probier mehrere aus und schau ins Tracker-Log.',
        )
  }
}

/**
 * Marked exactly the two fields that lead back to a person. Anything else is
 * answered with what that field really says, rather than a red cross.
 */
export function markedIdentifying(): TraceRule {
  return ({ traces }) => {
    const soll = FELDER.filter((f) => f.identifiziert).map((f) => f.id)
    const fehlt = soll.filter((id) => !traces.markiert.includes(id))
    const zuviel = traces.markiert.filter((id) => !soll.includes(id))
    if (!fehlt.length && !zuviel.length) return []
    if (!traces.markiert.length) {
      return miss(
        'TRACE_FELDER',
        'Markier im Log die Angaben, die zu dir führen.',
        'Klick die Felder an, die verraten, wer da war — nicht die, die sagen wann oder was.',
      )
    }
    if (zuviel.length) {
      const feld = FELDER.find((f) => f.id === zuviel[0])!
      return miss(
        'TRACE_FELDER',
        `"${feld.label}" führt nicht direkt zu dir — klick es wieder ab.`,
        feld.warum,
      )
    }
    return miss(
      'TRACE_FELDER',
      'Da fehlt noch eine Angabe, die dich verrät.',
      'Zwei Felder im Log führen zu dir: eines kennt dein Provider, das andere liegt in deinem Browser.',
    )
  }
}

/** Threw the cookie away and looked at what happened afterwards. */
export function renewedCookie(): TraceRule {
  return ({ traces }) => {
    if (!traces.seen.includes('cookie-geloescht')) {
      return miss(
        'TRACE_COOKIE',
        'Lösch den Cookie und surf danach weiter.',
        'Schau dir vorher an, welche Nummer im Tracker-Log steht — und danach noch einmal.',
      )
    }
    const cookies = new Set(traces.visits.map((v) => v.cookie))
    return cookies.size >= 2
      ? []
      : miss(
          'TRACE_COOKIE',
          'Besuch nach dem Löschen noch eine Seite.',
          'Erst dann siehst du, dass der Tracker dich unter einer neuen Nummer weiterzählt.',
        )
  }
}

/** Read the same afternoon from all three sides. */
export function sawAllViews(): TraceRule {
  return ({ traces }) => {
    if (!traces.visits.length) {
      return miss(
        'TRACE_VIEWS',
        'Besuch zuerst eine Seite, sonst steht in keinem Log etwas.',
        'Die Knöpfe dafür stehen ganz oben.',
      )
    }
    const fehlt = ['server', 'tracker', 'provider'].filter(
      (a) => !traces.seen.includes(`ansicht:${a}`),
    )
    return fehlt.length
      ? miss(
          'TRACE_VIEWS',
          'Schau dir deine Besuche in allen drei Ansichten an.',
          'Oben kannst du zwischen dem Log der Webseite, dem Tracker und deinem Provider umschalten — dieselben Klicks, drei sehr verschiedene Bilder.',
        )
      : []
  }
}

export function answeredTrace(id: string, message: string, why: string): TraceRule {
  return ({ traces }) =>
    traces.seen.includes(`richtig:${id}`) ? [] : miss('TRACE_FRAGE', message, why)
}

export function evaluateTraces(state: TraceState, rules: TraceRule[]): Finding[] {
  return rules.flatMap((rule) => rule(state))
}

export function isTracesSolved(state: TraceState, rules: TraceRule[]): boolean {
  return evaluateTraces(state, rules).length === 0
}
