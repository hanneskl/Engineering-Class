import { useState } from 'react'
import { signInTeacher } from '../backend/teacherAuth'

/**
 * The one login screen in the whole trainer. Every student gets in by just
 * typing a name (NameGate) — this is deliberately the odd one out, because
 * it's the only account that actually needs to be *this specific person*,
 * not merely *some browser*.
 */
export function TeacherLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setBusy(true)
    const message = await signInTeacher(email, password)
    setBusy(false)
    if (message) setError(message)
    else onSignedIn()
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <h1>
          Lehrer<span>-Ansicht</span>
        </h1>
        <p className="gate-sub">Nur für dich — deine Schüler tippen nur ihren Namen.</p>

        <form onSubmit={submit}>
          <label htmlFor="teacher-email">E-Mail</label>
          <input
            id="teacher-email"
            type="email"
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="teacher-password">Passwort</label>
          <input
            id="teacher-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="gate-error">{error}</p>}
          <button className="primary" type="submit" disabled={busy || !email || !password}>
            {busy ? 'Anmelden …' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
