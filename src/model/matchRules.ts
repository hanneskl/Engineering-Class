import type { Finding } from './rules'
import { alleRichtig, falsch, fertig, offen, type Matches, type Zuordnung } from './match'

/**
 * Rules over a Zuordnung. Deliberately quiet about *which* card is wrong until
 * every card has been dealt: naming the mistake after the first placement would
 * turn the exercise into guessing one card at a time.
 */

export type MatchState = { matches: Matches }
export type MatchRule = (state: MatchState) => Finding[]

function miss(code: string, message: string, why: string): Finding[] {
  return [{ code, message, why, deviceIds: [] }]
}

/** Every card out of the pile. */
export function allePlatziert(z: Zuordnung): MatchRule {
  return ({ matches }) => {
    const rest = offen(z, matches).length
    return rest === 0
      ? []
      : miss(
          'MATCH_OFFEN',
          rest === 1
            ? 'Eine Karte liegt noch unten.'
            : `${rest} Karten liegen noch unten.`,
          'Klick eine Karte an und dann den Platz, an den sie gehört.',
        )
  }
}

/** Every card in the right place — checked only once they are all dealt. */
export function alleRichtigZugeordnet(z: Zuordnung): MatchRule {
  return ({ matches }) => {
    if (alleRichtig(z, matches)) return []
    if (!fertig(z, matches)) {
      return miss(
        'MATCH_UNVOLLSTAENDIG',
        'Leg zuerst alle Karten ab.',
        'Erst wenn alles liegt, kannst du sehen, was noch nicht passt.',
      )
    }
    const n = falsch(z, matches).length
    return miss(
      'MATCH_FALSCH',
      n === 1 ? 'Eine Karte liegt noch falsch.' : `${n} Karten liegen noch falsch.`,
      'Die betroffenen Karten sind rot markiert, und unter der Tafel steht bei jeder, wohin sie gehört.',
    )
  }
}

export function answeredMatch(id: string, message: string, why: string): MatchRule {
  return ({ matches }) =>
    matches.seen.includes(`richtig:${id}`) ? [] : miss('MATCH_FRAGE', message, why)
}

export function evaluateMatch(state: MatchState, rules: MatchRule[]): Finding[] {
  return rules.flatMap((rule) => rule(state))
}

export function isMatchSolved(state: MatchState, rules: MatchRule[]): boolean {
  return evaluateMatch(state, rules).length === 0
}
