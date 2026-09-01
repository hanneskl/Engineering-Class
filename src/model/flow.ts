/**
 * Flussdiagramme (Aktivitätsdiagramme).
 *
 * The Quali asks for these every year — "Erstelle ein Flussdiagramm zum
 * morgendlichen Zähneputzen" was worth 3 points in 2026, and the 2022 and
 * 2023 papers gave 7 and 9 points for one. The symbols follow the class
 * material: Start, Aktion, Entscheidung, Ende.
 */

export type FlowKind = 'start' | 'process' | 'decision' | 'end'

export type FlowNode = {
  id: string
  kind: FlowKind
  /** What the box says. Start and end nodes carry a fixed label. */
  text: string
  x: number
  y: number
}

export type FlowEdge = {
  id: string
  from: string
  to: string
  /** "Ja" / "Nein" on the two branches out of a decision. */
  label?: string
}

export type Flow = {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export type FlowKindSpec = {
  label: string
  /** Explanation shown in the inspector — this is the M-Flow teaching content. */
  erklaerung: string
  /** How many arrows may leave this symbol. */
  maxOut: number
  /** Whether the student writes the text themselves. */
  editableText: boolean
  defaultText: string
}

export const FLOW_KINDS: Record<FlowKind, FlowKindSpec> = {
  start: {
    label: 'Start',
    erklaerung:
      'Jedes Flussdiagramm fängt genau einmal an. Aus dem Start geht ein Pfeil heraus, keiner hinein.',
    maxOut: 1,
    editableText: false,
    defaultText: 'Start',
  },
  process: {
    label: 'Aktion',
    erklaerung:
      'Ein Schritt, der ausgeführt wird — zum Beispiel "Zahnpasta auftragen". Aus einer Aktion geht genau ein Pfeil heraus.',
    maxOut: 1,
    editableText: true,
    defaultText: 'Neue Aktion',
  },
  decision: {
    label: 'Entscheidung',
    erklaerung:
      'Eine Frage, die mit Ja oder Nein beantwortet wird — zum Beispiel "Sind die Zähne sauber?". Aus einer Entscheidung gehen genau zwei Pfeile heraus.',
    maxOut: 2,
    editableText: true,
    defaultText: 'Bedingung?',
  },
  end: {
    label: 'Ende',
    erklaerung:
      'Hier ist das Diagramm zu Ende. In ein Ende gehen Pfeile hinein, aber keiner heraus.',
    maxOut: 0,
    editableText: false,
    defaultText: 'Ende',
  },
}

export const emptyFlow = (): Flow => ({ nodes: [], edges: [] })

let counter = 0
export function newFlowId(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

export function makeNode(kind: FlowKind, x: number, y: number): FlowNode {
  return { id: newFlowId(kind), kind, text: FLOW_KINDS[kind].defaultText, x, y }
}

export function nodeById(flow: Flow, id: string): FlowNode | undefined {
  return flow.nodes.find((n) => n.id === id)
}

export function outgoing(flow: Flow, id: string): FlowEdge[] {
  return flow.edges.filter((e) => e.from === id)
}

export function incoming(flow: Flow, id: string): FlowEdge[] {
  return flow.edges.filter((e) => e.to === id)
}

export function removeNode(flow: Flow, id: string): Flow {
  return {
    nodes: flow.nodes.filter((n) => n.id !== id),
    edges: flow.edges.filter((e) => e.from !== id && e.to !== id),
  }
}

export function cloneFlow(flow: Flow): Flow {
  return {
    nodes: flow.nodes.map((n) => ({ ...n })),
    edges: flow.edges.map((e) => ({ ...e })),
  }
}

/** Everything reachable by following arrows forwards from `start`. */
export function reachableFlow(flow: Flow, start: string): Set<string> {
  const seen = new Set([start])
  const queue = [start]
  while (queue.length) {
    const current = queue.shift()!
    for (const e of outgoing(flow, current)) {
      if (!seen.has(e.to)) {
        seen.add(e.to)
        queue.push(e.to)
      }
    }
  }
  return seen
}

/** Why an arrow cannot be drawn — null when it can. */
export function whyCannotConnect(flow: Flow, from: FlowNode, to: FlowNode): string | null {
  if (from.id === to.id) {
    return 'Ein Pfeil von einem Symbol zu sich selbst ergibt keinen Sinn.'
  }
  if (flow.edges.some((e) => e.from === from.id && e.to === to.id)) {
    return 'Dieser Pfeil existiert schon.'
  }
  const spec = FLOW_KINDS[from.kind]
  if (spec.maxOut === 0) {
    return 'Aus einem Ende geht kein Pfeil mehr heraus — hier ist das Diagramm fertig.'
  }
  if (outgoing(flow, from.id).length >= spec.maxOut) {
    return spec.maxOut === 1
      ? `Aus "${from.text}" geht schon ein Pfeil heraus. Eine ${spec.label} hat genau einen Ausgang.`
      : `Aus "${from.text}" gehen schon zwei Pfeile heraus — einer für Ja, einer für Nein.`
  }
  if (to.kind === 'start') {
    return 'In den Start geht kein Pfeil hinein. Er ist der Anfang.'
  }
  return null
}
