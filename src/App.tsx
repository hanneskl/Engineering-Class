import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LESSONS, lessonById } from './lessons'
import { hashForRoute, routeFromHash, type Route } from './nav'
import { NameGate } from './ui/NameGate'
import { TeacherRoute } from './ui/TeacherRoute'
import { TeacherResetPassword } from './ui/TeacherResetPassword'
import { Home } from './ui/Home'
import { LessonView } from './ui/LessonView'
import { BuildLessonView } from './ui/BuildLessonView'
import { FlowLessonView } from './ui/FlowLessonView'
import { ConsoleLessonView } from './ui/ConsoleLessonView'
import { WebLessonView } from './ui/WebLessonView'
import { TraceLessonView } from './ui/TraceLessonView'
import { MatchLessonView } from './ui/MatchLessonView'
import { SheetLessonView } from './ui/SheetLessonView'
import { load, save, lastStudent, type Progress, type TaskProgress } from './progress/store'
import { ensureSignedIn } from './progress/anonAuth'
import { pushChangedTaskProgress } from './progress/sync'
import { joinPresence } from './progress/presence'
import { backend } from './backend/client'

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

  /*
   * The baseline `update()` diffs each new Progress.tasks against, so only
   * genuinely changed tasks get pushed to Supabase (see sync.ts). Reset
   * whenever the signed-in student changes — a ref left over from the
   * previous student would otherwise mask that student B's own task, never
   * touched yet, happens to already match whatever student A last left it
   * at, and nothing would be synced for it at all.
   */
  const prevTasksRef = useRef<Record<string, TaskProgress>>(progress?.tasks ?? {})

  /*
   * Joining Presence has to happen twice, for two different reasons: right
   * after a fresh sign-in (start, below) so the very first task a brand-new
   * student opens is already visible, and here, on every mount that already
   * has a signed-in student — a returning student's page reload restores
   * their anonymous auth session on its own (supabase-js persists it), but a
   * Presence channel is a live socket with nothing to restore, so someone
   * has to open it again. joinPresence itself no-ops on a repeat call for
   * the same identity, so the overlap between the two costs nothing.
   */
  useEffect(() => {
    if (progress) void joinPresence(progress.studentName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.studentName])

  const update = useCallback((next: Progress) => {
    setProgress(next)
    save(next)
    void pushChangedTaskProgress(next.seed, prevTasksRef.current, next.tasks)
    prevTasksRef.current = next.tasks
  }, [])

  const start = useCallback((name: string) => {
    const loaded = load(name)
    save(loaded)
    setProgress(loaded)
    prevTasksRef.current = loaded.tasks
    // Deliberately not routed home: `view` already holds whatever the URL
    // pointed at when the page loaded, and that is where a returning student
    // following a shared link expects to land.

    // Fire-and-forget: with no backend configured this resolves instantly to
    // nothing, and even a real, slow, or failed sign-in must never hold up
    // the local experience — see ensureSignedIn's own doc comment. Chained
    // rather than left to the mount effect above: a brand-new sign-in is a
    // real network round trip, and without this a student's first task
    // could open before that finishes and race joinPresence's own session
    // check into a silent no-op for the rest of the session.
    void ensureSignedIn(name).then(() => joinPresence(name))
  }, [])

  const signOut = useCallback(() => {
    setProgress(null)
    navigate({ kind: 'home' })
  }, [navigate])

  const lesson = useMemo(
    () => (view.kind === 'lesson' ? lessonById(view.lessonId) : undefined),
    [view],
  )

  /*
   * Clicking a Supabase password-recovery email link lands here carrying an
   * `#access_token=…&type=recovery` fragment — supabase-js's own
   * `detectSessionInUrl` consumes and clears that before anything of ours
   * runs, so there is no hash left for `routeFromHash` to read. The
   * documented way to notice it happened at all is this event, not the URL.
   */
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  useEffect(() => {
    if (!backend) return
    const { data } = backend.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Takes over the whole screen regardless of whatever route the leftover
  // hash resolved to — a student's module or the Übersicht would be a
  // strange thing to land on with a half-finished password change pending.
  if (passwordRecovery) {
    return (
      <TeacherResetPassword
        onDone={() => {
          setPasswordRecovery(false)
          navigate({ kind: 'teacher' })
        }}
      />
    )
  }

  // Checked before the student gate — this has nothing to do with Progress,
  // so it shouldn't need a student name entered on this browser first.
  if (view.kind === 'teacher') return <TeacherRoute />

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
