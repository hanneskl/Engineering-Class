/**
 * M10's own use of the shared Supabase client: posting a submission for
 * server-side grading.
 *
 * The nickname+password sign-in that used to live here is gone — its login
 * screen (Login.tsx) was deleted when the two repos merged, so `signIn` and
 * `emailForNickname` had no caller left. Identity now comes from the app-wide
 * anonymous session every student already has by the time they reach a
 * lesson (src/progress/anonAuth.ts) — the same session `submitAttempt`
 * relies on for the edge function's own auth check.
 */

import type { Grade, Submission } from '@quali/scenarios'
import { backend } from '../backend/client'

export interface SubmitResult {
  readonly grade: Grade | null
  readonly error: string | null
}

/**
 * Send the submission to the edge function, which re-grades it server-side and records it.
 * The browser's own result is only ever provisional — this answer is the one that counts.
 */
export async function submitAttempt(
  scenarioId: string,
  taskId: string,
  work: Pick<Submission, 'inputs' | 'styles' | 'merges'>,
): Promise<SubmitResult> {
  if (!backend) return { grade: null, error: null }

  const { data, error } = await backend.functions.invoke<Grade>('check-task', {
    body: { scenarioId, taskId, ...work },
  })
  if (error) return { grade: null, error: error.message }
  return { grade: data ?? null, error: null }
}
