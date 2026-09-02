import { useMemo, useState } from 'react'
import { type WebLesson, webTaskRules, webZielFindings, webZielMet } from '../model/types'
import { contextFrom, emptyWalk, type Walk } from '../model/web'
import { isWebSolved, type WebState } from '../model/webRules'
import { PacketWalk } from '../editor/PacketWalk'
import { StepOrder } from '../editor/StepOrder'
import { LessonShell } from './LessonShell'
import {
  latestPlan,
  loadWalk,
  saveWalk,
  taskProgress,
  withTask,
  type Progress,
} from '../progress/store'

/** The lesson shell over the walk from a URL to the finished page. */
export function WebLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: WebLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  /** The walk starts at the machine the student drew in M2, if they drew one. */
  const plan = useMemo(() => latestPlan(progress), [progress])

  const [index, setIndex] = useState(() => {
    const i = lesson.tasks.findIndex((t) => !taskProgress(progress, t.id).solved)
    return i === -1 ? 0 : i
  })
  const task = lesson.tasks[index]!

  const [walk, setWalk] = useState<Walk>(() => loadWalk(progress, task.id) ?? emptyWalk())

  const ctx = useMemo(
    () => contextFrom(plan, walk.host, walk.protocol),
    [plan, walk.host, walk.protocol],
  )
  const webState: WebState = { walk }
  const ziele = useMemo(
    () =>
      task.ziele.map((z) => ({
        text: z.text,
        ok: webZielMet(webState, z),
        why: webZielFindings(webState, z)[0]?.message,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, walk],
  )
  const done = ziele.every((z) => z.ok)

  function change(next: Walk) {
    setWalk(next)
    const saved = saveWalk(progress, task.id, next)
    const nowDone = isWebSolved({ walk: next }, webTaskRules(task))
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
    setWalk(loadWalk(progress, next.id) ?? emptyWalk())
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
      <PacketWalk ctx={ctx} walk={walk} onWalk={change} />
      {task.reihenfolge && <StepOrder walk={walk} seed={progress.seed} onWalk={change} />}
    </LessonShell>
  )
}
