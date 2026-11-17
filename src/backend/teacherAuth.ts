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
 * Is the teacher signed in — not just anyone?
 *
 * This used to accept any non-anonymous session, from when students signed
 * in anonymously. Since 0006 they have real accounts too, so on a browser a
 * student last used, `#/lehrer` opened the dashboard under the student's
 * session: no password asked, and RLS handed back only that student's own
 * row and answers, so the class list and the statistics came up empty. The
 * teacher is whoever owns a class; a student's session finds none.
 */
export async function isTeacherSignedIn(): Promise<boolean> {
  if (!backend) return false
  const { data } = await backend.auth.getSession()
  const user = data.session?.user
  if (!user || user.is_anonymous) return false
  const { data: classes } = await backend
    .from('engineering_class_classes')
    .select('id')
    .eq('teacher_id', user.id)
    .limit(1)
  return (classes?.length ?? 0) > 0
}
