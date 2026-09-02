import { useCallback, useMemo, useState } from 'react'
import { LESSONS, lessonById } from './lessons'
import { NameGate } from './ui/NameGate'
import { Home } from './ui/Home'
import { LessonView } from './ui/LessonView'
import { BuildLessonView } from './ui/BuildLessonView'
import { FlowLessonView } from './ui/FlowLessonView'
import { ConsoleLessonView } from './ui/ConsoleLessonView'
import { WebLessonView } from './ui/WebLessonView'
import { TraceLessonView } from './ui/TraceLessonView'
import { load, save, lastStudent, type Progress } from './progress/store'

type View = { kind: 'home' } | { kind: 'lesson'; lessonId: string }

export function App() {
  const [progress, setProgress] = useState<Progress | null>(() => {
    const name = lastStudent()
    return name ? load(name) : null
  })
  const [view, setView] = useState<View>({ kind: 'home' })

  const update = useCallback((next: Progress) => {
    setProgress(next)
    save(next)
  }, [])

  const start = useCallback((name: string) => {
    const loaded = load(name)
    save(loaded)
    setProgress(loaded)
    setView({ kind: 'home' })
  }, [])

  const signOut = useCallback(() => {
    setProgress(null)
    setView({ kind: 'home' })
  }, [])

  const lesson = useMemo(
    () => (view.kind === 'lesson' ? lessonById(view.lessonId) : undefined),
    [view],
  )

  if (!progress) return <NameGate onStart={start} />

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setView({ kind: 'home' })}
          aria-label="Zur Übersicht"
        >
          Netzwerk<span>-Trainer</span>
        </button>
        <div className="topbar-right">
          <span className="who">{progress.studentName}</span>
          <button className="link" onClick={signOut}>
            wechseln
          </button>
        </div>
      </header>

      <main className={lesson && lesson.kind !== 'quiz' ? 'wide' : undefined}>
        {lesson ? (
          lesson.kind === 'traces' ? (
            <TraceLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => setView({ kind: 'home' })}
            />
          ) : lesson.kind === 'web' ? (
            <WebLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => setView({ kind: 'home' })}
            />
          ) : lesson.kind === 'console' ? (
            <ConsoleLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => setView({ kind: 'home' })}
            />
          ) : lesson.kind === 'flow' ? (
            <FlowLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => setView({ kind: 'home' })}
            />
          ) : lesson.kind === 'build' ? (
            <BuildLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => setView({ kind: 'home' })}
            />
          ) : (
            <LessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => setView({ kind: 'home' })}
            />
          )
        ) : (
          <Home
            lessons={LESSONS}
            progress={progress}
            onProgress={update}
            onOpen={(id) => setView({ kind: 'lesson', lessonId: id })}
          />
        )}
      </main>

      <footer className="foot">
        Informatik 9 · Vorbereitung auf den Quali · Mittelschule Glonn
      </footer>
    </div>
  )
}
