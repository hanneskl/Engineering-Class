import { useState, type ReactNode } from 'react'
import type { Finding } from '../model/rules'
import type { Hints } from '../model/types'
import { taskProgress, withTask, type Progress } from '../progress/store'

/**
 * Everything a task page has around its editor: the way back, the module
 * heading, the collapsible Erklären section, the task dots, the brief with its
 * live checklist, and the hint ladder.
 *
 * All five working modules — network, flowchart, console, packet walk, traces —
 * are the same page with a different thing in the middle. They used to be five
 * copies of this markup, which meant a change to the teaching loop had to be
 * made five times and was made four times twice. Whatever the student is
 * editing goes in as children; what differs per module stays in the view that
 * owns that document.
 */

const HINT_LABELS = ['Stups', 'Hinweis', 'Lösung'] as const

/** One line of the checklist: the goal, and what is in its way. */
export type ShellZiel = {
  text: string
  ok: boolean
  /** Shown under an unmet goal — the first finding standing in its way. */
  why?: string
}

export type ShellTask = {
  id: string
  title: string
  brief: string
  hints: Hints
}

export function LessonShell({
  module,
  title,
  intro,
  quali,
  tasks,
  index,
  onOpenTask,
  ziele,
  probleme,
  done,
  doneText = 'Geschafft.',
  progress,
  onProgress,
  onBack,
  children,
}: {
  module: string
  title: string
  intro: { heading: string; body: string[] }
  quali: string
  tasks: ShellTask[]
  index: number
  onOpenTask: (index: number) => void
  ziele: ShellZiel[]
  /** Faults no goal covers, already filtered by the view. */
  probleme?: Finding[]
  done: boolean
  doneText?: string
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
  children: ReactNode
}) {
  const task = tasks[index]!
  const state = taskProgress(progress, task.id)
  // Open on the first visit, closed once they have solved something here.
  const [introOpen, setIntroOpen] = useState(
    () => !tasks.some((t) => taskProgress(progress, t.id).solved),
  )
  const isLast = index === tasks.length - 1
  const hints = [task.hints.stups, task.hints.hinweis, task.hints.loesung]

  return (
    <div className="lesson">
      <div className="lesson-rail">
        <button className="back" onClick={onBack}>
          ← Übersicht
        </button>

        <div className="lesson-head">
          <span className="badge">{module}</span>
          <h1>{title}</h1>
        </div>

        <button className="intro-open" onClick={() => setIntroOpen(true)}>
          Erklärung: {intro.heading}
        </button>

        <ol className="dots" aria-label="Aufgaben">
          {tasks.map((t, i) => {
            const s = taskProgress(progress, t.id)
            const cls = s.solved ? 'dot done' : i === index ? 'dot here' : 'dot'
            return (
              <li key={t.id}>
                <button
                  className={i === index && s.solved ? 'dot done here' : cls}
                  aria-current={i === index}
                  aria-label={`Aufgabe ${i + 1}: ${t.title}`}
                  onClick={() => onOpenTask(i)}
                >
                  {i + 1}
                </button>
              </li>
            )
          })}
        </ol>

        <section className={`brief${done ? ' brief-done' : ''}`} aria-live="polite">
          <h2>{task.title}</h2>
          <p>{task.brief}</p>

          <ul className="ziele">
            {ziele.map((z) => (
              <li key={z.text} className={z.ok ? 'ziel ok' : 'ziel'}>
                <span className="ziel-mark" aria-hidden="true">
                  {z.ok ? '✓' : ''}
                </span>
                <span className="ziel-body">
                  <span className="ziel-text">{z.text}</span>
                  <span className="sr-only">{z.ok ? ' — erledigt' : ' — offen'}</span>
                  {!z.ok && z.why && <span className="ziel-why">{z.why}</span>}
                </span>
              </li>
            ))}
          </ul>

          {probleme && probleme.length > 0 && (
            <ul className="problems">
              {probleme.map((f, i) => (
                <li key={`${f.code}-${i}`}>
                  <span className="f-message">{f.message}</span>
                  <span className="f-why">{f.why}</span>
                </li>
              ))}
            </ul>
          )}

          {done && (
            <div className="brief-done-row">
              <strong>{doneText}</strong>
              {!isLast && (
                <button className="primary" onClick={() => onOpenTask(index + 1)}>
                  Weiter
                </button>
              )}
            </div>
          )}
        </section>

        {!done && (
          <div className="hints">
            {hints.slice(0, state.hintsUsed).map((text, i) => (
              <div key={i} className={`hint hint-${i}`}>
                <span className="hint-label">{HINT_LABELS[i]}</span>
                <p>{text}</p>
              </div>
            ))}
            {state.hintsUsed < 3 && (
              <button
                className="ghost small"
                onClick={() =>
                  onProgress(withTask(progress, task.id, { hintsUsed: state.hintsUsed + 1 }))
                }
              >
                {state.hintsUsed === 0
                  ? 'Ich komme nicht weiter'
                  : `${HINT_LABELS[state.hintsUsed]} anzeigen`}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="lesson-stage">
        {children}

        {introOpen && (
          <section className="intro" aria-label={intro.heading}>
            <h2>{intro.heading}</h2>
            {intro.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <p className="quali">
              <strong>Für den Quali:</strong> {quali}
            </p>
            <div className="intro-close">
              <button className="primary" onClick={() => setIntroOpen(false)} autoFocus>
                Verstanden, los geht's
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
