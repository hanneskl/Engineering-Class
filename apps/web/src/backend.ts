/**
 * Supabase wiring.
 *
 * The trainer runs perfectly well with no backend at all — that is the default. Set
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to turn on sign-in and attempt logging.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Grade } from '@quali/scenarios'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const backend: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const hasBackend = backend !== null

/**
 * Students get teacher-created nicknames, not email addresses. Supabase Auth is email-shaped,
 * so we synthesise a local address on a reserved TLD that can never receive mail.
 */
export function emailForNickname(nickname: string): string {
  return `${nickname.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-')}@pupils.invalid`
}

export async function signIn(nickname: string, password: string): Promise<string | null> {
  if (!backend) return 'Kein Server konfiguriert.'
  const { error } = await backend.auth.signInWithPassword({
    email: emailForNickname(nickname),
    password,
  })
  if (!error) return null
  return error.message.toLowerCase().includes('invalid')
    ? 'Nickname oder Passwort stimmt nicht.'
    : error.message
}

export async function signOut(): Promise<void> {
  await backend?.auth.signOut()
}

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
  inputs: Record<string, string>,
): Promise<SubmitResult> {
  if (!backend) return { grade: null, error: null }

  const { data, error } = await backend.functions.invoke<Grade>('check-task', {
    body: { scenarioId, taskId, inputs },
  })
  if (error) return { grade: null, error: error.message }
  return { grade: data ?? null, error: null }
}
