import { useState } from 'react'
import { signIn } from './backend.ts'

export function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setBusy(true)
    const message = await signIn(nickname, password)
    setBusy(false)
    if (message) setError(message)
    else onSignedIn()
  }

  return (
    <div className="login">
      <form onSubmit={submit}>
        <h1>Quali Excel Trainer</h1>
        <p className="subtitle">Melde dich mit deinem Nickname an.</p>
        <label>
          Nickname
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} autoFocus />
        </label>
        <label>
          Passwort
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button type="submit" disabled={busy || !nickname || !password}>
          {busy ? 'Anmelden …' : 'Anmelden'}
        </button>
      </form>
    </div>
  )
}
