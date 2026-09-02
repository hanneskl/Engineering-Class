import { useMemo, useState } from 'react'
import {
  type MatchLesson,
  matchTaskRules,
  matchZielFindings,
  matchZielMet,
} from '../model/types'
import { emptyMatches, type Matches } from '../model/match'
import { isMatchSolved, type MatchState } from '../model/matchRules'
import { MatchBoard } from '../editor/MatchBoard'
import { LessonShell } from './LessonShell'
import {
  loadMatches,
  saveMatches,
  taskProgress,
  withTask,
  type Progress,
} from '../progress/store'

/** The lesson shell over a Zuordnung board. */
export function MatchLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: MatchLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  const [index, setIndex] = useState(() => {
    const i = lesson.tasks.findIndex((t) => !taskProgress(progress, t.id).solved)
    return i === -1 ? 0 : i
  })
  const task = lesson.tasks[index]!

  const [matches, setMatches] = useState<Matches>(
    () => loadMatches(progress, task.id) ?? emptyMatches(),
  )

  const matchState: MatchState = { matches }
  const ziele = useMemo(
    () =>
      task.ziele.map((z) => ({
        text: z.text,
        ok: matchZielMet(matchState, z),
        why: matchZielFindings(matchState, z)[0]?.message,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, matches],
  )
  const done = ziele.every((z) => z.ok)

  function change(next: Matches) {
    setMatches(next)
    const saved = saveMatches(progress, task.id, next)
    const nowDone = isMatchSolved({ matches: next }, matchTaskRules(task))
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
    setMatches(loadMatches(progress, next.id) ?? emptyMatches())
  }

  return (
    <LessonShell
      module={lesson.module}
      title={lesson.title}
      intro={lesson.intro}
      quali={lesson.quali}
      tasks={lesson.tasks}
      index={index}
      onOpenTask={openTask}
      ziele={ziele}
      done={done}
      progress={progress}
      onProgress={onProgress}
      onBack={onBack}
    >
      <MatchBoard
        zuordnung={task.zuordnung}
        matches={matches}
        seed={progress.seed}
        fragen={task.fragen}
        onMatches={change}
      />
    </LessonShell>
  )
}
