/**
 * Progress lives in localStorage, keyed by student name.
 *
 * There is no backend (ARCHITECTURE.md §1), and school computers are shared,
 * so the name is what separates one student's progress from another's on the
 * same browser. Export exists because a shared machine can always be wiped.
 */

import { seedFromName } from '../model/rng'

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
    return { ...emptyProgress(studentName), ...parsed, tasks: parsed.tasks }
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
