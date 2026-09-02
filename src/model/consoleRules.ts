import type { Finding } from './rules'
import type { Plan } from './plan'
import { deviceById, type DeviceType } from './plan'
import type { EntryKind, Session } from './console'

/**
 * Rules over what the student *did* at the console, not what they drew.
 *
 * This is the behavioural check from ARCHITECTURE.md §6: the diagram cannot
 * show whether anyone ever ran ping, so the session's history is the evidence.
 */

export type ConsoleState = { plan: Plan; session: Session }
export type ConsoleRule = (state: ConsoleState) => Finding[]

const ok = (s: ConsoleState, kind: EntryKind) =>
  s.session.entries.filter((e) => e.kind === kind && e.ok)

export function ranCommand(kind: EntryKind, label: string, why: string): ConsoleRule {
  return (state) => {
    if (ok(state, kind).length) return []
    return [{ code: `RUN_${kind.toUpperCase()}`, message: `Führe ${label} aus.`, why, deviceIds: [] }]
  }
}

/** Pinged something that is a device of this type in their own plan. */
export function pingedType(type: DeviceType, label: string): ConsoleRule {
  return (state) => {
    const hit = ok(state, 'ping').some(
      (e) => e.targetId && deviceById(state.plan, e.targetId)?.type === type,
    )
    if (hit) return []
    return [
      {
        code: 'PING_TYPE',
        message: `Ping noch ${label}.`,
        why: 'Du kannst die IP-Adresse oder den Namen aus deinem Netzwerkplan angeben.',
        deviceIds: [],
      },
    ]
  }
}

/** Reached the outside world — proves the uplink works end to end. */
export function pingedInternet(): ConsoleRule {
  return (state) => {
    const hit = ok(state, 'ping').some((e) => /google\.com|wikipedia\.org/i.test(e.input))
    if (hit) return []
    return [
      {
        code: 'PING_INTERNET',
        message: 'Ping eine Seite im Internet, zum Beispiel google.com.',
        why: 'Vergleich die Zeit mit dem Ping zu deinem Router — der Unterschied ist der Weg durchs Internet.',
        deviceIds: [],
      },
    ]
  }
}

/** Two pings of different speed: the point of the latency model. */
export function comparedTwoPings(): ConsoleRule {
  return (state) => {
    const times = ok(state, 'ping')
      .map((e) => e.ms)
      .filter((ms): ms is number => typeof ms === 'number')
    if (times.length >= 2 && Math.max(...times) - Math.min(...times) >= 5) return []
    return [
      {
        code: 'COMPARE_PINGS',
        message: 'Ping zwei verschieden schnelle Ziele.',
        why: 'Ein Gerät am Kabel antwortet schneller als eines im WLAN, und das Internet braucht am längsten.',
        deviceIds: [],
      },
    ]
  }
}

export function tracedHops(min: number): ConsoleRule {
  return (state) => {
    const best = Math.max(0, ...ok(state, 'tracert').map((e) => e.hops ?? 0))
    if (best >= min) return []
    return [
      {
        code: 'TRACE_HOPS',
        message: `Verfolge eine Route mit mindestens ${min} Stationen.`,
        why: 'tracert google.com zeigt jede Station zwischen dir und dem Server.',
        deviceIds: [],
      },
    ]
  }
}

export function evaluateConsole(state: ConsoleState, rules: ConsoleRule[]): Finding[] {
  return rules.flatMap((rule) => rule(state))
}

export function isConsoleSolved(state: ConsoleState, rules: ConsoleRule[]): boolean {
  return evaluateConsole(state, rules).length === 0
}
