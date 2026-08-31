import { type Plan, linksOf, otherEnd } from './plan'

/** Graph helpers over the plan. Kept separate from the rules that judge it. */

export function neighbours(plan: Plan, id: string): string[] {
  return linksOf(plan, id).map((l) => otherEnd(l, id))
}

/** Every device reachable from `start`, including `start` itself. */
export function reachableFrom(plan: Plan, start: string): Set<string> {
  const seen = new Set<string>([start])
  const queue = [start]
  while (queue.length) {
    const current = queue.shift()!
    for (const next of neighbours(plan, current)) {
      if (!seen.has(next)) {
        seen.add(next)
        queue.push(next)
      }
    }
  }
  return seen
}

/** Shortest hop path between two devices, or null when unreachable. */
export function pathBetween(plan: Plan, from: string, to: string): string[] | null {
  if (from === to) return [from]
  const previous = new Map<string, string>()
  const seen = new Set([from])
  const queue = [from]

  while (queue.length) {
    const current = queue.shift()!
    for (const next of neighbours(plan, current)) {
      if (seen.has(next)) continue
      seen.add(next)
      previous.set(next, current)
      if (next === to) {
        const path = [to]
        let step = to
        while (step !== from) {
          step = previous.get(step)!
          path.unshift(step)
        }
        return path
      }
      queue.push(next)
    }
  }
  return null
}

/** Connected components, so an isolated island can be reported as one group. */
export function components(plan: Plan): string[][] {
  const unvisited = new Set(plan.devices.map((d) => d.id))
  const groups: string[][] = []
  while (unvisited.size) {
    const start = unvisited.values().next().value as string
    const group = reachableFrom(plan, start)
    for (const id of group) unvisited.delete(id)
    groups.push([...group])
  }
  return groups
}
