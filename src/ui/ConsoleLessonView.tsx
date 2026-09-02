import { useMemo, useState } from 'react'
import {
  type ConsoleLesson,
  consoleTaskRules,
  consoleZielFindings,
  consoleZielMet,
} from '../model/types'
import { emptySession, terminals, type Session } from '../model/console'
import { isConsoleSolved, type ConsoleState } from '../model/consoleRules'
import { Console } from '../editor/Console'
import { LessonShell } from './LessonShell'
import {
  clonePlan,
  latestPlan,
  loadSession,
  saveSession,
  taskProgress,
  withTask,
  type Progress,
} from '../progress/store'

/** The lesson shell over a command line running on the student's own network. */
export function ConsoleLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: ConsoleLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  /**
   * Their own home network if they drew one in M2, otherwise the prepared one.
   * Running ipconfig against a network you built yourself is the whole point.
   */
  const plan = useMemo(
    () => latestPlan(progress) ?? clonePlan(lesson.starter),
    [progress, lesson.starter],
  )

  const [index, setIndex] = useState(() => {
    const i = lesson.tasks.findIndex((t) => !taskProgress(progress, t.id).solved)
    return i === -1 ? 0 : i
  })
  const task = lesson.tasks[index]!

  const [session, setSession] = useState<Session>(() => startSession(progress, task.id, plan))

  const consoleState: ConsoleState = { plan, session }
  const ziele = useMemo(
    () =>
      task.ziele.map((z) => ({
        text: z.text,
        ok: consoleZielMet(consoleState, z),
        why: consoleZielFindings(consoleState, z)[0]?.message,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, plan, session],
  )
  const done = ziele.every((z) => z.ok)

  function change(next: Session) {
    setSession(next)
    const saved = saveSession(progress, task.id, next)
    const nowDone = isConsoleSolved({ plan, session: next }, consoleTaskRules(task))
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
    setSession(startSession(progress, next.id, plan))
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
      <Console plan={plan} session={session} onSession={change} />
    </LessonShell>
  )
}

/** Resumes a saved session, or starts one already sitting at a real machine. */
function startSession(
  progress: Progress,
  taskId: string,
  plan: import('../model/plan').Plan,
): Session {
  const saved = loadSession(progress, taskId)
  if (saved) return saved
  return { ...emptySession(), atDeviceId: terminals(plan)[0]?.id ?? null }
}
