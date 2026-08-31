import { useMemo } from 'react'
import type { Lesson } from '../model/types'
import { exportProgress, moduleStats, type Progress } from '../progress/store'

export function Home({
  lessons,
  progress,
  onOpen,
}: {
  lessons: Lesson[]
  progress: Progress
  onOpen: (lessonId: string) => void
}) {
  const cards = useMemo(
    () =>
      lessons.map((lesson) => {
        const ids = lesson.buildTasks(progress.seed).map((t) => t.id)
        return { lesson, stats: moduleStats(progress, ids) }
      }),
    [lessons, progress],
  )

  const totalSolved = cards.reduce((n, c) => n + c.stats.solved, 0)
  const totalTasks = cards.reduce((n, c) => n + c.stats.total, 0)

  return (
    <div className="home">
      <h1>Hallo {progress.studentName}!</h1>
      <p className="lede">
        {totalSolved === 0
          ? 'Such dir ein Thema aus und leg los.'
          : `Du hast schon ${totalSolved} von ${totalTasks} Aufgaben gelöst.`}
      </p>

      <div className="cards">
        {cards.map(({ lesson, stats }) => {
          const pct = stats.total ? Math.round((stats.solved / stats.total) * 100) : 0
          const done = stats.total > 0 && stats.solved === stats.total
          return (
            <button
              key={lesson.id}
              className={`card${done ? ' card-done' : ''}`}
              onClick={() => onOpen(lesson.id)}
            >
              <div className="card-head">
                <span className="badge">{lesson.module}</span>
                {done && <span className="tick">fertig</span>}
              </div>
              <h2>{lesson.title}</h2>
              <p>{lesson.intro.heading}</p>
              <div className="bar" role="img" aria-label={`${pct} Prozent gelöst`}>
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="card-meta">
                {stats.solved} / {stats.total} Aufgaben
              </span>
            </button>
          )
        })}
      </div>

      <section className="soon">
        <h3>Kommt später dazu</h3>
        <p>
          Netzwerk zeichnen, IP-Adressen vergeben, ping und tracert, und der Weg einer
          Internetseite von der Adresse bis zum Bildschirm.
        </p>
      </section>

      <div className="export">
        <button className="ghost" onClick={() => exportProgress(progress)}>
          Fortschritt als Datei speichern
        </button>
        <p>
          Damit sicherst du deinen Stand — praktisch, wenn du an einem anderen Computer
          weitermachst oder ihn abgeben sollst.
        </p>
      </div>
    </div>
  )
}
