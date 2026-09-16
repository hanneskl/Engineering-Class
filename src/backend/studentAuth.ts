/**
 * A student's own sign-in — a real Supabase Auth account (name + a
 * teacher-issued 6-digit code), not the anonymous session this replaces.
 * Reusing `signInWithPassword` means every RLS policy, session-persistence
 * behaviour, and Realtime/Presence integration already built around
 * `auth.uid()` keeps working unchanged — only how the session gets created
 * changes. Accounts themselves are provisioned by the teacher, through the
 * `manage-student` Edge Function — there is no self-registration here.
 */

import { backend } from './client'
import { emailForStudent } from './studentSlug'

export async function signInStudent(name: string, code: string): Promise<string | null> {
  if (!backend) return 'Kein Server konfiguriert.'
  const { error } = await backend.auth.signInWithPassword({
    email: emailForStudent(name),
    password: code,
  })
  if (!error) return null
  return error.message.toLowerCase().includes('invalid')
    ? 'Name oder Code stimmt nicht.'
    : error.message
}
