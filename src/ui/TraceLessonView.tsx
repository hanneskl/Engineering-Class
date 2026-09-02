import { useMemo, useState } from 'react'
import {
  type TraceLesson,
  traceTaskRules,
  traceZielFindings,
  traceZielMet,
} from '../model/types'
import { emptyTraces, type Traces } from '../model/traces'
import { isTracesSolved, type TraceState } from '../model/traceRules'
import { TraceLog } from '../editor/TraceLog'
import {
  loadTraces,
  saveTraces,
  taskProgress,
  withTask,
  type Progress,
} from '../progress/store'

const HINT_LABELS = ['Stups', 'Hinweis', 'Lösung'] as const

export function TraceLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: TraceLesson
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

  const [traces, setTraces] = useState<Traces>(
    () => loadTraces(progress, task.id) ?? emptyTraces(),
  )
  const [introOpen, setIntroOpen] = useState(
    () => !lesson.tasks.some((t) => taskProgress(progress, t.id).solved),
  )

  const traceState: TraceState = { traces }
  const ziele = useMemo(
    () =>
      task.ziele.map((z) => ({
        text: z.text,
        findings: traceZielFindings(traceState, z),
        ok: traceZielMet(traceState, z),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, traces],
  )
  const done = ziele.every((z) => z.ok)
  const isLast = index === lesson.tasks.length - 1

  function change(next: Traces) {
    setTraces(next)
    const saved = saveTraces(progress, task.id, next)
    const nowDone = isTracesSolved({ traces: next }, traceTaskRules(task))
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
    setTraces(loadTraces(progress, next.id) ?? emptyTraces())
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

      <TraceLog
        traces={traces}
        seed={progress.seed}
        studentName={progress.studentName}
        markieren={task.markieren}
        fragen={task.fragen}
        onTraces={change}
      />

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
