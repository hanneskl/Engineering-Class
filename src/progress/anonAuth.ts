/**
 * Turns the name typed into NameGate into a real, if anonymous, identity.
 *
 * The trainer keeps its whole point — type a name, no password, no account
 * to set up — but a name alone can't be trusted as a database identity: two
 * "Lukas"es in one class, or a shared computer, would otherwise let one
 * student's browser silently write into another's row. Supabase's anonymous
 * sign-in gives a real `auth.uid()` (RLS treats it exactly like a normal
 * user) with no login screen at all, and supabase-js persists that session
 * in localStorage the same way `Progress` already persists per browser.
 *
 * This mirrors src/progress/store.ts's own `keyFor(name)` reasoning: on a
 * shared machine, a *different* typed name should not inherit whatever
 * session is already sitting in this browser.
 */

import { backend, CLASS_ID } from '../backend/client'

// Remembers which name the current anonymous session was last synced under,
// so a second student typing a different name on the same browser gets a
// fresh identity instead of silently attaching to the first student's. Not
// the source of truth (that's `students.display_name` on the server) — just
// enough to decide, cheaply and locally, whether today's name still matches.
const SYNCED_NAME_KEY = 'netzwerk-trainer:synced-name'

/**
 * Call once per NameGate submit. No-ops entirely with no backend configured
 * — everything here is additive to the existing local-only experience, never
 * required by it. Failures are swallowed the same way: a student who can't
 * reach Supabase right now still gets the full trainer, just unsynced.
 */
export async function ensureSignedIn(displayName: string): Promise<void> {
  if (!backend) return

  try {
    const { data } = await backend.auth.getSession()
    const syncedName = localStorage.getItem(SYNCED_NAME_KEY)

    if (data.session && syncedName === displayName) return

    if (data.session) {
      // A session exists but for a different name — the shared-computer
      // case. Start clean rather than mislabel the previous student's rows.
      await backend.auth.signOut()
    }

    const { data: signedIn, error } = await backend.auth.signInAnonymously()
    if (error || !signedIn.user) return

    const { error: upsertError } = await backend
      .from('students')
      .upsert({ id: signedIn.user.id, display_name: displayName, class_id: CLASS_ID })
    if (upsertError) return

    localStorage.setItem(SYNCED_NAME_KEY, displayName)
  } catch {
    // Offline, or Supabase unreachable — the trainer still works locally.
  }
}
