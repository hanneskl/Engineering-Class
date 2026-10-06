import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LESSONS, lessonById } from './lessons'
import { hashForRoute, routeFromHash, type Route } from './nav'
import { NameGate } from './ui/NameGate'
import { ThemeToggle } from './ui/ThemeToggle'
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
import { signInStudent } from './backend/studentAuth'
import { pushChangedTaskProgress, pushProgressSnapshot, hydrateFromSnapshot } from './progress/sync'
import { joinPresence } from './progress/presence'
import { backend, hasBackend } from './backend/client'

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
   * Runs once per mount that already has a signed-in student — covers a
   * returning student's page reload (their session persists on its own,
   * supabase-js keeps it in localStorage) just as much as the moment
   * `start()` below just finished signing someone in for the first time.
   *
   * Three things happen here, all safe to repeat on every reload:
   * - joinPresence: a Presence channel is a live socket, not something that
   *   survives a reload on its own the way the auth session does.
   * - pushChangedTaskProgress against an *empty* baseline: a one-time
   *   backfill for `task_progress`, since ordinary sync (`update()`, below)
   *   only ever diffs forward — history from before a student's first sync
   *   would otherwise never reach it. Idempotent, so repeating it costs
   *   nothing.
   * - hydrateFromSnapshot: the other side of the same idea, for the *whole*
   *   Progress object — if another device pushed something newer (or this
   *   is a genuinely fresh device with nothing local yet), pull it down and
   *   make it the new local baseline.
   */
  useEffect(() => {
    if (!progress) return
    void joinPresence(progress.studentName)
    void pushChangedTaskProgress(progress.seed, {}, progress.tasks)
    void hydrateFromSnapshot(progress).then((hydrated) => {
      if (!hydrated) return
      save(hydrated)
      setProgress(hydrated)
      prevTasksRef.current = hydrated.tasks
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.studentName])

  const update = useCallback((next: Progress) => {
    setProgress(next)
    save(next)
    void pushChangedTaskProgress(next.seed, prevTasksRef.current, next.tasks)
    prevTasksRef.current = next.tasks
    pushProgressSnapshot(next)
  }, [])

  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginBusy, setLoginBusy] = useState(false)

  const start = useCallback((name: string, code: string) => {
    // Deliberately not routed home: `view` already holds whatever the URL
    // pointed at when the page loaded, and that is where a returning student
    // following a shared link expects to land.
    if (!hasBackend) {
      const loaded = load(name)
      save(loaded)
      setProgress(loaded)
      prevTasksRef.current = loaded.tasks
      return
    }

    // With a backend, a name is no longer enough on its own — the code has
    // to check out before anything local changes, so a wrong one shows an
    // error instead of quietly dropping someone into the wrong identity.
    setLoginBusy(true)
    setLoginError(null)
    void signInStudent(name, code).then((error) => {
      setLoginBusy(false)
      if (error) {
        setLoginError(error)
        return
      }
      const loaded = load(name)
      save(loaded)
      setProgress(loaded)
      prevTasksRef.current = loaded.tasks
    })
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

  if (!progress) return <NameGate onStart={start} error={loginError} busy={loginBusy} />

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
            <ThemeToggle />
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
