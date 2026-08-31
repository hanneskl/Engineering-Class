import { useState } from 'react'
import type { CheckResult, Task } from '../model/types'
import { Stellenwert } from './Stellenwert'

// Used both as the label above a revealed hint and inside "… anzeigen" on the
// button, so these must read correctly in both places.
const HINT_LABELS = ['Stups', 'Hinweis', 'Lösung'] as const

export function TaskCard({
  task,
  solved,
  hintsUsed,
  onAttempt,
  onHint,
  onNext,
  isLast,
}: {
  task: Task
  solved: boolean
  hintsUsed: number
  onAttempt: (correct: boolean) => void
  onHint: (level: number) => void
  onNext: () => void
  isLast: boolean
}) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [revealed, setRevealed] = useState(false)

  const hints = [task.hints.stups, task.hints.hinweis, task.hints.loesung]
  const shown = hints.slice(0, hintsUsed)

  function submit() {
    const r = task.check(value)
    setResult(r)
    onAttempt(r.ok)
  }

  const locked = solved && result?.ok !== false

  return (
    <section className={`task${locked ? ' task-solved' : ''}`}>
      <h2>{task.prompt}</h2>
      {task.note && <p className="task-note">{task.note}</p>}

      {task.kind === 'choice' ? (
        <div className="choices">
          {(task.options ?? []).map((opt) => (
            <label key={opt} className={value === opt ? 'choice sel' : 'choice'}>
              <input
                type="radio"
                name={task.id}
                value={opt}
                checked={value === opt}
                onChange={(e) => setValue(e.target.value)}
                disabled={locked}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      ) : task.kind === 'self' ? (
        <textarea
          rows={4}
          value={value}
          disabled={locked}
          placeholder="Schreib deine Antwort in eigenen Worten …"
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <input
          className="answer"
          autoComplete="off"
          autoFocus
          value={value}
          disabled={locked}
          placeholder={task.kind === 'numeric' ? 'Deine Antwort' : 'Deine Antwort …'}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !locked) submit()
          }}
        />
      )}

      {/* Self-assessed concept questions: the tool cannot grade German prose,
          and a wrong "falsch" with no teacher present does real damage. */}
      {task.kind === 'self' ? (
        !revealed ? (
          <button className="primary" onClick={() => setRevealed(true)} disabled={locked}>
            Musterlösung anzeigen
          </button>
        ) : !locked ? (
          <div className="selfcheck">
            <p className="model">
              <strong>Musterlösung:</strong> {task.answer}
            </p>
            <p>Hattest du das im Kern auch?</p>
            <div className="row">
              <button className="primary" onClick={() => onAttempt(true)}>
                Ja, hatte ich
              </button>
              <button
                className="ghost"
                onClick={() => {
                  onAttempt(false)
                  setRevealed(false)
                  setValue('')
                }}
              >
                Nein, nochmal
              </button>
            </div>
          </div>
        ) : null
      ) : (
        !locked && (
          <button className="primary" onClick={submit}>
            Prüfen
          </button>
        )
      )}

      {result && !result.ok && (
        <div className="feedback bad" role="status">
          <strong>{result.message}</strong>
          {result.why && <p>{result.why}</p>}
        </div>
      )}

      {locked && (
        <div className="feedback good" role="status">
          <strong>
            {result?.ok && result.message ? result.message : 'Richtig!'}
          </strong>
          {task.kind !== 'self' && <p>{task.answer}</p>}
        </div>
      )}

      {!locked && (
        <div className="hints">
          {shown.map((text, i) => (
            <div key={i} className={`hint hint-${i}`}>
              <span className="hint-label">{HINT_LABELS[i]}</span>
              <p>{text}</p>
              {/* Blank at "Hinweis" (the method), filled in at "Lösung zeigen". */}
              {i >= 1 && task.helper?.type === 'stellenwert' && (
                <Stellenwert
                  value={task.helper.value}
                  direction={task.helper.direction}
                  reveal={i === 2}
                />
              )}
            </div>
          ))}
          {hintsUsed < 3 && (
            <button className="ghost small" onClick={() => onHint(hintsUsed + 1)}>
              {hintsUsed === 0 ? 'Ich komme nicht weiter' : `${HINT_LABELS[hintsUsed]} anzeigen`}
            </button>
          )}
        </div>
      )}

      {locked && (
        <button className="primary next" onClick={onNext}>
          {isLast ? 'Fertig' : 'Weiter'}
        </button>
      )}
    </section>
  )
}
