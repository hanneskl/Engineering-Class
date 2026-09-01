import { useMemo, useState } from 'react'
import { type BuildLesson, taskRules, zielFindings, zielMet } from '../model/types'
import { emptyPlan, type Plan } from '../model/plan'
import { NetworkEditor } from '../editor/NetworkEditor'
import { checkAlways, isTaskSolved } from '../model/rules'
import {
  clonePlan,
  loadPlan,
  savePlan,
  taskProgress,
  withTask,
  type Progress,
} from '../progress/store'

const HINT_LABELS = ['Stups', 'Hinweis', 'Lösung'] as const

/**
 * What is on the canvas when a task opens.
 *
 * A saved plan always wins. Otherwise a task marked startFrom: 'previous'
 * inherits a copy of the most recent network the student actually built —
 * without that, briefs like "Erweitere das Netz" open on an empty canvas and
 * the instruction reads as a lie.
 */
function initialPlan(progress: Progress, lesson: BuildLesson, index: number): Plan {
  const task = lesson.tasks[index]
  if (!task) return emptyPlan()

  const saved = loadPlan(progress, task.id)
  if (saved) return saved
  if (task.starter) return clonePlan(task.starter)

  if (task.startFrom === 'previous') {
    for (let i = index - 1; i >= 0; i--) {
      const earlier = loadPlan(progress, lesson.tasks[i]!.id)
      if (earlier && earlier.devices.length > 0) return clonePlan(earlier)
    }
  }
  return emptyPlan()
}

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

  const [plan, setPlan] = useState<Plan>(() => initialPlan(progress, lesson, index))
  const [introOpen, setIntroOpen] = useState(
    () => !lesson.tasks.some((t) => taskProgress(progress, t.id).solved),
  )

  /** Each goal with whatever is currently standing in its way. */
  const ziele = useMemo(
    () =>
      task.ziele.map((z) => ({
        text: z.text,
        findings: zielFindings(plan, z),
        ok: zielMet(plan, z),
      })),
    [task, plan],
  )

  /**
   * Faults that no goal covers — a duplicate address in a task that never
   * mentioned addressing, a cabled phone, a switch out of ports. Filtered by
   * code so a problem already shown under a goal is not repeated here.
   */
  const general = useMemo(() => {
    const claimed = new Set(ziele.flatMap((z) => z.findings.map((f) => f.code)))
    return checkAlways(plan).filter((f) => !claimed.has(f.code))
  }, [plan, ziele])

  const findings = useMemo(
    () => [...ziele.flatMap((z) => z.findings), ...general],
    [ziele, general],
  )
  const done = plan.devices.length > 0 && findings.length === 0
  const isLast = index === lesson.tasks.length - 1

  function change(next: Plan) {
    setPlan(next)
    const saved = savePlan(progress, task.id, next)
    const nowDone = isTaskSolved(next, taskRules(task))
    onProgress(
      nowDone && !taskProgress(saved, task.id).solved
        ? withTask(saved, task.id, { solved: true })
        : saved,
    )
  }

  function openTask(i: number) {
    if (!lesson.tasks[i]) return
    setIndex(i)
    setPlan(initialPlan(progress, lesson, i))
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

        {general.length > 0 && (
          <ul className="problems">
            {general.map((f, i) => (
              <li key={`${f.code}-${i}`}>
                <span className="f-message">{f.message}</span>
                <span className="f-why">{f.why}</span>
              </li>
            ))}
          </ul>
        )}

        {done && (
          <div className="brief-done-row">
            <strong>Geschafft — der Plan stimmt.</strong>
            {!isLast && (
              <button className="primary" onClick={() => openTask(index + 1)}>
                Weiter
              </button>
            )}
          </div>
        )}
      </section>

      <NetworkEditor plan={plan} onChange={change} findings={findings} />

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
