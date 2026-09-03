import { useMemo, useState } from 'react'
import type { Lesson } from '../model/types'
import {
  exportProgress,
  hasProgress,
  moduleStats,
  resetTasks,
  type Progress,
} from '../progress/store'

export function Home({
  lessons,
  progress,
  onProgress,
  onOpen,
}: {
  lessons: Lesson[]
  progress: Progress
  onProgress: (next: Progress) => void
  onOpen: (lessonId: string) => void
}) {
  /** Which card is asking "are you sure?" — a reset can throw away a drawing. */
  const [confirming, setConfirming] = useState<string | null>(null)

  const cards = useMemo(
    () =>
      lessons.map((lesson) => {
        const ids =
          lesson.kind === 'quiz'
            ? lesson.buildTasks(progress.seed).map((t) => t.id)
            : lesson.tasks.map((t) => t.id)
        return {
          lesson,
          ids,
          stats: moduleStats(progress, ids),
          resettable: hasProgress(progress, ids),
        }
      }),
    [lessons, progress],
  )

  const totalSolved = cards.reduce((n, c) => n + c.stats.solved, 0)
  const totalTasks = cards.reduce((n, c) => n + c.stats.total, 0)

  return (
    <div className="home">
      <div className="home-head">
        <h1>Hallo {progress.studentName}!</h1>
        <p className="lede">
          {totalSolved === 0
            ? 'Such dir ein Thema aus und leg los.'
            : `Du hast schon ${totalSolved} von ${totalTasks} Aufgaben gelöst.`}
        </p>
        <div className="export">
          <button className="ghost small" onClick={() => exportProgress(progress)}>
            Fortschritt speichern
          </button>
        </div>
      </div>

      <div className="cards">
        {cards.map(({ lesson, ids, stats, resettable }) => {
          const pct = stats.total ? Math.round((stats.solved / stats.total) * 100) : 0
          const done = stats.total > 0 && stats.solved === stats.total
          const asking = confirming === lesson.id
          return (
            <article key={lesson.id} className={`card${done ? ' card-done' : ''}`}>
              {/* The card body is the button; Reset sits beside it, since a
                  button may not be nested inside another button. */}
              <button className="card-open" onClick={() => onOpen(lesson.id)}>
                <span className="card-head">
                  <span className="badge">{lesson.module}</span>
                  {done && <span className="tick">fertig</span>}
                </span>
                <span className="card-title">{lesson.title}</span>
                <span className="card-sub">{lesson.intro.heading}</span>
                <span className="bar" role="img" aria-label={`${pct} Prozent gelöst`}>
                  <span className="bar-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="card-meta">
                  {stats.solved} / {stats.total} Aufgaben
                </span>
              </button>

              <div className="card-foot">
                {asking ? (
                  <div className="confirm" role="alertdialog" aria-label="Zurücksetzen bestätigen">
                    <p>
                      Alles in <strong>{lesson.title}</strong> löschen? Gelöste Aufgaben und
                      {lesson.kind === 'quiz' ? ' Antworten' : ' Zeichnungen'} sind dann weg.
                    </p>
                    <div className="row">
                      <button
                        className="ghost danger small"
                        onClick={() => {
                          onProgress(resetTasks(progress, ids))
                          setConfirming(null)
                        }}
                      >
                        Ja, zurücksetzen
                      </button>
                      <button className="ghost small" onClick={() => setConfirming(null)}>
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="reset"
                    disabled={!resettable}
                    title={`${lesson.title} zurücksetzen`}
                    aria-label={`${lesson.title} zurücksetzen`}
                    onClick={() => setConfirming(lesson.id)}
                  >
                    ⟲
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

    </div>
  )
}
