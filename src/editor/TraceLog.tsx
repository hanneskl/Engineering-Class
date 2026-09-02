import { useState } from 'react'
import {
  FELDER,
  PUBLIC_IP,
  SITES,
  answerTrace,
  currentCookie,
  deleteCookie,
  feldWert,
  serverLine,
  siteById,
  sawAnsicht,
  sitesPerCookie,
  toggleFeld,
  traceFrage,
  trackerRows,
  visit,
  type Traces,
} from '../model/traces'
import { FrageCard } from './FrageCard'

type Ansicht = 'server' | 'tracker' | 'provider'

/**
 * Surf a little, then read the same afternoon from three sides. The three
 * views are deliberately not merged: the point of the module is that no single
 * party sees everything, and that two of them together see plenty.
 */
export function TraceLog({
  traces,
  seed,
  studentName,
  markieren,
  fragen,
  onTraces,
}: {
  traces: Traces
  seed: number
  studentName: string
  markieren?: boolean
  fragen?: string[]
  onTraces: (next: Traces) => void
}) {
  const [ansicht, setAnsicht] = useState<Ansicht>('server')
  const cookie = currentCookie(traces, seed)
  const letzte = traces.visits.at(-1)

  return (
    <div className="trace">
      <div className="trace-bar">
        <span className="trace-label">Surf ein bisschen:</span>
        {SITES.map((s) => (
          <button
            key={s.id}
            className="ghost small"
            onClick={() => onTraces(sawAnsicht(visit(traces, seed, s.id), ansicht))}
          >
            {s.titel}
          </button>
        ))}
        <span className="trace-cookie">
          Dein Cookie: <code>{cookie}</code>
          <button className="link" onClick={() => onTraces(deleteCookie(traces))}>
            löschen
          </button>
        </span>
      </div>

      <div className="trace-tabs" role="tablist">
        {(
          [
            ['server', 'Log der Webseite'],
            ['tracker', 'Der Tracker'],
            ['provider', 'Dein Provider'],
          ] as [Ansicht, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={ansicht === id}
            className={ansicht === id ? 'tab on' : 'tab'}
            onClick={() => {
              setAnsicht(id)
              // Only counts as having looked once there is something to see.
              if (traces.visits.length) onTraces(sawAnsicht(traces, id))
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {traces.visits.length === 0 ? (
        <p className="trace-idle">
          Noch nichts passiert. Klick oben auf eine Seite — dann füllt sich das Protokoll.
        </p>
      ) : (
        <div className="trace-view">
          {ansicht === 'server' && <ServerView traces={traces} />}
          {ansicht === 'tracker' && <TrackerView traces={traces} />}
          {ansicht === 'provider' && <ProviderView traces={traces} studentName={studentName} />}
        </div>
      )}

      {markieren && letzte && (
        <section className="markieren">
          <h4>Welche Angaben führen zu dir?</h4>
          <p className="markieren-lede">
            Das ist deine letzte Zeile, in ihre Bestandteile zerlegt. Klick die an, die
            verraten, <em>wer</em> da war — nicht die, die sagen wann oder was.
          </p>
          <div className="felder">
            {FELDER.map((f) => {
              const an = traces.markiert.includes(f.id)
              return (
                <button
                  key={f.id}
                  className={`feld${an ? ' on' : ''}`}
                  aria-pressed={an}
                  onClick={() => onTraces(toggleFeld(traces, f.id))}
                >
                  <span className="feld-label">{f.label}</span>
                  <span className="feld-wert">{feldWert(letzte, f.id)}</span>
                </button>
              )
            })}
          </div>
          {traces.markiert.map((id) => {
            const f = FELDER.find((x) => x.id === id)
            if (!f) return null
            return (
              <p key={id} className={`feld-warum${f.identifiziert ? ' ok' : ' bad'}`}>
                <strong>{f.label}:</strong> {f.warum}
              </p>
            )
          })}
        </section>
      )}

      {fragen?.length ? (
        <section className="trace-fragen">
          {fragen.map((id) => {
            const frage = traceFrage(id)
            if (!frage) return null
            return (
              <FrageCard
                key={id}
                text={frage.text}
                optionen={frage.optionen}
                chosen={traces.answers[frage.id]}
                onChoose={(o) =>
                  onTraces(answerTrace(traces, frage, frage.optionen.find((x) => x.text === o.text)!))
                }
              />
            )
          })}
        </section>
      ) : null}
    </div>
  )
}

function ServerView({ traces }: { traces: Traces }) {
  // One line per visit, in the shape a real web server writes it.
  const proHost = new Map<string, number>()
  for (const v of traces.visits) {
    const host = siteById(v.siteId)!.host
    proHost.set(host, (proHost.get(host) ?? 0) + 1)
  }
  return (
    <>
      <p className="view-note">
        Das schreibt jede Webseite mit, ganz ohne Anmeldung. Jeder Betreiber sieht nur
        seine eigene Seite — dafür jeden einzelnen Klick darauf.
      </p>
      <div className="log">
        {traces.visits.map((v, i) => (
          <code key={i} className="log-line">
            {serverLine(v)}
          </code>
        ))}
      </div>
      <p className="view-sum">
        {[...proHost.entries()].map(([host, n]) => `${host}: ${n} Zeile${n === 1 ? '' : 'n'}`).join(' · ')}
      </p>
    </>
  )
}

function TrackerView({ traces }: { traces: Traces }) {
  const rows = trackerRows(traces)
  const pro = sitesPerCookie(traces)
  const ohne = traces.visits.length - rows.length
  return (
    <>
      <p className="view-note">
        Dieselbe Werbefirma ist auf vielen Seiten eingebaut. Sie sieht deinen Namen nicht —
        sie braucht ihn auch nicht, sie hat ja deine Cookie-Nummer.
      </p>
      {rows.length === 0 ? (
        <p className="trace-idle">Noch keine Seite mit Tracker besucht.</p>
      ) : (
        <div className="log">
          {rows.map((v, i) => {
            const neu = i > 0 && rows[i - 1]!.cookie !== v.cookie
            return (
              <code key={i} className={`log-line${neu ? ' log-break' : ''}`}>
                cookie={v.cookie} · {v.zeit} · {siteById(v.siteId)!.host}
              </code>
            )
          })}
        </div>
      )}
      <p className="view-sum">
        {[...pro.entries()].map(
          ([id, sites]) => `${id}: ${sites.size} verschiedene Seite${sites.size === 1 ? '' : 'n'}`,
        ).join(' · ')}
        {ohne > 0 && ` · ${ohne} Besuch${ohne === 1 ? '' : 'e'} ohne Tracker, davon weiß die Firma nichts`}
      </p>
    </>
  )
}

function ProviderView({ traces, studentName }: { traces: Traces; studentName: string }) {
  return (
    <>
      <p className="view-note">
        Alles läuft über deinen Internet-Anbieter — und der weiß als Einziger, wer hinter
        der IP-Adresse steckt: Du hast einen Vertrag mit ihm.
      </p>
      <div className="log">
        <code className="log-line log-head">
          Anschluss {PUBLIC_IP} — Kunde: {studentName || 'dein Name'}, Glonn
        </code>
        {traces.visits.map((v, i) => (
          <code key={i} className="log-line">
            {v.zeit} · {PUBLIC_IP} → {siteById(v.siteId)!.host}
          </code>
        ))}
      </div>
      <p className="view-sum">
        Bei https sieht er nicht, was auf den Seiten steht — aber sehr wohl, dass du dort
        warst.
      </p>
    </>
  )
}
