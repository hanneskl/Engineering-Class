import { useEffect, useRef, useState } from 'react'
import { type Plan, deviceById } from '../model/plan'
import { type Session, run, terminals } from '../model/console'

/**
 * The command line, plus a read-only picture of the network it runs on so the
 * student can see what they are addressing while they type.
 */
export function Console({
  plan,
  session,
  onSession,
}: {
  plan: Plan
  session: Session
  onSession: (next: Session) => void
}) {
  const [input, setInput] = useState('')
  /** Position in the command history, walked with the arrow keys. */
  const [historyAt, setHistoryAt] = useState<number | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const machines = terminals(plan)
  const me = session.atDeviceId ? deviceById(plan, session.atDeviceId) : undefined

  // Always show the newest output.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [session.entries.length])

  function submit() {
    const text = input.trim()
    if (!text) return
    const entry = run(plan, session, text)
    onSession({ ...session, entries: [...session.entries, entry] })
    setInput('')
    setHistoryAt(null)
  }

  function recall(direction: -1 | 1) {
    const history = session.entries.map((e) => e.input).filter(Boolean)
    if (!history.length) return
    const next =
      historyAt === null
        ? direction === -1
          ? history.length - 1
          : null
        : Math.min(history.length - 1, Math.max(0, historyAt + direction))
    setHistoryAt(next)
    setInput(next === null ? '' : (history[next] ?? ''))
  }

  return (
    <div className="console">
      <div className="console-bar">
        <label htmlFor="at-device">Du sitzt an</label>
        <select
          id="at-device"
          value={session.atDeviceId ?? ''}
          onChange={(e) => onSession({ ...session, atDeviceId: e.target.value || null })}
        >
          <option value="">— Gerät wählen —</option>
          {machines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.ip ? ` (${d.ip})` : ''}
            </option>
          ))}
        </select>
        {session.entries.length > 0 && (
          <button className="link" onClick={() => onSession({ ...session, entries: [] })}>
            Ausgabe löschen
          </button>
        )}
      </div>

      <div className="console-log" ref={logRef} role="log" aria-live="polite">
        {session.entries.length === 0 && (
          <p className="console-welcome">
            Eingabeaufforderung. Tipp <code>hilfe</code> und drück Enter.
          </p>
        )}
        {session.entries.map((e, i) => (
          <div key={i} className={`console-entry${e.ok ? '' : ' bad'}`}>
            <div className="console-cmd">
              <span className="prompt">{me?.name ?? 'PC'}&gt;</span> {e.input}
            </div>
            {e.lines.map((line, j) => (
              <div key={j} className="console-line">
                {line || ' '}
              </div>
            ))}
          </div>
        ))}
      </div>

      <form
        className="console-input"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <span className="prompt">{me?.name ?? 'PC'}&gt;</span>
        <input
          value={input}
          spellCheck={false}
          autoComplete="off"
          aria-label="Befehl eingeben"
          placeholder={me ? 'z. B. ipconfig' : 'Wähl zuerst ein Gerät aus'}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              recall(-1)
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              recall(1)
            }
          }}
        />
        <button className="primary" type="submit">
          Ausführen
        </button>
      </form>
    </div>
  )
}
