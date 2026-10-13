import { useEffect, useMemo, useState } from 'react'
import type { TestLesson } from '../model/types'
import { answer, chosenOption, isSubmitted, nextOpen, optionOrder, score } from '../model/test'
import type { Progress } from '../progress/store'
import { reportActiveTask } from '../progress/presence'
import { DeviceBild } from '../editor/DeviceBild'
import { ThemeToggle } from './ThemeToggle'

/**
 * A test, start to finish: a start page, one question per screen with no
 * way back, and the result page — which is also where anyone who already
 * handed in lands when they open the module again.
 */
export function TestLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: TestLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  const open = nextOpen(progress, lesson)
  const submitted = isSubmitted(progress, lesson)
  // Someone who answered a question and reloaded is mid-test, not at the start.
  const [started, setStarted] = useState(submitted || open > 0)
  /** The option tapped on the current question — provisional until "Weiter". */
  const [picked, setPicked] = useState<number | null>(null)

  const task = open >= 0 ? lesson.tasks[open] : undefined
  const order = useMemo(
    () => (task ? optionOrder(progress.seed, task) : []),
    [progress.seed, task],
  )

  useEffect(() => {
    reportActiveTask(lesson.module, task ? task.id : `${lesson.id}-ergebnis`)
  }, [lesson.module, lesson.id, task?.id])

  function commit() {
    if (!task || picked === null) return
    onProgress(answer(progress, task, picked))
    setPicked(null)
  }

  const head = (
    <>
      <div className="rail-top">
        <button className="back" onClick={onBack}>
          ← Übersicht
        </button>
        <ThemeToggle />
      </div>
      <div className="lesson-head">
        <span className="badge">Test</span>
        <h1>{lesson.title}</h1>
      </div>
    </>
  )

  if (submitted) {
    const { correct, total } = score(progress, lesson)
    return (
      <div className="lesson lesson-quiz">
        {head}
        <div className="done-banner test-result">
          <strong>
            {correct} von {total} richtig
          </strong>
          <p>Unten siehst du jede Frage mit deiner Antwort und der Erklärung dazu.</p>
        </div>
        <ol className="test-review">
          {lesson.tasks.map((t, i) => {
            const own = chosenOption(progress, t)
            const right = t.frage.optionen.find((o) => o.ok)
            return (
              <li key={t.id} className={`task review-item${own?.ok ? ' review-ok' : ' review-bad'}`}>
                <p className="test-count">Frage {i + 1}</p>
                {t.bild && (
                  <div className="test-bild">
                    <DeviceBild type={t.bild} size={72} />
                  </div>
                )}
                <h2>{t.frage.text}</h2>
                <p className={`review-answer ${own?.ok ? 'ok' : 'bad'}`}>
                  {own?.ok ? '✓' : '✗'} Deine Antwort: <strong>{own?.text}</strong>
                </p>
                {!own?.ok && right && (
                  <p className="review-answer right">Richtig wäre: <strong>{right.text}</strong></p>
                )}
                {own && <p className="review-warum">{own.warum}</p>}
              </li>
            )
          })}
        </ol>
        <button className="primary" onClick={onBack}>
          Zur Übersicht
        </button>
      </div>
    )
  }

  if (!started || !task) {
    return (
      <div className="lesson lesson-quiz">
        {head}
        <section className="task test-start">
          <h2>{lesson.intro.heading}</h2>
          {lesson.intro.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="task-note">
            {lesson.tasks.length} Fragen · jede Frage nur ein Versuch · keine Hinweise
          </p>
          <button className="primary" onClick={() => setStarted(true)}>
            Test starten
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="lesson lesson-quiz">
      {head}
      <section className="task" key={task.id}>
        <p className="test-count">
          Frage {open + 1} von {lesson.tasks.length}
        </p>
        {task.bild && (
          <div className="test-bild">
            <DeviceBild type={task.bild} size={120} />
          </div>
        )}
        <h2>{task.frage.text}</h2>
        <div className="choices" role="radiogroup" aria-label="Antworten">
          {order.map((i) => {
            const o = task.frage.optionen[i]!
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={picked === i}
                className={`choice${picked === i ? ' sel' : ''}`}
                onClick={() => setPicked(i)}
              >
                {o.text}
              </button>
            )
          })}
        </div>
        <p className="task-note">Nur ein Versuch — nach „Weiter“ steht die Antwort fest.</p>
        <button className="primary" onClick={commit} disabled={picked === null}>
          {open === lesson.tasks.length - 1 ? 'Abgeben' : 'Weiter'}
        </button>
      </section>
    </div>
  )
}
