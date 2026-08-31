import { useMemo, useState } from 'react'
import type { BuildLesson } from '../model/types'
import { emptyPlan, type Plan } from '../model/plan'
import { NetworkEditor } from '../editor/NetworkEditor'
import { evaluateTask, isTaskSolved } from '../model/rules'
import { loadPlan, savePlan, taskProgress, withTask, type Progress } from '../progress/store'

const HINT_LABELS = ['Stups', 'Hinweis', 'Lösung'] as const

export function BuildLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: BuildLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  const [index, setIndex] = useState(() => {
    const i = lesson.tasks.findIndex((t) => !taskProgress(progress, t.id).solved)
    return i === -1 ? 0 : i
  })
  const task = lesson.tasks[index]!
  const state = taskProgress(progress, task.id)

  const [plan, setPlan] = useState<Plan>(
    () => loadPlan(progress, task.id) ?? task.starter ?? emptyPlan(),
  )
  const [introOpen, setIntroOpen] = useState(
    () => !lesson.tasks.some((t) => taskProgress(progress, t.id).solved),
  )

  // Includes the always-on rules, so a duplicate address blocks completion
  // even when the task itself never mentioned addressing.
  const findings = useMemo(() => evaluateTask(plan, task.rules), [task, plan])
  const done = findings.length === 0 && plan.devices.length > 0

  function change(next: Plan) {
    setPlan(next)
    const saved = savePlan(progress, task.id, next)
    const nowDone = isTaskSolved(next, task.rules)
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
    setPlan(loadPlan(progress, next.id) ?? next.starter ?? emptyPlan())
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

      <section className="brief">
        <h2>{task.title}</h2>
        <p>{task.brief}</p>
        <ul className="ziele">
          {task.ziele.map((z) => (
            <li key={z}>{z}</li>
          ))}
        </ul>
      </section>

      <NetworkEditor plan={plan} onChange={change} findings={findings} />

      <section className={`status ${done ? 'ok' : ''}`} aria-live="polite">
        {plan.devices.length === 0 ? (
          <p className="muted">Füg links ein erstes Gerät hinzu.</p>
        ) : done ? (
          <>
            <strong>Geschafft — der Plan stimmt.</strong>
            {index < lesson.tasks.length - 1 && (
              <button className="primary" onClick={() => openTask(index + 1)}>
                Weiter
              </button>
            )}
          </>
        ) : (
          <>
            <strong>Das fehlt noch:</strong>
            <ul className="findings">
              {findings.map((f, i) => (
                <li key={`${f.code}-${i}`}>
                  <span className="f-message">{f.message}</span>
                  <span className="f-why">{f.why}</span>
                </li>
              ))}
            </ul>
          </>
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
  )
}
