import { useEffect, useMemo, useState } from 'react'
import { LESSONS, taskIdsFor } from '../lessons'
import { backend, CLASS_ID } from '../backend/client'
import { signOutTeacher } from '../backend/teacherAuth'
import { subscribePresence, type ActiveTask } from '../progress/presence'

type Student = { id: string; display_name: string | null }

type TaskProgressRow = {
  student_id: string
  lesson_id: string
  task_id: string
  solved: boolean
  attempts: number
  hints_used: number
  updated_at: string
}

/**
 * How many tasks each module has, independent of which student's seed
 * generated them — the two quiz modules always draw a fixed *count* of
 * numbers, just different ones per seed (see sync.ts's own note on this).
 * An arbitrary fixed seed is therefore fine here; nobody's real seed is
 * known server-side, and none is needed.
 */
const TOTAL_BY_MODULE = new Map(LESSONS.map((l) => [l.module, taskIdsFor(l, 1).length]))

/**
 * The dashboard `ARCHITECTURE.md` §1 originally ruled out. Two live views
 * over the same class: who is doing what right now (Presence), and how far
 * everyone has gotten (`task_progress`, kept in sync by a Postgres Changes
 * subscription rather than a manual refresh).
 */
export function TeacherDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [students, setStudents] = useState<Student[]>([])
  // Keyed by `${student_id}:${task_id}` for O(1) updates as changes arrive.
  const [rows, setRows] = useState<Map<string, TaskProgressRow>>(new Map())
  const [active, setActive] = useState<Record<string, ActiveTask[]>>({})
  const [loading, setLoading] = useState(true)

  // Re-renders the "vor X Minuten" labels on their own — a student sitting
  // on the same task for five minutes needs that five minutes to show even
  // though no new presence event has arrived to trigger it otherwise.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!backend) {
      setLoading(false)
      return
    }
    const client = backend

    let cancelled = false
    async function load() {
      const [{ data: studentRows }, { data: progressRows }] = await Promise.all([
        client.from('students').select('id, display_name').eq('class_id', CLASS_ID),
        client.from('task_progress').select('*'),
      ])
      if (cancelled) return
      setStudents((studentRows as Student[] | null) ?? [])
      setRows(
        new Map(
          ((progressRows as TaskProgressRow[] | null) ?? []).map((r) => [
            `${r.student_id}:${r.task_id}`,
            r,
          ]),
        ),
      )
      setLoading(false)
    }
    void load()

    const changes = client
      .channel('task_progress_changes')
      .on<TaskProgressRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_progress' },
        (payload) => {
          setRows((prev) => {
            const next = new Map(prev)
            if (payload.eventType === 'DELETE') {
              const { student_id, task_id } = payload.old
              if (student_id && task_id) next.delete(`${student_id}:${task_id}`)
            } else {
              const row = payload.new
              next.set(`${row.student_id}:${row.task_id}`, row)
            }
            return next
          })
        },
      )
      .subscribe()

    const unsubPresence = subscribePresence(setActive)

    return () => {
      cancelled = true
      void client.removeChannel(changes)
      unsubPresence()
    }
  }, [])

  const roster = useMemo(
    () =>
      [...students].sort((a, b) =>
        (a.display_name ?? '').localeCompare(b.display_name ?? '', 'de'),
      ),
    [students],
  )

  const activeList = useMemo(
    () => Object.values(active).flat().sort((a, b) => b.since - a.since),
    [active],
  )

  function summaryFor(studentId: string, moduleId: string): { solved: number; total: number } {
    let solved = 0
    for (const row of rows.values()) {
      if (row.student_id === studentId && row.lesson_id === moduleId && row.solved) solved++
    }
    return { solved, total: TOTAL_BY_MODULE.get(moduleId) ?? 0 }
  }

  async function handleSignOut(): Promise<void> {
    await signOutTeacher()
    onSignOut()
  }

  return (
    <div className="teacher">
      <header className="teacher-bar">
        <h1>
          Lehrer<span>-Ansicht</span>
        </h1>
        <button className="link" onClick={() => void handleSignOut()}>
          Abmelden
        </button>
      </header>

      {loading ? (
        <p className="muted">Lädt …</p>
      ) : (
        <div className="teacher-body">
          <section className="teacher-active">
            <h2>Gerade aktiv</h2>
            {activeList.length === 0 ? (
              <p className="muted">Niemand ist gerade angemeldet.</p>
            ) : (
              <ul>
                {activeList.map((a) => (
                  <li key={`${a.display_name}-${a.lesson_id}-${a.task_id}`}>
                    <strong>{a.display_name}</strong>
                    <span className="muted">
                      {' '}
                      · {a.lesson_id} · {a.task_id} · {formatAgo(now - a.since)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="teacher-matrix">
            <h2>Fortschritt</h2>
            {roster.length === 0 ? (
              <p className="muted">Noch kein Schüler angemeldet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    {LESSONS.map((l) => (
                      <th key={l.module}>{l.module}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((s) => (
                    <tr key={s.id}>
                      <td>{s.display_name ?? '(ohne Namen)'}</td>
                      {LESSONS.map((l) => {
                        const { solved, total } = summaryFor(s.id, l.module)
                        const done = total > 0 && solved === total
                        return (
                          <td key={l.module} className={done ? 'done' : undefined}>
                            {solved}/{total}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function formatAgo(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'gerade eben'
  if (minutes === 1) return 'vor 1 Minute'
  return `vor ${minutes} Minuten`
}
