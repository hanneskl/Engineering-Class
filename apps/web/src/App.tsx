import { runChecks, type Sheet } from '@quali/core'
import { SCENARIOS, scenarioById, totalPoints, type TaskDef } from '@quali/scenarios'
import { useMemo, useState } from 'react'
import { Grid } from './Grid.tsx'

type Status = 'open' | 'passed' | 'failed'

interface TaskState {
  readonly status: Status
  readonly message: string
}

export function App() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]!.id)
  const scenario = useMemo(() => scenarioById(scenarioId), [scenarioId])

  const [sheet, setSheet] = useState<Sheet>(() => scenario.seed())
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState('A1')
  const [states, setStates] = useState<Record<string, TaskState>>({})

  function reset(id: string): void {
    const next = scenarioById(id)
    setScenarioId(id)
    setSheet(next.seed())
    setStates({})
    setSelected('A1')
    setRevision((value) => value + 1)
  }

  function commit(a1: string, input: string): void {
    sheet.setInput(a1, input)
    setRevision((value) => value + 1)
  }

  function check(task: TaskDef): void {
    const outcome = runChecks(task.checks, {
      sheet,
      target: task.target,
      solution: task.solution,
    })
    setStates((previous) => ({
      ...previous,
      [task.id]: {
        status: outcome.passed ? 'passed' : 'failed',
        message: outcome.messages[0] ?? '',
      },
    }))
  }

  function checkAll(): void {
    for (const task of scenario.tasks) check(task)
  }

  const earned = scenario.tasks
    .filter((task) => states[task.id]?.status === 'passed')
    .reduce((sum, task) => sum + task.points, 0)

  return (
    <div className="app">
      <header>
        <div>
          <h1>Quali Excel Trainer</h1>
          <p className="subtitle">{scenario.subtitleDe}</p>
        </div>
        <div className="header-right">
          <select value={scenarioId} onChange={(event) => reset(event.target.value)}>
            {SCENARIOS.map((item) => (
              <option key={item.id} value={item.id}>{item.titleDe}</option>
            ))}
          </select>
          <span className="score">
            {earned} / {totalPoints(scenario)} Punkte
          </span>
          <button className="ghost" onClick={() => reset(scenarioId)}>Zurücksetzen</button>
        </div>
      </header>

      <main>
        <section className="sheet-pane">
          <div className="formula-bar">
            <span className="address">{selected}</span>
            <input
              className="formula-input"
              value={sheet.getInput(selected)}
              placeholder="Formel eingeben, z. B. =SUMME(B2:B6)"
              onChange={(event) => commit(selected, event.target.value)}
              data-revision={revision}
            />
          </div>
          <div className="tab">{sheet.name}</div>
          <Grid
            sheet={sheet}
            columns={scenario.columns}
            rows={scenario.rows}
            selected={selected}
            onSelect={setSelected}
            onCommit={commit}
            revision={revision}
          />
        </section>

        <aside className="tasks">
          <div className="tasks-head">
            <h2>Arbeitsaufträge</h2>
            <button onClick={checkAll}>Alles prüfen</button>
          </div>
          <p className="rule">Alle Berechnungen sind mit Formeln durchzuführen!</p>

          <ol>
            {scenario.tasks.map((task, index) => {
              const state = states[task.id] ?? { status: 'open' as Status, message: '' }
              return (
                <li key={task.id} className={`task ${state.status}`}>
                  <div className="task-head">
                    <span className="mark">
                      {state.status === 'passed' ? '✓' : state.status === 'failed' ? '✗' : index + 1}
                    </span>
                    <span className="points">{task.points} P</span>
                  </div>
                  <p className="prompt">{task.promptDe}</p>
                  {state.status === 'failed' && <p className="feedback">{state.message}</p>}
                  <button className="ghost small" onClick={() => check(task)}>Prüfen</button>
                </li>
              )
            })}
          </ol>
        </aside>
      </main>
    </div>
  )
}
