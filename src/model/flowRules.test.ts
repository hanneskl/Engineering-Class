import { describe, expect, it } from 'vitest'
import type { Flow, FlowKind } from './flow'
import { whyCannotConnect, nodeById, reachableFlow } from './flow'
import {
  allReachableFromStart,
  checkFlowAlways,
  decisionBranchesAreLabelled,
  decisionsHaveTwoBranches,
  everyPathEnds,
  isFlowSolved,
  minSteps,
  noPlaceholderText,
  requireKind,
} from './flowRules'
import { flowZielMet } from './types'

/** Terse flow builder: [kind, id, text?] and [from, to, label?]. */
function build(
  nodes: Array<[FlowKind, string] | [FlowKind, string, string]>,
  edges: Array<[string, string] | [string, string, string]>,
): Flow {
  return {
    nodes: nodes.map(([kind, id, text], i) => ({
      id,
      kind,
      text: text ?? id,
      x: 400,
      y: 60 + i * 88,
    })),
    edges: edges.map(([from, to, label], i) => ({
      id: `e${i}`,
      from,
      to,
      ...(label ? { label } : {}),
    })),
  }
}

const codes = (fs: { code: string }[]) => fs.map((f) => f.code).sort()

/** Start → wash → decision ⇄ take/fold, decision → end. */
const laundry = (): Flow =>
  build(
    [
      ['start', 's'],
      ['process', 'open', 'Wäschekorb öffnen'],
      ['decision', 'd', 'Noch Wäsche im Korb?'],
      ['process', 'take', 'Wäschestück nehmen'],
      ['process', 'fold', 'Zusammenlegen'],
      ['end', 'e'],
    ],
    [
      ['s', 'open'],
      ['open', 'd'],
      ['d', 'take', 'Ja'],
      ['d', 'e', 'Nein'],
      ['take', 'fold'],
      ['fold', 'd'],
    ],
  )

describe('a correct flowchart', () => {
  it('passes every always-on rule, loop included', () => {
    expect(checkFlowAlways(laundry())).toEqual([])
  })

  it('counts as solved against its task rules', () => {
    const rules = [
      requireKind('start', 1, true),
      requireKind('end', 1),
      requireKind('decision', 1),
      minSteps(3),
      noPlaceholderText,
      allReachableFromStart,
      everyPathEnds,
    ]
    expect(isFlowSolved(laundry(), rules)).toBe(true)
  })
})

describe('flow rules catch the usual mistakes', () => {
  it('a decision with one branch', () => {
    const flow = laundry()
    flow.edges = flow.edges.filter((e) => !(e.from === 'd' && e.to === 'e'))
    const [f] = decisionsHaveTwoBranches(flow)
    expect(f?.code).toBe('DECISION_BRANCHES')
    expect(f?.message).toContain('1 Pfeil')
    expect(f?.deviceIds).toEqual(['d'])
  })

  it('an unlabelled branch', () => {
    const flow = laundry()
    flow.edges = flow.edges.map((e) => (e.from === 'd' && e.to === 'e' ? { ...e, label: '' } : e))
    expect(codes(decisionBranchesAreLabelled(flow))).toEqual(['BRANCH_UNLABELLED'])
  })

  it('a step that leads nowhere', () => {
    const flow = laundry()
    flow.edges = flow.edges.filter((e) => e.from !== 'fold')
    const [f] = everyPathEnds(flow)
    expect(f?.code).toBe('DEAD_END')
    expect(f?.message).toContain('Zusammenlegen')
  })

  it('a symbol nobody points at', () => {
    const flow = laundry()
    flow.nodes.push({ id: 'lost', kind: 'process', text: 'Bügeln', x: 700, y: 60 })
    const [f] = allReachableFromStart(flow)
    expect(f?.code).toBe('UNREACHABLE')
    expect(f?.deviceIds).toEqual(['lost'])
  })

  it('a box the student never renamed', () => {
    const flow = laundry()
    flow.nodes = flow.nodes.map((n) => (n.id === 'fold' ? { ...n, text: 'Neue Aktion' } : n))
    expect(codes(noPlaceholderText(flow))).toEqual(['PLACEHOLDER_TEXT'])
  })

  it('a second start', () => {
    const flow = laundry()
    flow.nodes.push({ id: 's2', kind: 'start', text: 'Start', x: 700, y: 60 })
    const [f] = requireKind('start', 1, true)(flow)
    expect(f?.code).toBe('TOO_MANY_SYMBOLS')
  })

  it('too few steps', () => {
    expect(minSteps(3)(laundry())).toEqual([])
    expect(minSteps(8)(laundry())[0]?.message).toContain('3 Aktionen')
  })
})

describe('whyCannotConnect', () => {
  const flow = laundry()
  const n = (id: string) => nodeById(flow, id)!

  it('refuses a third arrow out of a decision', () => {
    expect(whyCannotConnect(flow, n('d'), n('open'))).toMatch(/zwei Pfeile/)
  })

  it('refuses a second arrow out of an action', () => {
    expect(whyCannotConnect(flow, n('open'), n('e'))).toMatch(/genau einen Ausgang/)
  })

  it('refuses anything leaving an end', () => {
    expect(whyCannotConnect(flow, n('e'), n('open'))).toMatch(/kein Pfeil mehr heraus/)
  })

  it('refuses an arrow back into the start', () => {
    const bare = build([['start', 's'], ['process', 'a']], [])
    expect(whyCannotConnect(bare, nodeById(bare, 'a')!, nodeById(bare, 's')!)).toMatch(
      /kein Pfeil hinein/,
    )
  })

  it('allows a legitimate arrow', () => {
    const bare = build([['start', 's'], ['process', 'a']], [])
    expect(whyCannotConnect(bare, nodeById(bare, 's')!, nodeById(bare, 'a')!)).toBeNull()
  })
})

describe('reachableFlow follows arrows forwards only', () => {
  it('does not walk backwards up an arrow', () => {
    const flow = build([['start', 's'], ['process', 'a'], ['process', 'b']], [['a', 'b']])
    expect([...reachableFlow(flow, 's')]).toEqual(['s'])
    expect([...reachableFlow(flow, 'a')].sort()).toEqual(['a', 'b'])
  })
})

describe('flow checklist ticks', () => {
  it('stays empty while the canvas is empty', () => {
    const empty: Flow = { nodes: [], edges: [] }
    const ziel = { text: 'Ein Ende', rules: [requireKind('end', 1)] }
    expect(flowZielMet(empty, ziel)).toBe(false)
  })

  it('ticks once the diagram satisfies it', () => {
    expect(flowZielMet(laundry(), { text: 'Ein Ende', rules: [requireKind('end', 1)] })).toBe(true)
  })
})
