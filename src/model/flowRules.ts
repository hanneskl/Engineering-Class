import type { Finding } from './rules'
import {
  FLOW_KINDS,
  type Flow,
  type FlowKind,
  incoming,
  outgoing,
  reachableFlow,
} from './flow'

/**
 * Rules for flowcharts. Same shape as the network rules: never a bare "falsch",
 * always a German sentence naming the symbol at fault so the canvas can
 * highlight it.
 */

export type FlowRule = (flow: Flow) => Finding[]

const quote = (t: string) => `"${t}"`

export function requireKind(kind: FlowKind, min: number, exact = false): FlowRule {
  return (flow) => {
    const have = flow.nodes.filter((n) => n.kind === kind).length
    const spec = FLOW_KINDS[kind]
    if (exact && have > min) {
      return [
        {
          code: 'TOO_MANY_SYMBOLS',
          message: `Du hast ${have} × ${spec.label}, erlaubt ist nur ${min}.`,
          why: spec.erklaerung,
          deviceIds: flow.nodes.filter((n) => n.kind === kind).map((n) => n.id),
        },
      ]
    }
    if (have >= min) return []
    return [
      {
        code: 'MISSING_SYMBOL',
        message:
          min === 1
            ? `Es fehlt noch ein Symbol "${spec.label}".`
            : `Du brauchst ${min} × ${spec.label}, hast aber ${have}.`,
        why: spec.erklaerung,
        deviceIds: [],
      },
    ]
  }
}

/** Every symbol must be on a path that starts at Start. */
export const allReachableFromStart: FlowRule = (flow) => {
  const start = flow.nodes.find((n) => n.kind === 'start')
  if (!start) return []
  const reachable = reachableFlow(flow, start.id)
  const stranded = flow.nodes.filter((n) => !reachable.has(n.id))
  if (!stranded.length) return []
  return [
    {
      code: 'UNREACHABLE',
      message:
        stranded.length === 1
          ? `${quote(stranded[0]!.text)} hängt nicht am Ablauf.`
          : `${stranded.length} Symbole hängen nicht am Ablauf.`,
      why: 'Vom Start aus muss man jedem Symbol über Pfeile folgen können. Zieh einen Pfeil dorthin.',
      deviceIds: stranded.map((n) => n.id),
    },
  ]
}

/** No arrow may lead nowhere: only an Ende is allowed to have no exit. */
export const everyPathEnds: FlowRule = (flow) => {
  const dangling = flow.nodes.filter(
    (n) => n.kind !== 'end' && outgoing(flow, n.id).length === 0,
  )
  if (!dangling.length) return []
  return [
    {
      code: 'DEAD_END',
      message:
        dangling.length === 1
          ? `Nach ${quote(dangling[0]!.text)} geht es nicht weiter.`
          : `Bei ${dangling.length} Symbolen geht es nicht weiter.`,
      why: 'Jeder Weg im Diagramm muss irgendwann bei einem Ende ankommen. Nur das Ende selbst hat keinen Pfeil nach draußen.',
      deviceIds: dangling.map((n) => n.id),
    },
  ]
}

/** A decision without both branches is the classic missing half. */
export const decisionsHaveTwoBranches: FlowRule = (flow) =>
  flow.nodes
    .filter((n) => n.kind === 'decision')
    .filter((n) => outgoing(flow, n.id).length !== 2)
    .map((n) => {
      const count = outgoing(flow, n.id).length
      return {
        code: 'DECISION_BRANCHES',
        message: `${quote(n.text)} hat ${count} ${count === 1 ? 'Pfeil' : 'Pfeile'} statt zwei.`,
        why: 'Aus einer Entscheidung gehen immer zwei Wege: einer für Ja, einer für Nein.',
        deviceIds: [n.id],
      }
    })

/** …and both branches must say which is which. */
export const decisionBranchesAreLabelled: FlowRule = (flow) =>
  flow.nodes
    .filter((n) => n.kind === 'decision')
    .filter((n) => {
      const out = outgoing(flow, n.id)
      return out.length === 2 && out.some((e) => !e.label?.trim())
    })
    .map((n) => ({
      code: 'BRANCH_UNLABELLED',
      message: `Bei ${quote(n.text)} fehlt die Beschriftung Ja oder Nein.`,
      why: 'Ohne Beschriftung weiß niemand, welcher Pfeil bei welcher Antwort gilt. Klick den Pfeil im Feld rechts an.',
      deviceIds: [n.id],
    }))

/** Nothing points into the start. */
export const startHasNoIncoming: FlowRule = (flow) =>
  flow.nodes
    .filter((n) => n.kind === 'start' && incoming(flow, n.id).length > 0)
    .map((n) => ({
      code: 'START_HAS_INCOMING',
      message: 'In den Start zeigt ein Pfeil hinein.',
      why: 'Der Start ist der Anfang des Ablaufs. Pfeile gehen nur aus ihm heraus.',
      deviceIds: [n.id],
    }))

/** Boxes the student never renamed. */
export const noPlaceholderText: FlowRule = (flow) => {
  const untouched = flow.nodes.filter(
    (n) => FLOW_KINDS[n.kind].editableText && n.text === FLOW_KINDS[n.kind].defaultText,
  )
  if (!untouched.length) return []
  return [
    {
      code: 'PLACEHOLDER_TEXT',
      message:
        untouched.length === 1
          ? 'Ein Symbol hat noch keinen eigenen Text.'
          : `${untouched.length} Symbole haben noch keinen eigenen Text.`,
      why: 'Schreib hinein, was an dieser Stelle passiert — zum Beispiel "Zahnbürste nehmen".',
      deviceIds: untouched.map((n) => n.id),
    },
  ]
}

/** Rules that hold for any flowchart, checked live while drawing. */
export const FLOW_ALWAYS: FlowRule[] = [
  startHasNoIncoming,
  decisionsHaveTwoBranches,
  decisionBranchesAreLabelled,
  everyPathEnds,
]

export function checkFlowAlways(flow: Flow): Finding[] {
  return FLOW_ALWAYS.flatMap((rule) => rule(flow))
}

export function evaluateFlow(flow: Flow, rules: FlowRule[]): Finding[] {
  return [...checkFlowAlways(flow), ...rules.flatMap((rule) => rule(flow))]
}

export function isFlowSolved(flow: Flow, rules: FlowRule[]): boolean {
  return flow.nodes.length > 0 && evaluateFlow(flow, rules).length === 0
}

/** At least `min` action boxes, so a diagram cannot be trivially short. */
export function minSteps(min: number): FlowRule {
  return (flow) => {
    const steps = flow.nodes.filter((n) => n.kind === 'process').length
    if (steps >= min) return []
    return [
      {
        code: 'TOO_FEW_STEPS',
        message: `Du hast erst ${steps} ${steps === 1 ? 'Aktion' : 'Aktionen'}, gebraucht werden ${min}.`,
        why: 'Zerleg den Ablauf in einzelne Schritte. Jeder Handgriff ist eine eigene Aktion.',
        deviceIds: [],
      },
    ]
  }
}
