import { useState } from 'react'

/**
 * On a shared school computer localStorage alone cannot tell two students
 * apart, so the name is what keys their progress — and what seeds their
 * personal set of exercise numbers.
 */
export function NameGate({ onStart }: { onStart: (name: string) => void }) {
  const [name, setName] = useState('')
  const trimmed = name.trim()

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
            if (trimmed) onStart(trimmed)
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
          <button className="primary" type="submit" disabled={!trimmed}>
            Los geht&apos;s
          </button>
        </form>

        <p className="gate-note">
          Dein Name bleibt auf diesem Computer. Er sorgt dafür, dass du deine eigenen
          Aufgaben bekommst und dein Fortschritt gespeichert wird.
        </p>
      </div>
    </div>
  )
}
