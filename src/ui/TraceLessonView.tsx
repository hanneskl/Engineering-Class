import { useMemo, useState } from 'react'
import {
  type TraceLesson,
  traceTaskRules,
  traceZielFindings,
  traceZielMet,
} from '../model/types'
import { emptyTraces, type Traces } from '../model/traces'
import { isTracesSolved, type TraceState } from '../model/traceRules'
import { TraceFragen, TraceLog } from '../editor/TraceLog'
import { LessonShell } from './LessonShell'
import {
  loadTraces,
  saveTraces,
  taskProgress,
  withTask,
  type Progress,
} from '../progress/store'

/** The lesson shell over the trail the student leaves while surfing. */
export function TraceLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: TraceLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  const [index, setIndex] = useState(() => {
    const i = lesson.tasks.findIndex((t) => !taskProgress(progress, t.id).solved)
    return i === -1 ? 0 : i
  })
  const task = lesson.tasks[index]!

  const [traces, setTraces] = useState<Traces>(
    () => loadTraces(progress, task.id) ?? emptyTraces(),
  )

  const traceState: TraceState = { traces }
  const ziele = useMemo(
    () =>
      task.ziele.map((z) => ({
        text: z.text,
        ok: traceZielMet(traceState, z),
        why: traceZielFindings(traceState, z)[0]?.message,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, traces],
  )
  const done = ziele.every((z) => z.ok)

  function change(next: Traces) {
    setTraces(next)
    const saved = saveTraces(progress, task.id, next)
    const nowDone = isTracesSolved({ traces: next }, traceTaskRules(task))
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
    setTraces(loadTraces(progress, next.id) ?? emptyTraces())
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
      aside={
        task.fragen?.length ? (
          <TraceFragen traces={traces} fragen={task.fragen} onTraces={change} />
        ) : undefined
      }
    >
      <TraceLog
        traces={traces}
        seed={progress.seed}
        studentName={progress.studentName}
        fokus={task.fokus}
        markieren={task.markieren}
        onTraces={change}
      />
    </LessonShell>
  )
}
