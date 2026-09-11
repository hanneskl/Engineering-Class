import { useEffect, useState } from 'react'
import { hasBackend } from '../backend/client'
import { isTeacherSignedIn } from '../backend/teacherAuth'
import { TeacherLogin } from './TeacherLogin'
import { TeacherDashboard } from './TeacherDashboard'

/**
 * `#/lehrer`. Deliberately checked before NameGate in App.tsx — this has
 * nothing to do with `Progress`/student state, so it shouldn't need a
 * student name entered on this browser first.
 */
export function TeacherRoute() {
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    void isTeacherSignedIn().then((value) => {
      setSignedIn(value)
      setReady(true)
    })
  }, [])

  if (!hasBackend) {
    return (
      <div className="gate">
        <div className="gate-card">
          <h1>
            Lehrer<span>-Ansicht</span>
          </h1>
          <p className="gate-sub">Kein Server konfiguriert.</p>
        </div>
      </div>
    )
  }

  if (!ready) return null

  return signedIn ? (
    <TeacherDashboard onSignOut={() => setSignedIn(false)} />
  ) : (
    <TeacherLogin onSignedIn={() => setSignedIn(true)} />
  )
}
