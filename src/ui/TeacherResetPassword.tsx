import { useState, type FormEvent } from 'react'
import { backend } from '../backend/client'

/**
 * Shown when a Supabase password-recovery link lands here — detected via
 * the `PASSWORD_RECOVERY` auth event in App.tsx, not by parsing the URL
 * ourselves (supabase-js already consumes and clears that token on load).
 *
 * The one place in the whole trainer where a password is actually typed: it
 * goes straight from this form to Supabase via `updateUser`, never anywhere
 * else — nobody, including this codebase's own author, sees it in transit.
 */
export function TeacherResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (password !== confirm) {
      setError('Die beiden Passwörter stimmen nicht überein.')
      return
    }
    if (password.length < 6) {
      setError('Mindestens 6 Zeichen.')
      return
    }
    setBusy(true)
    const { error: updateError } = await backend!.auth.updateUser({ password })
    setBusy(false)
    if (updateError) setError(updateError.message)
    else setDone(true)
  }

  if (done) {
    return (
      <div className="gate">
        <div className="gate-card">
          <h1>
            Passwort<span> gesetzt</span>
          </h1>
          <p className="gate-sub">Du kannst dich jetzt damit anmelden.</p>
          <button className="primary" onClick={onDone}>
            Zur Anmeldung
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <h1>
          Neues<span> Passwort</span>
        </h1>
        <p className="gate-sub">Für die Lehrer-Ansicht.</p>

        <form onSubmit={submit}>
          <label htmlFor="new-password">Neues Passwort</label>
          <input
            id="new-password"
            type="password"
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label htmlFor="confirm-password">Nochmal</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <p className="gate-error">{error}</p>}
          <button className="primary" type="submit" disabled={busy || !password || !confirm}>
            {busy ? 'Speichert …' : 'Passwort setzen'}
          </button>
        </form>
      </div>
    </div>
  )
}
