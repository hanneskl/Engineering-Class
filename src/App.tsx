import { useCallback, useEffect, useMemo, useState } from 'react'
import { LESSONS, lessonById } from './lessons'
import { hashForRoute, routeFromHash, type Route } from './nav'
import { NameGate } from './ui/NameGate'
import { Home } from './ui/Home'
import { LessonView } from './ui/LessonView'
import { BuildLessonView } from './ui/BuildLessonView'
import { FlowLessonView } from './ui/FlowLessonView'
import { ConsoleLessonView } from './ui/ConsoleLessonView'
import { WebLessonView } from './ui/WebLessonView'
import { TraceLessonView } from './ui/TraceLessonView'
import { MatchLessonView } from './ui/MatchLessonView'
import { SheetLessonView } from './ui/SheetLessonView'
import { load, save, lastStudent, type Progress } from './progress/store'

const isValidLesson = (id: string) => Boolean(lessonById(id))

export function App() {
  const [progress, setProgress] = useState<Progress | null>(() => {
    const name = lastStudent()
    return name ? load(name) : null
  })

  /*
   * The address bar is the only place this state lives — `view` just mirrors
   * it. That is what makes the browser's own Back and Forward work: they are
   * not special-cased here, they simply change `location.hash`, which the
   * listener below is already reacting to.
   *
   * Reading the initial route from the hash rather than hardcoding `home`
   * also means a shared link to a specific module opens straight into it for
   * anyone the trainer already recognises (§7, `lastStudent`) — see `start`.
   */
  const [view, setView] = useState<Route>(() => routeFromHash(location.hash, isValidLesson))

  useEffect(() => {
    const onHashChange = () => setView(routeFromHash(location.hash, isValidLesson))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  /** The one place anything in this component asks to go somewhere else. */
  const navigate = useCallback((next: Route) => {
    const hash = hashForRoute(next)
    // Assigning the same value again would not fire `hashchange`, so the
    // listener above would never run — update the state directly instead.
    if (location.hash === hash) setView(next)
    else location.hash = hash
  }, [])

  const update = useCallback((next: Progress) => {
    setProgress(next)
    save(next)
  }, [])

  const start = useCallback((name: string) => {
    const loaded = load(name)
    save(loaded)
    setProgress(loaded)
    // Deliberately not routed home: `view` already holds whatever the URL
    // pointed at when the page loaded, and that is where a returning student
    // following a shared link expects to land.
  }, [])

  const signOut = useCallback(() => {
    setProgress(null)
    navigate({ kind: 'home' })
  }, [navigate])

  const lesson = useMemo(
    () => (view.kind === 'lesson' ? lessonById(view.lessonId) : undefined),
    [view],
  )

  if (!progress) return <NameGate onStart={start} />

  return (
    <div className="app">
      {/* Only the Übersicht carries the bar. Inside a module every pixel of
          height belongs to the editor, and the rail already offers the way
          back — a second one at the top bought nothing for its 41px. */}
      {!lesson && (
        <header className="topbar">
          <button
            className="brand"
            onClick={() => navigate({ kind: 'home' })}
            aria-label="Zur Übersicht"
          >
            Informatik<span>-Trainer</span>
          </button>
          <span className="topbar-where">Informatik 9 · Quali · Mittelschule Glonn</span>
          <div className="topbar-right">
            <span className="who">{progress.studentName}</span>
            <button className="link" onClick={signOut}>
              wechseln
            </button>
          </div>
        </header>
      )}

      <main>
        {lesson ? (
          lesson.kind === 'sheet' ? (
            <SheetLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => navigate({ kind: 'home' })}
            />
          ) : lesson.kind === 'match' ? (
            <MatchLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => navigate({ kind: 'home' })}
            />
          ) : lesson.kind === 'traces' ? (
            <TraceLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => navigate({ kind: 'home' })}
            />
          ) : lesson.kind === 'web' ? (
            <WebLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => navigate({ kind: 'home' })}
            />
          ) : lesson.kind === 'console' ? (
            <ConsoleLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => navigate({ kind: 'home' })}
            />
          ) : lesson.kind === 'flow' ? (
            <FlowLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => navigate({ kind: 'home' })}
            />
          ) : lesson.kind === 'build' ? (
            <BuildLessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => navigate({ kind: 'home' })}
            />
          ) : (
            <LessonView
              lesson={lesson}
              progress={progress}
              onProgress={update}
              onBack={() => navigate({ kind: 'home' })}
            />
          )
        ) : (
          <Home
            lessons={LESSONS}
            progress={progress}
            onProgress={update}
            onOpen={(id) => navigate({ kind: 'lesson', lessonId: id })}
          />
        )}
      </main>
    </div>
  )
}
