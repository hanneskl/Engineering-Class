import { useMemo, useState } from 'react'
import { type BuildLesson, taskRules, zielFindings, zielMet } from '../model/types'
import { emptyPlan, type Plan } from '../model/plan'
import { NetworkEditor } from '../editor/NetworkEditor'
import { checkAlways, isTaskSolved } from '../model/rules'
import { LessonShell } from './LessonShell'
import {
  clonePlan,
  loadPlan,
  savePlan,
  taskProgress,
  withTask,
  type Progress,
} from '../progress/store'

/**
 * What is on the canvas when a task opens.
 *
 * A saved plan always wins. Otherwise a task marked startFrom: 'previous'
 * inherits a copy of the most recent network the student actually built —
 * without that, briefs like "Erweitere das Netz" open on an empty canvas and
 * the instruction reads as a lie.
 */
function initialPlan(progress: Progress, lesson: BuildLesson, index: number): Plan {
  const task = lesson.tasks[index]
  if (!task) return emptyPlan()

  const saved = loadPlan(progress, task.id)
  if (saved) return saved
  if (task.starter) return clonePlan(task.starter)

  if (task.startFrom === 'previous') {
    for (let i = index - 1; i >= 0; i--) {
      const earlier = loadPlan(progress, lesson.tasks[i]!.id)
      if (earlier && earlier.devices.length > 0) return clonePlan(earlier)
    }
  }
  return emptyPlan()
}

export function BuildLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: BuildLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  const [index, setIndex] = useState(() => {
    const i = lesson.tasks.findIndex((t) => !taskProgress(progress, t.id).solved)
    return i === -1 ? 0 : i
  })
  const task = lesson.tasks[index]!
  const [plan, setPlan] = useState<Plan>(() => initialPlan(progress, lesson, index))

  /** Each goal with whatever is currently standing in its way. */
  const ziele = useMemo(
    () =>
      task.ziele.map((z) => ({
        text: z.text,
        findings: zielFindings(plan, z),
        ok: zielMet(plan, z),
      })),
    [task, plan],
  )

  /**
   * Faults that no goal covers — a duplicate address in a task that never
   * mentioned addressing, a cabled phone, a switch out of ports. Filtered by
   * code so a problem already shown under a goal is not repeated here.
   */
  const general = useMemo(() => {
    const claimed = new Set(ziele.flatMap((z) => z.findings.map((f) => f.code)))
    return checkAlways(plan).filter((f) => !claimed.has(f.code))
  }, [plan, ziele])

  const findings = useMemo(
    () => [...ziele.flatMap((z) => z.findings), ...general],
    [ziele, general],
  )
  const done = plan.devices.length > 0 && findings.length === 0

  function change(next: Plan) {
    setPlan(next)
    const saved = savePlan(progress, task.id, next)
    const nowDone = isTaskSolved(next, taskRules(task))
    onProgress(
      nowDone && !taskProgress(saved, task.id).solved
        ? withTask(saved, task.id, { solved: true })
        : saved,
    )
  }

  function openTask(i: number) {
    if (!lesson.tasks[i]) return
    setIndex(i)
    setPlan(initialPlan(progress, lesson, i))
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
      ziele={ziele.map((z) => ({ text: z.text, ok: z.ok, why: z.findings[0]?.message }))}
      probleme={general}
      done={done}
      doneText="Geschafft — der Plan stimmt."
      progress={progress}
      onProgress={onProgress}
      onBack={onBack}
    >
      <NetworkEditor plan={plan} onChange={change} findings={findings} />
    </LessonShell>
  )
}
