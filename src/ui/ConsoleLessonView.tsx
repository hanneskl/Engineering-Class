import { useMemo, useState } from 'react'
import {
  type ConsoleLesson,
  consoleTaskRules,
  consoleZielFindings,
  consoleZielMet,
} from '../model/types'
import { clonePlan } from '../progress/store'
import { emptySession, terminals, type Session } from '../model/console'
import { isConsoleSolved, type ConsoleState } from '../model/consoleRules'
import { Console } from '../editor/Console'
import {
  latestPlan,
  loadSession,
  saveSession,
  taskProgress,
  withTask,
  type Progress,
} from '../progress/store'

const HINT_LABELS = ['Stups', 'Hinweis', 'Lösung'] as const

export function ConsoleLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: ConsoleLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  /**
   * Their own home network if they drew one in M2, otherwise the prepared one.
   * Running ipconfig against a network you built yourself is the whole point.
   */
  const plan = useMemo(
    () => latestPlan(progress) ?? clonePlan(lesson.starter),
    [progress, lesson.starter],
  )

  const [index, setIndex] = useState(() => {
    const i = lesson.tasks.findIndex((t) => !taskProgress(progress, t.id).solved)
    return i === -1 ? 0 : i
  })
  const task = lesson.tasks[index]!
  const state = taskProgress(progress, task.id)

  const [session, setSession] = useState<Session>(() => startSession(progress, task.id, plan))
  const [introOpen, setIntroOpen] = useState(
    () => !lesson.tasks.some((t) => taskProgress(progress, t.id).solved),
  )

  const consoleState: ConsoleState = { plan, session }
  const ziele = useMemo(
    () =>
      task.ziele.map((z) => ({
        text: z.text,
        findings: consoleZielFindings(consoleState, z),
        ok: consoleZielMet(consoleState, z),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, plan, session],
  )
  const done = ziele.every((z) => z.ok)
  const isLast = index === lesson.tasks.length - 1

  function change(next: Session) {
    setSession(next)
    const saved = saveSession(progress, task.id, next)
    const nowDone = isConsoleSolved({ plan, session: next }, consoleTaskRules(task))
    onProgress(
      nowDone && !taskProgress(saved, task.id).solved
        ? withTask(saved, task.id, { solved: true })
        : saved,
    )
  }

  function openTask(i: number) {
    const next = lesson.tasks[i]
    if (!next) return
    setIndex(i)
    setSession(startSession(progress, next.id, plan))
  }

  const hints = [task.hints.stups, task.hints.hinweis, task.hints.loesung]

  return (
    <div className="lesson build">
      <button className="back" onClick={onBack}>
        ← Übersicht
      </button>

      <div className="lesson-head">
        <span className="badge">{lesson.module}</span>
        <h1>{lesson.title}</h1>
      </div>

      <details
        className="intro"
        open={introOpen}
        onToggle={(e) => setIntroOpen(e.currentTarget.open)}
      >
        <summary>{lesson.intro.heading}</summary>
        {lesson.intro.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p className="quali">
          <strong>Für den Quali:</strong> {lesson.quali}
        </p>
      </details>

      <ol className="dots" aria-label="Aufgaben">
        {lesson.tasks.map((t, i) => {
          const s = taskProgress(progress, t.id)
          const cls = s.solved ? 'dot done' : i === index ? 'dot here' : 'dot'
          return (
            <li key={t.id}>
              <button
                className={cls}
                aria-current={i === index}
                aria-label={`Aufgabe ${i + 1}: ${t.title}`}
                onClick={() => openTask(i)}
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
                {!z.ok && z.findings[0] && (
                  <span className="ziel-why">{z.findings[0].message}</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {done && (
          <div className="brief-done-row">
            <strong>Geschafft.</strong>
            {!isLast && (
              <button className="primary" onClick={() => openTask(index + 1)}>
                Weiter
              </button>
            )}
          </div>
        )}
      </section>

      <Console plan={plan} session={session} onSession={change} />

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
  )
}

/** Resumes a saved session, or starts one already sitting at a real machine. */
function startSession(
  progress: Progress,
  taskId: string,
  plan: import('../model/plan').Plan,
): Session {
  const saved = loadSession(progress, taskId)
  if (saved) return saved
  return { ...emptySession(), atDeviceId: terminals(plan)[0]?.id ?? null }
}
