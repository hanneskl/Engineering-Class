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
import type { TaskProgress } from './store'

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
