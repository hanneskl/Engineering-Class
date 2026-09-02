import type { Finding } from './rules'
import { STEPS, type Protocol, type Walk } from './web'

/**
 * Rules over what the student saw and answered on the walk.
 *
 * Like the console rules (ARCHITECTURE.md §6) this is behavioural evidence:
 * nothing here can be read off a drawing, only off what they actually did.
 */

export type WebState = { walk: Walk }
export type WebRule = (state: WebState) => Finding[]

const saw = (state: WebState, mark: string) => state.walk.seen.includes(mark)

function miss(code: string, message: string, why: string): Finding[] {
  return [{ code, message, why, deviceIds: [] }]
}

/** Reached the given step of the seven. */
export function sawStep(n: number, why: string): WebRule {
  return (state) =>
    saw(state, `schritt:${n}`)
      ? []
      : miss('WEB_STEP', `Geh weiter bis Schritt ${n}: ${STEPS[n - 1]}.`, why)
}

/** Answered one of the questions along the way correctly. */
export function answered(id: string, message: string, why: string): WebRule {
  return (state) => (saw(state, `richtig:${id}`) ? [] : miss('WEB_FRAGE', message, why))
}

/** Was out in the internet once with this protocol. */
export function walkedWith(protocol: Protocol): WebRule {
  return (state) =>
    saw(state, `offen:${protocol}`)
      ? []
      : miss(
          'WEB_PROTO',
          `Schick die Anfrage einmal mit ${protocol} los und geh mit bis ins Internet.`,
          'Oben in der Adresszeile kannst du zwischen http und https umschalten.',
        )
}

/** Called up more than one site: different sites take different routes. */
export function visitedSites(min: number): WebRule {
  return (state) => {
    const ziele = state.walk.seen.filter((m) => m.startsWith('ziel:')).length
    if (ziele >= min) return []
    return miss(
      'WEB_ZIELE',
      min === 1
        ? 'Begleite das Paket weiter, bis es beim Webserver ankommt.'
        : `Ruf ${min} verschiedene Seiten auf und verfolg das Paket jeweils bis zum Webserver.`,
      min === 1
        ? 'Der Webserver ist die letzte Station ganz rechts.'
        : 'Die Auswahl steht oben in der Adresszeile.',
    )
  }
}

/** Followed a route with at least this many stations out in the internet. */
export function routeWithStations(min: number): WebRule {
  return (state) => {
    const best = Math.max(
      0,
      ...state.walk.seen
        .filter((m) => m.startsWith('stationen:'))
        .map((m) => Number(m.split(':')[1])),
    )
    return best >= min
      ? []
      : miss(
          'WEB_STATIONEN',
          `Verfolg einen Weg mit mindestens ${min} Stationen im Internet.`,
          'Nicht jede Seite steht gleich weit weg — manche Wege haben eine Station mehr.',
        )
  }
}

/** The seven steps, put in the right order. */
export function orderedSteps(): WebRule {
  return (state) => {
    const order = state.walk.order
    if (order.length === STEPS.length && order.every((n, i) => n === i + 1)) return []
    if (order.filter((n) => n > 0).length < STEPS.length) {
      return miss(
        'WEB_ORDER',
        'Bring alle sieben Schritte in die richtige Reihenfolge.',
        'Klick die Karten in der Reihenfolge an, in der sie passieren.',
      )
    }
    const firstWrong = order.findIndex((n, i) => n !== i + 1)
    return miss(
      'WEB_ORDER',
      `Die Reihenfolge stimmt noch nicht — schau dir Platz ${firstWrong + 1} an.`,
      'Denk an den Ablauf im Weg oben: erst der Name, dann die Adresse, dann die Seite.',
    )
  }
}

export function evaluateWeb(state: WebState, rules: WebRule[]): Finding[] {
  return rules.flatMap((rule) => rule(state))
}

export function isWebSolved(state: WebState, rules: WebRule[]): boolean {
  return evaluateWeb(state, rules).length === 0
}
