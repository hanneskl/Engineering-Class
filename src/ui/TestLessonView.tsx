import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TestLesson } from '../model/types'
import {
  CELEBRATE_FROM,
  allAnswered,
  answer,
  chosenOption,
  isAnswered,
  isSubmitted,
  nextOpen,
  optionOrder,
  score,
  submit,
} from '../model/test'
import type { Progress } from '../progress/store'
import { reportActiveTask } from '../progress/presence'
import { DeviceBild } from '../editor/DeviceBild'
import { ThemeToggle } from './ThemeToggle'
import { Confetti } from './Confetti'
import { playFanfare } from './fanfare'

/**
 * A test, start to finish: a start page, the questions — free to move back
 * and forth and change a pick until "Abgeben" — and the result page, which
 * is also where anyone who already handed in lands when they open the
 * module again.
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
  const submitted = isSubmitted(progress, lesson)
  // Someone who answered a question and reloaded is mid-test, not at the start.
  const [started, setStarted] = useState(
    () => submitted || lesson.tasks.some((t) => isAnswered(progress, t.id)),
  )
  const [index, setIndex] = useState(() => {
    const open = nextOpen(progress, lesson)
    return open === -1 ? lesson.tasks.length - 1 : open
  })
  const [celebrate, setCelebrate] = useState(false)
  const stopCelebrating = useCallback(() => setCelebrate(false), [])

  const task = lesson.tasks[index]!
  const order = useMemo(() => optionOrder(progress.seed, task), [progress.seed, task])
  const chosen = progress.tests[task.id]?.chosen

  useEffect(() => {
    reportActiveTask(lesson.module, submitted ? `${lesson.id}-ergebnis` : task.id)
  }, [lesson.module, lesson.id, task.id, submitted])

  function handIn() {
    const next = submit(progress, lesson)
    onProgress(next)
    if (score(next, lesson).correct >= CELEBRATE_FROM) {
      setCelebrate(true)
      playFanfare()
    }
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
        {celebrate && <Confetti onDone={stopCelebrating} />}
        {head}
        <div className="done-banner test-result">
          <strong>
            {correct} von {total} richtig
          </strong>
          <p>
            {correct >= CELEBRATE_FROM
              ? 'Stark! Unten siehst du jede Frage mit deiner Antwort und der Erklärung dazu.'
              : 'Unten siehst du jede Frage mit deiner Antwort und der Erklärung dazu.'}
          </p>
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
                  <p className="review-answer right">
                    Richtig wäre: <strong>{right.text}</strong>
                  </p>
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

  if (!started) {
    return (
      <div className="lesson lesson-quiz">
        {head}
        <section className="task test-start">
          <h2>{lesson.intro.heading}</h2>
          {lesson.intro.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="task-note">
            {lesson.tasks.length} Fragen · Antworten kannst du bis zum Abgeben noch ändern · keine Hinweise
          </p>
          <button className="primary" onClick={() => setStarted(true)}>
            Test starten
          </button>
        </section>
      </div>
    )
  }

  const isLast = index === lesson.tasks.length - 1
  const open = lesson.tasks.filter((t) => !isAnswered(progress, t.id)).length

  return (
    <div className="lesson lesson-quiz">
      {head}

      <ol className="dots" aria-label="Fragen">
        {lesson.tasks.map((t, i) => {
          const done = isAnswered(progress, t.id)
          const cls = `dot${done ? ' answered' : ''}${i === index ? ' here' : ''}`
          return (
            <li key={t.id}>
              <button
                className={cls}
                aria-label={`Frage ${i + 1}${done ? ', beantwortet' : ''}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
              >
                {i + 1}
              </button>
            </li>
          )
        })}
      </ol>

      <section className="task" key={task.id}>
        <p className="test-count">
          Frage {index + 1} von {lesson.tasks.length}
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
                aria-checked={chosen === i}
                className={`choice${chosen === i ? ' sel' : ''}`}
                onClick={() => onProgress(answer(progress, task, i))}
              >
                {o.text}
              </button>
            )
          })}
        </div>

        <div className="test-nav">
          <button className="ghost" onClick={() => setIndex(index - 1)} disabled={index === 0}>
            ← Zurück
          </button>
          {isLast ? (
            <button className="primary" onClick={handIn} disabled={!allAnswered(progress, lesson)}>
              {open > 0 ? `Noch ${open} ${open === 1 ? 'Frage' : 'Fragen'} offen` : 'Abgeben'}
            </button>
          ) : (
            <button className="primary" onClick={() => setIndex(index + 1)}>
              Weiter →
            </button>
          )}
        </div>
        {isLast && open === 0 && (
          <p className="task-note">Nach dem Abgeben kannst du nichts mehr ändern.</p>
        )}
      </section>
    </div>
  )
}
