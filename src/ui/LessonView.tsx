import { useMemo, useState } from 'react'
import type { QuizLesson } from '../model/types'
import { TaskCard } from './TaskCard'
import { taskProgress, withTask, type Progress } from '../progress/store'

export function LessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: QuizLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  const tasks = useMemo(() => lesson.buildTasks(progress.seed), [lesson, progress.seed])

  // Open on the first unsolved task, so coming back resumes where they stopped.
  const [index, setIndex] = useState(() => {
    const i = tasks.findIndex((t) => !taskProgress(progress, t.id).solved)
    return i === -1 ? 0 : i
  })
  const [introOpen, setIntroOpen] = useState(
    () => !tasks.some((t) => taskProgress(progress, t.id).solved),
  )

  const task = tasks[index]
  if (!task) return null

  const state = taskProgress(progress, task.id)

  function handleAttempt(correct: boolean) {
    if (!task) return
    const current = taskProgress(progress, task.id)
    onProgress(
      withTask(progress, task.id, {
        attempts: current.attempts + 1,
        solved: current.solved || correct,
      }),
    )
  }

  function handleHint(level: number) {
    if (!task) return
    const current = taskProgress(progress, task.id)
    onProgress(withTask(progress, task.id, { hintsUsed: Math.max(current.hintsUsed, level) }))
  }

  function goNext() {
    setIndex((i) => Math.min(i + 1, tasks.length - 1))
  }

  const solvedCount = tasks.filter((t) => taskProgress(progress, t.id).solved).length
  const allDone = solvedCount === tasks.length

  return (
    <div className="lesson">
      <button className="back" onClick={onBack}>
        ← Übersicht
      </button>

      <div className="lesson-head">
        <span className="badge">{lesson.module}</span>
        <h1>{lesson.title}</h1>
      </div>

      <details className="intro" open={introOpen} onToggle={(e) => setIntroOpen(e.currentTarget.open)}>
        <summary>{lesson.intro.heading}</summary>
        {lesson.intro.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p className="quali">
          <strong>Für den Quali:</strong> {lesson.quali}
        </p>
      </details>

      <ol className="dots" aria-label="Aufgaben">
        {tasks.map((t, i) => {
          const s = taskProgress(progress, t.id)
          const cls = s.solved ? 'dot done' : i === index ? 'dot here' : 'dot'
          return (
            <li key={t.id}>
              <button
                className={cls}
                aria-label={`Aufgabe ${i + 1}${s.solved ? ', gelöst' : ''}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
              >
                {i + 1}
              </button>
            </li>
          )
        })}
      </ol>

      <TaskCard
        key={task.id}
        task={task}
        solved={state.solved}
        hintsUsed={state.hintsUsed}
        onAttempt={handleAttempt}
        onHint={handleHint}
        onNext={goNext}
        isLast={index === tasks.length - 1}
      />

      {allDone && (
        <div className="done-banner">
          <strong>Alle {tasks.length} Aufgaben gelöst.</strong>
          <p>
            Du kannst jede Aufgabe oben noch einmal anschauen — oder zurück zur Übersicht.
          </p>
          <button className="primary" onClick={onBack}>
            Zur Übersicht
          </button>
        </div>
      )}
    </div>
  )
}
