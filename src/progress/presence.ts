/**
 * "What is each student doing right now" — a Realtime Presence channel, not
 * a database table. `track()` marks this browser as present with whatever
 * payload it's given; the server drops that entry the instant the socket
 * disconnects (tab closed, network dropped), which is exactly the
 * "currently active" signal a table would need a heartbeat and a staleness
 * cutoff to fake.
 *
 * One fixed channel for the one class this trainer serves — no per-class
 * parameterisation needed yet. Deliberately not a private, RLS-authorised
 * channel: the payload is just a name and a current task, low stakes for a
 * trusted class of 6-8, and this is a real accepted trade-off (a student
 * with devtools open could track a fake entry under someone else's name),
 * not an oversight — see the plan's trust-model note.
 */

import type { RealtimeChannel } from '@supabase/supabase-js'
import { backend } from '../backend/client'

const CHANNEL_NAME = 'presence:classroom'

export type ActiveTask = {
  display_name: string
  lesson_id: string
  task_id: string
  since: number
}

let channel: RealtimeChannel | null = null
let joinedAs: { studentId: string; displayName: string } | null = null

/**
 * Joins the shared channel once per (student, browser tab). Safe to call
 * again with the same identity — it no-ops. Called from a `useEffect` in
 * App.tsx keyed on the signed-in student's name, which covers both a fresh
 * sign-in and a returning student whose page just reloaded: unlike the
 * anonymous auth session, a Presence channel is a live socket, not something
 * supabase-js persists across a reload on its own.
 *
 * Takes only the display name — the same thing `ensureSignedIn` already
 * has — and resolves the student's own id from the current session itself,
 * so App.tsx never needs to plumb a uid through just for this.
 */
export async function joinPresence(displayName: string): Promise<void> {
  if (!backend) return
  const { data } = await backend.auth.getSession()
  if (!data.session) return
  const studentId = data.session.user.id

  if (joinedAs && joinedAs.studentId === studentId && joinedAs.displayName === displayName) return

  if (channel) await backend.removeChannel(channel)
  joinedAs = { studentId, displayName }

  const next = backend.channel(CHANNEL_NAME, { config: { presence: { key: studentId } } })
  channel = next
  await new Promise<void>((resolve) => {
    next.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve()
    })
  })
}

/**
 * Publishes the task a student just opened. Task-open events are frequent
 * and must never throw or hold up navigation — a no-op (backend absent, or
 * the channel hasn't finished joining yet) is silently fine; the next task
 * change tries again.
 */
export function reportActiveTask(lessonId: string, taskId: string): void {
  if (!channel || !joinedAs) return
  const payload: ActiveTask = {
    display_name: joinedAs.displayName,
    lesson_id: lessonId,
    task_id: taskId,
    since: Date.now(),
  }
  void channel.track(payload)
}

/**
 * The dashboard's read side: a second, separate channel subscription (the
 * student's own `channel` above is write-only from the dashboard's point of
 * view) that only listens. Returns an unsubscribe function.
 */
export function subscribePresence(
  onState: (state: Record<string, ActiveTask[]>) => void,
): () => void {
  if (!backend) return () => {}

  const dashboardChannel = backend.channel(CHANNEL_NAME)
  dashboardChannel.on('presence', { event: 'sync' }, () => {
    onState(dashboardChannel.presenceState<ActiveTask>())
  })
  dashboardChannel.subscribe()

  return () => void backend!.removeChannel(dashboardChannel)
}
