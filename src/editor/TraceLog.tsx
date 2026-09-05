import { useEffect } from 'react'
import {
  FELDER,
  PUBLIC_IP,
  SITES,
  answerTrace,
  clearVisits,
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
  type Visit,
} from '../model/traces'
import { FrageCard } from './FrageCard'

type Fokus = 'seite' | 'tracker' | 'vergleich'

/**
 * Surf a little, then look at what it left behind.
 *
 * Two earlier shapes failed here. Tabs hid the comparison the module is about;
 * three permanent columns showed all of it at once, which put three walls of
 * server-log text in front of a fifteen-year-old who needed one. Both also
 * printed raw Apache lines, which nobody at this level can read.
 *
 * So: the surfing, always on top, in plain German — that is the student's own
 * afternoon and the thing every panel below is *about*. Then one panel, chosen
 * by the task: the website's record decoded into labelled fields, the ad
 * company's record with its repeating number, or the comparison of all three.
 */
export function TraceLog({
  traces,
  seed,
  studentName,
  fokus,
  markieren,
  onTraces,
}: {
  traces: Traces
  seed: number
  studentName: string
  fokus: Fokus
  markieren?: boolean
  onTraces: (next: Traces) => void
}) {
  const cookie = currentCookie(traces, seed)
  const hat = traces.visits.length > 0

  // Which record the student is looking at is what the rules record. The
  // comparison shows all three at once, so it counts as all three.
  useEffect(() => {
    if (!hat) return
    const zeigt = fokus === 'vergleich' ? ['server', 'tracker', 'provider'] : [fokus === 'seite' ? 'server' : 'tracker']
    const fehlt = zeigt.filter((a) => !traces.seen.includes(`ansicht:${a}`))
    if (fehlt.length === 0) return
    onTraces(fehlt.reduce((t, a) => sawAnsicht(t, a), traces))
  }, [hat, fokus, traces, onTraces])

  return (
    <div className="trace">
      <div className="trace-bar">
        <span className="trace-label">Besuche eine Seite:</span>
        {SITES.map((s) => (
          <button
            key={s.id}
            className="ghost small"
            onClick={() => onTraces(visit(traces, seed, s.id))}
          >
            {s.titel}
          </button>
        ))}
        <span className="trace-bar-right">
          <span className="trace-cookie">
            Dein Cookie <code>{cookie}</code>
          </span>
          <button className="link" onClick={() => onTraces(deleteCookie(traces))}>
            Cookie löschen
          </button>
          <button className="link" disabled={!hat} onClick={() => onTraces(clearVisits(traces))}>
            Protokoll leeren
          </button>
        </span>
      </div>

      {/* The student's own afternoon, in their own language. Everything below
          is a record OF this — which is the connection that was missing. */}
      <div className="afternoon">
        <h3>Das hast du gemacht</h3>
        {hat ? (
          <ol className="afternoon-list">
            {traces.visits.map((v, i) => (
              <li key={i}>
                {/* Same date on every chip is noise; the clock is what the
                    student compares against the logs below. */}
                <span className="af-zeit">{v.zeit.split(' ').pop()}</span>
                <span className="af-was">{siteById(v.siteId)!.titel}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="trace-idle">Klick oben auf eine Seite.</p>
        )}
      </div>

      {hat && (
        <div className="fokus">
          {fokus === 'seite' && (
            <SeiteView traces={traces} markieren={markieren} onTraces={onTraces} />
          )}
          {fokus === 'tracker' && <TrackerView traces={traces} />}
          {fokus === 'vergleich' && (
            <VergleichView traces={traces} studentName={studentName} cookie={cookie} />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * T1 — the website's own record, decoded.
 *
 * A server writes one line per visit. The line is shown, but the exercise is
 * on the fields it is made of: named, with their real values, and clickable.
 * The raw line sits underneath, small, so the student sees what they have
 * really been looking at without having to parse it to do the task.
 */
function SeiteView({
  traces,
  markieren,
  onTraces,
}: {
  traces: Traces
  markieren?: boolean
  onTraces: (next: Traces) => void
}) {
  const letzte = traces.visits.at(-1)!
  return (
    <section className="panel">
      <h3>Das schreibt die Webseite über deinen letzten Besuch auf</h3>
      <p className="panel-lede">
        Jede Seite führt so ein Protokoll — ohne Anmeldung, ohne zu fragen. Das hier ist
        deine letzte Zeile, in ihre Bestandteile zerlegt.
        {markieren && ' Klick die Angaben an, die verraten, wer da war — nicht die, die sagen wann oder was.'}
      </p>

      <div className="felder">
        {FELDER.map((f) => {
          const an = traces.markiert.includes(f.id)
          return (
            <button
              key={f.id}
              className={`feld${an ? ' on' : ''}`}
              aria-pressed={an}
              disabled={!markieren}
              onClick={() => onTraces(toggleFeld(traces, f.id))}
            >
              <span className="feld-label">{f.label}</span>
              <span className="feld-wert">{feldWert(letzte, f.id)}</span>
            </button>
          )
        })}
      </div>

      {traces.markiert.length > 0 && (
        <div className="feld-warums">
          {traces.markiert.map((id) => {
            const f = FELDER.find((x) => x.id === id)
            if (!f) return null
            return (
              <p key={id} className={`feld-warum${f.identifiziert ? ' ok' : ' bad'}`}>
                <strong>{f.label}:</strong> {f.warum}
              </p>
            )
          })}
        </div>
      )}

      <details className="roh">
        <summary>So sieht diese Zeile beim Betreiber wirklich aus</summary>
        <code className="log-line">{serverLine(letzte)}</code>
      </details>
    </section>
  )
}

/** T2 — the ad company's record: one number, many unrelated sites. */
function TrackerView({ traces }: { traces: Traces }) {
  const rows = trackerRows(traces)
  const pro = sitesPerCookie(traces)
  const ohne = traces.visits.length - rows.length

  return (
    <section className="panel">
      <h3>Das schreibt die Werbefirma auf</h3>
      <p className="panel-lede">
        Dieselbe Werbefirma steckt in vielen Seiten. Sie kennt deinen Namen nicht — sie
        braucht ihn nicht, sie hat deine Nummer.
      </p>

      {rows.length === 0 ? (
        <p className="trace-idle">
          Noch keine Seite mit Werbung besucht. Nur die Schulhomepage kommt ohne aus —
          alle anderen tragen dieselbe Werbung, auch die Arztpraxis.
        </p>
      ) : (
        <table className="tracker-table">
          <thead>
            <tr>
              <th>Nummer</th>
              <th>Uhrzeit</th>
              <th>Seite</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v, i) => {
              const neu = i > 0 && rows[i - 1]!.cookie !== v.cookie
              return (
                <tr key={i} className={neu ? 'cookie-break' : undefined}>
                  <td className="nummer">{v.cookie}</td>
                  <td>{v.zeit}</td>
                  <td>{siteById(v.siteId)!.host}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <ul className="panel-sum">
        {[...pro.entries()].map(([id, sites]) => (
          <li key={id}>
            {sites.size === 1 ? (
              <>
                Nummer <code>{id}</code> war bisher auf einer Seite.
              </>
            ) : (
              <>
                Nummer <code>{id}</code> war auf <strong>{sites.size}</strong> verschiedenen
                Seiten — die nichts miteinander zu tun haben.
              </>
            )}
          </li>
        ))}
        {ohne > 0 && (
          <li>
            {ohne} Besuch{ohne === 1 ? '' : 'e'} auf der Schulhomepage — die trägt keine
            Werbung, davon weiß die Firma nichts.
          </li>
        )}
      </ul>
    </section>
  )
}

/**
 * T3 — the comparison, as a table rather than three logs.
 *
 * The gaps are the lesson: nobody has a full row, and any two of them together
 * very nearly do. As three separate logs that had to be held in the head; as a
 * grid it is the first thing you see.
 */
function VergleichView({
  traces,
  studentName,
  cookie,
}: {
  traces: Traces
  studentName: string
  cookie: string
}) {
  const seiten = new Set(traces.visits.map((v) => v.siteId)).size
  const mitTracker = new Set(trackerRows(traces).map((v) => v.siteId)).size
  const letzte: Visit | undefined = traces.visits.at(-1)

  const zeilen: { was: string; werte: [string | null, string | null, string | null] }[] = [
    {
      was: 'Wie du heißt',
      werte: [null, null, studentName || 'dein Name'],
    },
    {
      was: 'Deine IP-Adresse',
      werte: [PUBLIC_IP, PUBLIC_IP, PUBLIC_IP],
    },
    {
      was: 'Welche Seiten du besuchst',
      werte: [
        `nur die eigene${letzte ? ` (${siteById(letzte.siteId)!.host})` : ''}`,
        mitTracker ? `${mitTracker} Seiten mit ihrer Werbung` : 'noch keine',
        `alle ${seiten}`,
      ],
    },
    {
      was: 'Was auf der Seite steht',
      werte: ['alles', null, null],
    },
    {
      was: 'Deine Cookie-Nummer',
      werte: [cookie, cookie, null],
    },
  ]

  return (
    <section className="panel">
      <h3>Wer weiß was über denselben Nachmittag?</h3>
      <p className="panel-lede">
        Dieselben Klicks, drei Beteiligte. Achte auf die Lücken — und darauf, wie wenig
        zwei davon zusammenlegen müssen.
      </p>

      <table className="wer-table">
        <thead>
          <tr>
            <th />
            <th>Die Webseite</th>
            <th>Die Werbefirma</th>
            <th>Dein Internet-Anbieter</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z) => (
            <tr key={z.was}>
              <th scope="row">{z.was}</th>
              {z.werte.map((w, i) => (
                <td key={i} className={w ? 'weiss' : 'weiss-nicht'}>
                  {w ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="panel-punchline">
        Keiner kennt dich ganz. Aber die Webseite hat deine IP-Adresse, und dein Anbieter
        weiß, wem sie gehörte — <strong>zusammen sind es dein Name und deine Klicks</strong>.
        Das ist die „vermeintliche Anonymität".
      </p>
    </section>
  )
}

/** The questions, which live in the rail beside the evidence. */
export function TraceFragen({
  traces,
  fragen,
  onTraces,
}: {
  traces: Traces
  fragen: string[]
  onTraces: (next: Traces) => void
}) {
  return (
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
  )
}
