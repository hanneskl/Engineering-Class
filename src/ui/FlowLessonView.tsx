import { useMemo, useState } from 'react'
import {
  type FlowLesson,
  flowTaskRules,
  flowZielFindings,
  flowZielMet,
} from '../model/types'
import { cloneFlow, emptyFlow, type Flow } from '../model/flow'
import { checkFlowAlways, isFlowSolved } from '../model/flowRules'
import { FlowEditor } from '../editor/FlowEditor'
import { LessonShell } from './LessonShell'
import { loadFlow, saveFlow, taskProgress, withTask, type Progress } from '../progress/store'

/** The lesson shell over a flowchart instead of a network. */
export function FlowLessonView({
  lesson,
  progress,
  onProgress,
  onBack,
}: {
  lesson: FlowLesson
  progress: Progress
  onProgress: (next: Progress) => void
  onBack: () => void
}) {
  const [index, setIndex] = useState(() => {
    const i = lesson.tasks.findIndex((t) => !taskProgress(progress, t.id).solved)
    return i === -1 ? 0 : i
  })
  const task = lesson.tasks[index]!

  const [flow, setFlow] = useState<Flow>(
    () => loadFlow(progress, task.id) ?? (task.starter ? cloneFlow(task.starter) : emptyFlow()),
  )

  const ziele = useMemo(
    () =>
      task.ziele.map((z) => ({
        text: z.text,
        findings: flowZielFindings(flow, z),
        ok: flowZielMet(flow, z),
      })),
    [task, flow],
  )

  const general = useMemo(() => {
    const claimed = new Set(ziele.flatMap((z) => z.findings.map((f) => f.code)))
    return checkFlowAlways(flow).filter((f) => !claimed.has(f.code))
  }, [flow, ziele])

  const findings = useMemo(
    () => [...ziele.flatMap((z) => z.findings), ...general],
    [ziele, general],
  )
  const done = flow.nodes.length > 0 && findings.length === 0

  function change(next: Flow) {
    setFlow(next)
    const saved = saveFlow(progress, task.id, next)
    const nowDone = isFlowSolved(next, flowTaskRules(task))
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
    setFlow(loadFlow(progress, next.id) ?? (next.starter ? cloneFlow(next.starter) : emptyFlow()))
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
      doneText="Geschafft — der Ablauf stimmt."
      progress={progress}
      onProgress={onProgress}
      onBack={onBack}
    >
      <FlowEditor flow={flow} onChange={change} findings={findings} />
    </LessonShell>
  )
}
