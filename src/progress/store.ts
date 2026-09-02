/**
 * Progress lives in localStorage, keyed by student name.
 *
 * There is no backend (ARCHITECTURE.md §1), and school computers are shared,
 * so the name is what separates one student's progress from another's on the
 * same browser. Export exists because a shared machine can always be wiped.
 */

import { seedFromName } from '../model/rng'
import type { Plan } from '../model/plan'
import type { Flow } from '../model/flow'
import type { Session } from '../model/console'
import type { Walk } from '../model/web'
import type { Traces } from '../model/traces'
import type { Matches } from '../model/match'

export type TaskProgress = {
  solved: boolean
  attempts: number
  /** How far up the hint ladder they went: 0 = none, 3 = saw the solution. */
  hintsUsed: number
}

export type Progress = {
  studentName: string
  seed: number
  updatedAt: string
  tasks: Record<string, TaskProgress>
  /** Drawn networks, one per build task. */
  plans: Record<string, Plan>
  /** Drawn flowcharts, one per flow task. */
  flows: Record<string, Flow>
  /** Console history, one per console task. */
  sessions: Record<string, Session>
  /** Packet walks, one per web task. */
  walks: Record<string, Walk>
  /** Surfing trails, one per trace task. */
  traces: Record<string, Traces>
  /** Sorted cards, one per match task. */
  matches: Record<string, Matches>
}

const PREFIX = 'netzwerk-trainer:'
const LAST_STUDENT = 'netzwerk-trainer:last-student'

function keyFor(name: string): string {
  return PREFIX + name.trim().toLowerCase()
}

export function emptyProgress(studentName: string): Progress {
  return {
    studentName: studentName.trim(),
    seed: seedFromName(studentName),
    updatedAt: new Date().toISOString(),
    tasks: {},
    plans: {},
    flows: {},
    sessions: {},
    walks: {},
    traces: {},
    matches: {},
  }
}

export function load(studentName: string): Progress {
  try {
    const raw = localStorage.getItem(keyFor(studentName))
    if (!raw) return emptyProgress(studentName)
    const parsed = JSON.parse(raw) as Progress
    // Guard against a half-written or hand-edited entry.
    if (!parsed || typeof parsed !== 'object' || !parsed.tasks) {
      return emptyProgress(studentName)
    }
    return {
      ...emptyProgress(studentName),
      ...parsed,
      tasks: parsed.tasks,
      plans: parsed.plans ?? {},
      flows: parsed.flows ?? {},
      sessions: parsed.sessions ?? {},
      walks: parsed.walks ?? {},
      traces: parsed.traces ?? {},
      matches: parsed.matches ?? {},
    }
  } catch {
    return emptyProgress(studentName)
  }
}

export function save(progress: Progress): void {
  try {
    const next = { ...progress, updatedAt: new Date().toISOString() }
    localStorage.setItem(keyFor(progress.studentName), JSON.stringify(next))
    localStorage.setItem(LAST_STUDENT, progress.studentName)
  } catch {
    // A full or disabled localStorage must not break the lesson.
  }
}

export function lastStudent(): string | null {
  try {
    return localStorage.getItem(LAST_STUDENT)
  } catch {
    return null
  }
}

export function forget(studentName: string): void {
  try {
    localStorage.removeItem(keyFor(studentName))
    if (lastStudent() === studentName) localStorage.removeItem(LAST_STUDENT)
  } catch {
    // Nothing useful to do.
  }
}

export function taskProgress(progress: Progress, taskId: string): TaskProgress {
  return progress.tasks[taskId] ?? { solved: false, attempts: 0, hintsUsed: 0 }
}

export function withTask(
  progress: Progress,
  taskId: string,
  patch: Partial<TaskProgress>,
): Progress {
  const current = taskProgress(progress, taskId)
  return {
    ...progress,
    tasks: { ...progress.tasks, [taskId]: { ...current, ...patch } },
  }
}

/** Summary for one module, used by the progress bars. */
export function moduleStats(
  progress: Progress,
  taskIds: string[],
): { solved: number; total: number; hintsUsed: number } {
  let solved = 0
  let hintsUsed = 0
  for (const id of taskIds) {
    const t = taskProgress(progress, id)
    if (t.solved) solved++
    hintsUsed += t.hintsUsed
  }
  return { solved, total: taskIds.length, hintsUsed }
}

/**
 * Download the progress file. With no dashboard this is how a student's work —
 * including where they needed help — can reach the teacher.
 */
export function exportProgress(progress: Progress): void {
  const blob = new Blob([JSON.stringify(progress, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = progress.studentName.replace(/[^\wäöüÄÖÜß-]+/g, '_')
  a.href = url
  a.download = `netzwerk-trainer-${safeName}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function loadPlan(progress: Progress, taskId: string): Plan | undefined {
  return progress.plans[taskId]
}

export function savePlan(progress: Progress, taskId: string, plan: Plan): Progress {
  return { ...progress, plans: { ...progress.plans, [taskId]: plan } }
}

/** Deep copy, so editing a later task never writes back into an earlier one. */
export function clonePlan(plan: Plan): Plan {
  return {
    devices: plan.devices.map((d) => ({ ...d })),
    links: plan.links.map((l) => ({ ...l })),
  }
}

export function loadFlow(progress: Progress, taskId: string): Flow | undefined {
  return progress.flows[taskId]
}

export function saveFlow(progress: Progress, taskId: string, flow: Flow): Progress {
  return { ...progress, flows: { ...progress.flows, [taskId]: flow } }
}

/** Has the student anything to lose in these tasks? Drives whether Reset shows. */
export function hasProgress(progress: Progress, taskIds: string[]): boolean {
  return taskIds.some((id) => {
    const t = progress.tasks[id]
    const walk = progress.walks[id]
    const trace = progress.traces[id]
    const match = progress.matches[id]
    return Boolean(
      t?.solved ||
        t?.attempts ||
        t?.hintsUsed ||
        progress.plans[id] ||
        progress.flows[id] ||
        progress.sessions[id]?.entries.length ||
        walk?.seen.length ||
        walk?.order.length ||
        trace?.visits.length ||
        trace?.seen.length ||
        (match && Object.keys(match.gelegt).length) ||
        (match && Object.keys(match.answers).length),
    )
  })
}

/**
 * Clears a module back to its untouched state: answers, hints, and any drawn
 * network or flowchart. Only the listed tasks are touched, so resetting one
 * module never disturbs another.
 */
export function resetTasks(progress: Progress, taskIds: string[]): Progress {
  const ids = new Set(taskIds)
  const keep = <T,>(record: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(record).filter(([id]) => !ids.has(id)))
  return {
    ...progress,
    tasks: keep(progress.tasks),
    plans: keep(progress.plans),
    flows: keep(progress.flows),
    sessions: keep(progress.sessions),
    walks: keep(progress.walks),
    traces: keep(progress.traces),
    matches: keep(progress.matches),
  }
}

export function loadSession(progress: Progress, taskId: string): Session | undefined {
  return progress.sessions[taskId]
}

export function saveSession(progress: Progress, taskId: string, session: Session): Progress {
  return { ...progress, sessions: { ...progress.sessions, [taskId]: session } }
}

export function loadMatches(progress: Progress, taskId: string): Matches | undefined {
  return progress.matches[taskId]
}

export function saveMatches(progress: Progress, taskId: string, matches: Matches): Progress {
  return { ...progress, matches: { ...progress.matches, [taskId]: matches } }
}

export function loadTraces(progress: Progress, taskId: string): Traces | undefined {
  return progress.traces[taskId]
}

export function saveTraces(progress: Progress, taskId: string, traces: Traces): Progress {
  return { ...progress, traces: { ...progress.traces, [taskId]: traces } }
}

export function loadWalk(progress: Progress, taskId: string): Walk | undefined {
  return progress.walks[taskId]
}

export function saveWalk(progress: Progress, taskId: string, walk: Walk): Progress {
  return { ...progress, walks: { ...progress.walks, [taskId]: walk } }
}

/**
 * The network the console runs on: whatever the student built in M2, so the
 * addresses in `ipconfig` are the ones they assigned themselves.
 */
export function latestPlan(progress: Progress): Plan | undefined {
  const drawn = Object.values(progress.plans).filter((p) => p.devices.length > 1)
  return drawn.sort((a, b) => b.devices.length - a.devices.length)[0]
}
