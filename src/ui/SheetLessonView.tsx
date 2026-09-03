import { useMemo, useRef, useState } from 'react'
import { gradeSubmission, scenarioById, totalPoints } from '@quali/scenarios'
import type { SheetLesson } from '../model/types'
import { SheetEditor, type Work } from '../spreadsheet/SheetEditor'
import { submitAttempt } from '../spreadsheet/backend'
import { LessonShell } from './LessonShell'
import { loadSheet, saveSheet, taskProgress, withTask, type Progress } from '../progress/store'

const EMPTY: Work = { inputs: {}, styles: {}, merges: [], charts: [], conditionalFormats: [] }

/** The lesson shell over the spreadsheet — M10. */
export function SheetLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: SheetLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  const [index, setIndex] = useState(() => {
    const i = lesson.tasks.findIndex((t) => !taskProgress(progress, t.id).solved)
    return i === -1 ? 0 : i
  })
  const task = lesson.tasks[index]!
  const scenario = useMemo(() => scenarioById(task.scenarioId), [task.scenarioId])

  const [work, setWork] = useState<Work>(() => loadSheet(progress, task.id) ?? EMPTY)
  const [resetNonce, setResetNonce] = useState(0)

  /**
   * The checklist is the scenario's own Arbeitsaufträge, graded live.
   *
   * `gradeSubmission` re-seeds the scenario and re-runs its checks, so this is
   * the same verdict the server would give — it just arrives while the student
   * types instead of after they press a button.
   */
  const grades = useMemo(
    () =>
      scenario.tasks.map((t) =>
        gradeSubmission({ scenarioId: scenario.id, taskId: t.id, ...work }),
      ),
    [scenario, work],
  )

  const ziele = scenario.tasks.map((t, i) => ({
    text: t.promptDe,
    ok: grades[i]!.passed,
    why: grades[i]!.message || undefined,
  }))
  const done = ziele.every((z) => z.ok)
  const earned = grades.reduce((sum, g) => sum + g.points, 0)

  /**
   * Which scenario tasks have already been sent to the server, so a keystroke
   * does not re-post one that is already recorded. Without a Supabase project
   * configured `submitAttempt` is a no-op and this stays empty.
   */
  const submitted = useRef(new Set<string>())

  function change(next: Work) {
    setWork(next)
    const saved = saveSheet(progress, task.id, next)

    const passedAll = scenario.tasks.every(
      (t) => gradeSubmission({ scenarioId: scenario.id, taskId: t.id, ...next }).passed,
    )
    onProgress(
      passedAll && !taskProgress(saved, task.id).solved
        ? withTask(saved, task.id, { solved: true })
        : saved,
    )

    for (const t of scenario.tasks) {
      const key = `${scenario.id}/${t.id}`
      if (submitted.current.has(key)) continue
      if (!gradeSubmission({ scenarioId: scenario.id, taskId: t.id, ...next }).passed) continue
      submitted.current.add(key)
      void submitAttempt(scenario.id, t.id, next)
    }
  }

  function openTask(i: number) {
    const next = lesson.tasks[i]
    if (!next) return
    setIndex(i)
    setWork(loadSheet(progress, next.id) ?? EMPTY)
  }

  const shellTasks = lesson.tasks.map((t) => {
    const s = scenarioById(t.scenarioId)
    return {
      id: t.id,
      title: s.titleDe,
      brief: `${s.subtitleDe}. Alle Berechnungen sind mit Formeln durchzuführen!`,
      hints: t.hints,
    }
  })

  return (
    <LessonShell
      module={lesson.module}
      title={lesson.title}
      intro={lesson.intro}
      quali={lesson.quali}
      tasks={shellTasks}
      index={index}
      onOpenTask={openTask}
      ziele={ziele}
      done={done}
      doneText={`Alle ${totalPoints(scenario)} Punkte. Geschafft.`}
      progress={progress}
      onProgress={onProgress}
      onBack={onBack}
    >
      <div className="sheet-meta">
        <span className="score">
          {earned} / {totalPoints(scenario)} Punkte
        </span>
        <button
          className="ghost small"
          onClick={() => {
            setResetNonce((n) => n + 1)
            setWork(EMPTY)
            onProgress(saveSheet(progress, task.id, EMPTY))
          }}
        >
          Blatt zurücksetzen
        </button>
      </div>

      <SheetEditor
        key={task.id}
        scenarioId={task.scenarioId}
        resetNonce={resetNonce}
        initialWork={loadSheet(progress, task.id)}
        onWork={change}
      />
    </LessonShell>
  )
}
