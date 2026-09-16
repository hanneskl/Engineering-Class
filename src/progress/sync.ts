/**
 * Pushes task-level progress (solved/attempts/hintsUsed) to Supabase, so a
 * teacher watching `task_progress` sees the same checklist state the student
 * sees locally. Only that summary ever leaves the browser — the documents
 * themselves (a drawn network, a filled-in spreadsheet, a console session)
 * stay exactly where they've always lived, in `localStorage`.
 *
 * Called from App.tsx's `update()`, the one chokepoint every lesson view's
 * `onProgress` already flows through. `onProgress` fires on every keystroke,
 * but `Progress.tasks` itself only changes on a hint click, a quiz attempt,
 * or a solve-flip — so diffing the old and new snapshot here is enough; no
 * timer-based debounce is needed on top of that.
 *
 * Deliberate scope cut: this only ever syncs going forward from the moment
 * a student's session starts tracking a baseline. A student with history
 * from before this shipped isn't backfilled — not a real concern yet, since
 * nobody has used the trainer under this code — but worth knowing if it ever
 * needs revisiting.
 */

import { moduleByTaskId } from '../lessons'
import { backend } from '../backend/client'
import type { Progress, TaskProgress } from './store'

function changed(prev: TaskProgress | undefined, next: TaskProgress): boolean {
  return (
    !prev ||
    prev.solved !== next.solved ||
    prev.attempts !== next.attempts ||
    prev.hintsUsed !== next.hintsUsed
  )
}

export async function pushChangedTaskProgress(
  seed: number,
  prevTasks: Record<string, TaskProgress>,
  nextTasks: Record<string, TaskProgress>,
): Promise<void> {
  if (!backend) return

  const changedIds = Object.entries(nextTasks)
    .filter(([id, task]) => changed(prevTasks[id], task))
    .map(([id]) => id)
  if (changedIds.length === 0) return

  try {
    const { data } = await backend.auth.getSession()
    if (!data.session) return
    const studentId = data.session.user.id
    const lessonOf = moduleByTaskId(seed)

    const rows = changedIds.flatMap((taskId) => {
      const lessonId = lessonOf.get(taskId)
      const task = nextTasks[taskId]
      // Every real task id comes from LESSONS, so this should never miss —
      // skip rather than write a row `task_progress` can't make sense of.
      if (!lessonId || !task) return []
      return [
        {
          student_id: studentId,
          lesson_id: lessonId,
          task_id: taskId,
          solved: task.solved,
          attempts: task.attempts,
          hints_used: task.hintsUsed,
        },
      ]
    })
    if (rows.length === 0) return

    await backend.from('task_progress').upsert(rows)
  } catch {
    // Offline, or Supabase unreachable — the trainer still works locally,
    // and the next change will retry with a wider diff.
  }
}

const SNAPSHOT_DEBOUNCE_MS = 1500
let snapshotTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Pushes the student's *whole* local Progress — not just the task summary
 * above — so signing in on a different device can restore exactly what they
 * left off with (a drawn network, a filled-in spreadsheet, a console
 * session), not merely which tasks are solved.
 *
 * Debounced, unlike `pushChangedTaskProgress`: `tasks` only changes on a
 * handful of discrete events, but the *whole* Progress object changes on
 * effectively every interaction (a canvas drag, a spreadsheet keystroke) —
 * without this, that would be a network write per pixel dragged.
 */
export function pushProgressSnapshot(progress: Progress): void {
  if (!backend) return
  if (snapshotTimer) clearTimeout(snapshotTimer)
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null
    void flushProgressSnapshot(progress)
  }, SNAPSHOT_DEBOUNCE_MS)
}

async function flushProgressSnapshot(progress: Progress): Promise<void> {
  if (!backend) return
  try {
    const { data } = await backend.auth.getSession()
    if (!data.session) return
    await backend
      .from('students')
      .update({ progress_snapshot: progress, progress_updated_at: progress.updatedAt })
      .eq('id', data.session.user.id)
  } catch {
    // Offline, or Supabase unreachable — the trainer still works locally,
    // and the next debounced push will retry with the latest state.
  }
}

/** Is this Progress genuinely untouched — the "fresh laptop" case? */
function isBlank(progress: Progress): boolean {
  return (
    Object.keys(progress.tasks).length === 0 &&
    Object.keys(progress.plans).length === 0 &&
    Object.keys(progress.flows).length === 0 &&
    Object.keys(progress.sessions).length === 0 &&
    Object.keys(progress.walks).length === 0 &&
    Object.keys(progress.traces).length === 0 &&
    Object.keys(progress.matches).length === 0 &&
    Object.keys(progress.sheets).length === 0
  )
}

/**
 * Called once right after a successful sign-in. Last-write-wins by
 * timestamp — no merge — except a genuinely blank local Progress (the
 * actual "different laptop" case) always defers to a real server snapshot,
 * since a fresh `emptyProgress`'s own `updatedAt` (just "now") would
 * otherwise look newer than any real history.
 */
export async function hydrateFromSnapshot(local: Progress): Promise<Progress | null> {
  if (!backend) return null
  try {
    const { data } = await backend.auth.getSession()
    if (!data.session) return null
    const { data: row } = await backend
      .from('students')
      .select('progress_snapshot, progress_updated_at')
      .eq('id', data.session.user.id)
      .maybeSingle()
    const snapshot = row?.progress_snapshot as Progress | null | undefined
    if (!snapshot || !row?.progress_updated_at) return null
    if (!isBlank(local) && row.progress_updated_at <= local.updatedAt) return null
    return snapshot
  } catch {
    return null
  }
}
