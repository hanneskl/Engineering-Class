/**
 * The teacher's own sign-in — a real email+password Supabase account,
 * unlike every student's anonymous one. Structurally the same shape as the
 * nickname+password `signIn` this repo had before the merge deleted its
 * login screen, just for one teacher account instead of per-student ones.
 *
 * A hardcoded password baked into the client bundle would be trivially
 * readable via view-source once this is deployed to GitHub Pages — a real
 * account, created once by hand in the Supabase dashboard, is what makes
 * "password-protected" actually mean something here.
 */

import { backend } from './client'

export async function signInTeacher(email: string, password: string): Promise<string | null> {
  if (!backend) return 'Kein Server konfiguriert.'
  const { error } = await backend.auth.signInWithPassword({ email, password })
  if (!error) return null
  return error.message.toLowerCase().includes('invalid')
    ? 'E-Mail oder Passwort stimmt nicht.'
    : error.message
}

export async function signOutTeacher(): Promise<void> {
  await backend?.auth.signOut()
}

/**
 * Is a real (non-anonymous) session currently signed in? A student's
 * anonymous session also lives in this same browser's auth state, so this
 * has to check `is_anonymous`, not just whether a session exists at all.
 */
export async function isTeacherSignedIn(): Promise<boolean> {
  if (!backend) return false
  const { data } = await backend.auth.getSession()
  return Boolean(data.session && !data.session.user.is_anonymous)
}
