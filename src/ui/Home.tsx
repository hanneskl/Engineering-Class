import { useMemo, useState } from 'react'
import type { Lesson } from '../model/types'
import { taskIdsFor } from '../lessons'
import { isSubmitted, score } from '../model/test'
import {
  exportProgress,
  hasProgress,
  moduleStats,
  resetTasks,
  type Progress,
} from '../progress/store'

type Tab = 'ueben' | 'tests'

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
  /** The page-level "alles zurücksetzen" asking the same. */
  const [confirmingAll, setConfirmingAll] = useState(false)
  const [tab, setTab] = useState<Tab>('ueben')

  const cards = useMemo(
    () =>
      lessons.map((lesson) => {
        const ids = taskIdsFor(lesson, progress.seed)
        return {
          lesson,
          ids,
          stats: moduleStats(progress, ids),
          resettable: hasProgress(progress, ids),
          test:
            lesson.kind === 'test'
              ? { submitted: isSubmitted(progress, lesson), ...score(progress, lesson) }
              : null,
        }
      }),
    [lessons, progress],
  )

  const exercises = cards.filter((c) => c.lesson.kind !== 'test')
  const tests = cards.filter((c) => c.lesson.kind === 'test')
  const shown = tab === 'tests' ? tests : exercises

  const totalSolved = exercises.reduce((n, c) => n + c.stats.solved, 0)
  const totalTasks = exercises.reduce((n, c) => n + c.stats.total, 0)
  const anything = cards.some((c) => c.resettable)
  const allIds = cards.flatMap((c) => c.ids)

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
          <button
            className="ghost small danger"
            disabled={!anything || confirmingAll}
            onClick={() => setConfirmingAll(true)}
          >
            Alles zurücksetzen
          </button>
        </div>
      </div>

      {confirmingAll && (
        <div className="confirm-all" role="alertdialog" aria-label="Alles zurücksetzen bestätigen">
          <p>
            Wirklich <strong>alles</strong> löschen? Jede gelöste Aufgabe, jede Zeichnung und
            jedes Testergebnis sind dann weg.
          </p>
          <div className="row">
            <button
              className="danger-solid small"
              onClick={() => {
                onProgress(resetTasks(progress, allIds))
                setConfirmingAll(false)
              }}
            >
              Ja, alles zurücksetzen
            </button>
            <button className="ghost small" onClick={() => setConfirmingAll(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="home-tabs" role="tablist" aria-label="Bereiche">
        <button
          role="tab"
          className="home-tab"
          aria-selected={tab === 'ueben'}
          onClick={() => setTab('ueben')}
        >
          Üben
        </button>
        <button
          role="tab"
          className="home-tab"
          aria-selected={tab === 'tests'}
          onClick={() => setTab('tests')}
        >
          Tests <span className="count">{tests.length}</span>
        </button>
      </div>

      <div className={`cards${tab === 'tests' ? ' cards-few' : ''}`}>
        {shown.map(({ lesson, ids, stats, resettable, test }) => {
          const pct = stats.total ? Math.round((stats.solved / stats.total) * 100) : 0
          const done = test ? test.submitted : stats.total > 0 && stats.solved === stats.total
          const asking = confirming === lesson.id
          return (
            <article
              key={lesson.id}
              className={`card${done ? ' card-done' : ''}${test ? ' card-test' : ''}`}
            >
              {test && (
                <span className="ribbon" aria-hidden="true">
                  {test.submitted ? `${test.correct} / ${test.total}` : 'Test'}
                </span>
              )}
              {/* The card body is the button; Reset sits beside it, since a
                  button may not be nested inside another button. */}
              <button className="card-open" onClick={() => onOpen(lesson.id)}>
                <span className="card-head">
                  <span className="badge">
                    {test ? (test.submitted ? 'abgegeben' : 'Test') : lesson.module}
                  </span>
                </span>
                <span className="card-title">{lesson.title}</span>
                <span className="card-sub">{lesson.intro.heading}</span>
                <span className="bar" role="img" aria-label={`${pct} Prozent gelöst`}>
                  <span className="bar-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="card-meta">
                  {test
                    ? test.submitted
                      ? `${test.correct} von ${test.total} richtig`
                      : `${ids.filter((id) => progress.tests[id]).length} / ${test.total} beantwortet`
                    : `${stats.solved} / ${stats.total} Aufgaben`}
                  {done && !test && <span className="tick"> · fertig</span>}
                </span>
              </button>

              {/* Outside .card-open, because a button may not nest inside a
                  button — but a direct child of the card, so the confirmation
                  below can cover the whole card rather than this corner. */}
              <button
                className="reset"
                disabled={!resettable || asking}
                title={`${lesson.title} zurücksetzen`}
                aria-label={`${lesson.title} zurücksetzen`}
                onClick={() => setConfirming(lesson.id)}
              >
                ⟲
              </button>

              {asking && (
                <div className="confirm" role="alertdialog" aria-label="Zurücksetzen bestätigen">
                  <p>
                    Alles in <strong>{lesson.title}</strong> löschen?{' '}
                    {test
                      ? 'Das Ergebnis ist dann weg und der Test geht von vorn los.'
                      : `Gelöste Aufgaben und ${lesson.kind === 'quiz' ? 'Antworten' : 'Zeichnungen'} sind dann weg.`}
                  </p>
                  <div className="row">
                    <button
                      className="danger-solid small"
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
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
