import { useMemo, useState } from 'react'
import {
  type FlowLesson,
  flowTaskRules,
  flowZielFindings,
  flowZielMet,
} from '../model/types'
import { cloneFlow, emptyFlow, type Flow } from '../model/flow'
import { checkFlowAlways, isFlowSolved } from '../model/flowRules'
import { FlowEditor } from '../editor/FlowEditor'
import { loadFlow, saveFlow, taskProgress, withTask, type Progress } from '../progress/store'

const HINT_LABELS = ['Stups', 'Hinweis', 'Lösung'] as const

/**
 * Same shape as BuildLessonView — checklist in the task card, live validation,
 * hint ladder — but over a flowchart instead of a network.
 */
export function FlowLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: FlowLesson
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

  const [flow, setFlow] = useState<Flow>(
    () => loadFlow(progress, task.id) ?? (task.starter ? cloneFlow(task.starter) : emptyFlow()),
  )
  const [introOpen, setIntroOpen] = useState(
    () => !lesson.tasks.some((t) => taskProgress(progress, t.id).solved),
  )

  const ziele = useMemo(
    () =>
      task.ziele.map((z) => ({
        text: z.text,
        findings: flowZielFindings(flow, z),
        ok: flowZielMet(flow, z),
      })),
    [task, flow],
  )

  const general = useMemo(() => {
    const claimed = new Set(ziele.flatMap((z) => z.findings.map((f) => f.code)))
    return checkFlowAlways(flow).filter((f) => !claimed.has(f.code))
  }, [flow, ziele])

  const findings = useMemo(
    () => [...ziele.flatMap((z) => z.findings), ...general],
    [ziele, general],
  )
  const done = flow.nodes.length > 0 && findings.length === 0
  const isLast = index === lesson.tasks.length - 1

  function change(next: Flow) {
    setFlow(next)
    const saved = saveFlow(progress, task.id, next)
    const nowDone = isFlowSolved(next, flowTaskRules(task))
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
    setFlow(loadFlow(progress, next.id) ?? (next.starter ? cloneFlow(next.starter) : emptyFlow()))
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
            <strong>Geschafft — der Ablauf stimmt.</strong>
            {!isLast && (
              <button className="primary" onClick={() => openTask(index + 1)}>
                Weiter
              </button>
            )}
          </div>
        )}
      </section>

      <FlowEditor flow={flow} onChange={change} findings={findings} />

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
