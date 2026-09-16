import { useState } from 'react'
import { hasBackend } from '../backend/client'

/**
 * With no backend configured, a name alone is all a shared school computer
 * can tell students apart by — progress just lives keyed by that name.
 *
 * With a backend, a typed name alone can't be trusted as an identity (see
 * `signInStudent`'s own doc comment): the teacher provisions each student a
 * 6-digit code, entered here alongside their name, so their account — and
 * everything synced to it — follows them to any device, not just this one.
 */
export function NameGate({
  onStart,
  error,
  busy,
}: {
  onStart: (name: string, code: string) => void
  error?: string | null
  busy?: boolean
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const trimmed = name.trim()
  const ready = hasBackend ? Boolean(trimmed && code.trim()) : Boolean(trimmed)

  return (
    <div className="gate">
      <div className="gate-card">
        <h1>
          Informatik<span>-Trainer</span>
        </h1>
        <p className="gate-sub">
          Übe Netzwerke, Binärzahlen und Tabellenkalkulation für den Quali in Informatik.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (ready) onStart(trimmed, code.trim())
          }}
        >
          <label htmlFor="name">Wie heißt du?</label>
          <input
            id="name"
            autoFocus
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Vorname"
          />
          {hasBackend && (
            <>
              <label htmlFor="code">Dein Code</label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-stelliger Code von deiner Lehrkraft"
              />
            </>
          )}
          {error && <p className="gate-error">{error}</p>}
          <button className="primary" type="submit" disabled={!ready || busy}>
            {busy ? 'Anmelden …' : "Los geht's"}
          </button>
        </form>

        <p className="gate-note">
          {hasBackend
            ? 'Dein Fortschritt gehört zu deinem Namen und Code — du kannst dich damit auf jedem Computer anmelden.'
            : 'Dein Name bleibt auf diesem Computer. Er sorgt dafür, dass du deine eigenen ' +
              'Aufgaben bekommst und dein Fortschritt gespeichert wird.'}
        </p>
      </div>
    </div>
  )
}
