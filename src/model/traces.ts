/**
 * M7 — Anonymität & Spuren im Internet.
 *
 * The Lehrplan wants students "zu erkennen, dass es nur eine vermeintliche
 * Anonymität in einem Netzwerk gibt". Telling them that changes nothing; they
 * have to watch it happen. So here they surf a handful of sites and then read
 * the three logs their own clicks just wrote: the site operator's, a tracker's,
 * and the provider's — the last one with their own name in it.
 *
 * Everything stays in the browser. Nothing is sent anywhere, which is exactly
 * the difference the module is about.
 */

export type Site = {
  id: string
  host: string
  titel: string
  /** The page the visit asks for, as it turns up in the log. */
  pfad: string
  /** Carries an advertising tracker that is also on the other sites. */
  tracker: boolean
}

/**
 * A believable afternoon. Four of the five carry the same tracker — including
 * the doctor's practice, which is the point at which the module stops being
 * an abstract exercise.
 */
export const SITES: Site[] = [
  { id: 'suche', host: 'suchmaschine.de', titel: 'Suchmaschine', pfad: '/suche?q=neue+sneaker', tracker: true },
  { id: 'shop', host: 'sneaker-shop.de', titel: 'Schuh-Shop', pfad: '/herren/laufschuhe', tracker: true },
  { id: 'spiele', host: 'spiele-welt.de', titel: 'Spieleseite', pfad: '/games/rennspiele', tracker: true },
  { id: 'arzt', host: 'hautarzt-glonn.de', titel: 'Arztpraxis', pfad: '/sprechzeiten', tracker: true },
  { id: 'schule', host: 'ms-glonn.de', titel: 'Schulhomepage', pfad: '/vertretungsplan', tracker: false },
]

export function siteById(id: string): Site | undefined {
  return SITES.find((s) => s.id === id)
}

/**
 * The address the outside world sees. Not the 192.168.… from the flat: the
 * router swaps it for the one the provider handed out (M6, step 5).
 */
export const PUBLIC_IP = '84.153.22.7'
export const BROWSER = 'Chrome/120 (Windows NT 10.0)'

export type Visit = {
  siteId: string
  /** Wall clock of the visit, as text, so a reload shows the same log. */
  zeit: string
  /** Cookie the tracker saw — changes when the student throws it away. */
  cookie: string
}

export type Traces = {
  visits: Visit[]
  /** How often the cookie has been deleted; the id is derived from it. */
  cookieGen: number
  /** Log fields the student marked as leading back to them. */
  markiert: string[]
  answers: Record<string, string>
  /** Evidence the rules read. */
  seen: string[]
}

export const emptyTraces = (): Traces => ({
  visits: [],
  cookieGen: 0,
  markiert: [],
  answers: {},
  seen: [],
})

/** A stable, harmless-looking id — the same shape a real tracking cookie has. */
export function cookieId(seed: number, gen: number): string {
  let h = (seed >>> 0) ^ 0x9e3779b9
  for (const ch of `cookie#${gen}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 8)
}

function stamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(now.getDate())}.${p(now.getMonth() + 1)}.${now.getFullYear()} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
}

export function visit(
  traces: Traces,
  seed: number,
  siteId: string,
  now: Date = new Date(),
): Traces {
  if (!siteById(siteId)) return traces
  const eintrag: Visit = { siteId, zeit: stamp(now), cookie: cookieId(seed, traces.cookieGen) }
  const site = siteById(siteId)!
  return {
    ...traces,
    visits: [...traces.visits, eintrag],
    seen: remember(traces.seen, `besucht:${siteId}`, site.tracker ? 'tracker' : 'ohne-tracker'),
  }
}

/**
 * Throwing the cookie away. The tracker starts a new file — but the old rows
 * do not disappear, and the IP address in them is unchanged.
 */
/**
 * Empty the log without forgetting what the student has worked out.
 *
 * Marked fields go with the visits — they point at a line that no longer
 * exists. Answers and the cookie generation stay: the cookie surviving a
 * cleared log is the lesson, not a bug.
 */
export function clearVisits(traces: Traces): Traces {
  return { ...traces, visits: [], markiert: [] }
}

export function deleteCookie(traces: Traces): Traces {
  return {
    ...traces,
    cookieGen: traces.cookieGen + 1,
    seen: remember(traces.seen, 'cookie-geloescht'),
  }
}

export function currentCookie(traces: Traces, seed: number): string {
  return cookieId(seed, traces.cookieGen)
}

// ---------------------------------------------------------------------------
// The log line, taken apart
// ---------------------------------------------------------------------------

export type Feld = {
  id: string
  label: string
  /** What this field does and does not say about the student. */
  warum: string
  /** Does it lead back to the person in front of the screen? */
  identifiziert: boolean
}

export const FELDER: Feld[] = [
  {
    id: 'ip',
    label: 'IP-Adresse',
    warum:
      'Ja. Die Adresse steht in jedem Log, und dein Provider weiß, welcher Anschluss ' +
      'sie zu dieser Uhrzeit hatte — also wo du wohnst.',
    identifiziert: true,
  },
  {
    id: 'zeit',
    label: 'Uhrzeit',
    warum: 'Die sagt, wann jemand da war — nicht, wer. Zusammen mit der IP-Adresse wird sie aber wichtig.',
    identifiziert: false,
  },
  {
    id: 'seite',
    label: 'Aufgerufene Seite',
    warum:
      'Die verrät, wofür du dich interessierst, nicht wie du heißt. Viele solche Zeilen ' +
      'ergeben trotzdem ein ziemlich genaues Bild von dir.',
    identifiziert: false,
  },
  {
    id: 'browser',
    label: 'Browser & Gerät',
    warum:
      'Chrome auf Windows haben Millionen. Allein führt das nicht zu dir — es macht dich ' +
      'aber unterscheidbar, und mit genug solcher Details wirst du wiedererkennbar.',
    identifiziert: false,
  },
  {
    id: 'cookie',
    label: 'Cookie-ID',
    warum:
      'Ja. Diese Nummer hat nur dein Browser. Damit erkennt dich eine Seite beim nächsten ' +
      'Mal wieder — und ein Tracker sogar auf ganz anderen Seiten.',
    identifiziert: true,
  },
]

/** The Apache-style line a web server writes for one visit. */
export function serverLine(v: Visit): string {
  const site = siteById(v.siteId)!
  return `${PUBLIC_IP} - - [${v.zeit}] "GET ${site.pfad} HTTP/1.1" 200 "${BROWSER}" cookie=${v.cookie}`
}

/** The value one field of the log line has for a given visit. */
export function feldWert(v: Visit, feld: string): string {
  const site = siteById(v.siteId)!
  switch (feld) {
    case 'ip':
      return PUBLIC_IP
    case 'zeit':
      return v.zeit
    case 'seite':
      return `${site.host}${site.pfad}`
    case 'browser':
      return BROWSER
    case 'cookie':
      return v.cookie
    default:
      return ''
  }
}

export function toggleFeld(traces: Traces, feld: string): Traces {
  const markiert = traces.markiert.includes(feld)
    ? traces.markiert.filter((f) => f !== feld)
    : [...traces.markiert, feld]
  return { ...traces, markiert, seen: remember(traces.seen, 'markiert') }
}

/**
 * Remembers that the student looked at one of the three views with data in
 * it. Which log they opened cannot be read off the visits, and looking at the
 * provider's log — the one with their own name in it — is the point of the
 * last task.
 */
export function sawAnsicht(traces: Traces, ansicht: string): Traces {
  return { ...traces, seen: remember(traces.seen, `ansicht:${ansicht}`) }
}

/** Distinct sites one cookie id was seen on — what a tracker can join up. */
export function trackerRows(traces: Traces): Visit[] {
  return traces.visits.filter((v) => siteById(v.siteId)?.tracker)
}

export function sitesPerCookie(traces: Traces): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const v of trackerRows(traces)) {
    const set = map.get(v.cookie) ?? new Set<string>()
    set.add(v.siteId)
    map.set(v.cookie, set)
  }
  return map
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export type TraceOption = { text: string; ok: boolean; warum: string }
export type TraceFrage = { id: string; text: string; optionen: TraceOption[] }

/** Who can see what — the three parties the module keeps apart. */
const PARTEIEN = {
  seite: 'Der Betreiber der Webseite',
  tracker: 'Der Tracker auf vielen Seiten',
  provider: 'Dein Internet-Anbieter',
}

export const FRAGEN: TraceFrage[] = [
  {
    id: 'ip-name',
    text: 'Wer kann aus einer IP-Adresse einen Namen und eine Wohnadresse machen?',
    optionen: [
      {
        text: PARTEIEN.provider,
        ok: true,
        warum:
          'Richtig. Nur der Provider weiß, welcher Anschluss diese Adresse zu dieser ' +
          'Uhrzeit hatte. Bei einer Straftat muss er es der Polizei sagen.',
      },
      {
        text: 'Der Betreiber der Webseite allein',
        ok: false,
        warum:
          'Er sieht die Adresse, aber nicht, zu wem sie gehört. Er kann sie allerdings ' +
          'speichern und weitergeben.',
      },
      {
        text: 'Niemand, eine IP-Adresse ist anonym',
        ok: false,
        warum:
          'Genau das ist der Irrtum. Die Zahl allein sagt nichts — aber beim Provider ' +
          'steht in einer Liste, wer sie hatte.',
      },
    ],
  },
  {
    id: 'cookie-ort',
    text: 'Wo wird ein Cookie gespeichert?',
    optionen: [
      {
        text: 'In deinem Browser, auf deinem Gerät',
        ok: true,
        warum:
          'Richtig. Ein Cookie ist ein kleiner Wert, den die Seite in deinem Browser ' +
          'ablegt und beim nächsten Besuch wieder abholt. Deshalb kannst du ihn löschen.',
      },
      {
        text: 'Auf dem Webserver der Seite',
        ok: false,
        warum:
          'Dann könntest du ihn nicht löschen. Der Server merkt sich nur die Nummer, ' +
          'die dein Browser ihm jedes Mal mitschickt.',
      },
      {
        text: 'Beim Internet-Anbieter',
        ok: false,
        warum: 'Der Provider transportiert die Daten nur. Der Cookie liegt bei dir.',
      },
    ],
  },
  {
    id: 'weiss-quer',
    text: 'Wer merkt, dass ein und dieselbe Person auf drei verschiedenen Seiten war?',
    optionen: [
      {
        text: PARTEIEN.tracker,
        ok: true,
        warum:
          'Richtig. Jede der Seiten hat denselben Tracker eingebaut, und der erkennt ' +
          'deinen Cookie überall wieder. So entsteht aus Einzelbesuchen ein Profil.',
      },
      {
        text: PARTEIEN.seite,
        ok: false,
        warum: 'Der sieht nur die Besuche auf seiner eigenen Seite — mehr bekommt er nicht zu sehen.',
      },
      {
        text: 'Niemand, die Seiten haben nichts miteinander zu tun',
        ok: false,
        warum:
          'Schau dir das Tracker-Log an: dieselbe Cookie-Nummer taucht auf mehreren ' +
          'Seiten auf. Genau dafür ist sie da.',
      },
    ],
  },
  {
    id: 'weiss-inhalt',
    text: 'Du tippst auf einer https-Seite ein Passwort ein. Wer kann es lesen?',
    optionen: [
      {
        text: 'Nur die Seite, bei der du dich anmeldest',
        ok: true,
        warum:
          'Richtig. Bei https ist der Inhalt verschlüsselt — wie in M6 gesehen. Welche ' +
          'Seite du besucht hast, sieht der Provider trotzdem.',
      },
      {
        text: PARTEIEN.provider,
        ok: false,
        warum:
          'Er sieht, mit wem du redest, aber nicht was ihr redet. Bei http wäre es anders: ' +
          'da stünde alles im Klartext.',
      },
      {
        text: 'Jeder, der das Paket unterwegs abfängt',
        ok: false,
        warum: 'Das gilt nur ohne Verschlüsselung. Das Schloss in der Adresszeile ist kein Deko-Symbol.',
      },
    ],
  },
  {
    id: 'anonym',
    text: 'Warum bist du im Internet nicht wirklich anonym?',
    optionen: [
      {
        text: 'Weil jede Seite meine IP-Adresse sieht und der Provider weiß, wem sie gehört',
        ok: true,
        warum:
          'Genau. Keiner der beiden kennt dich allein — zusammen schon. Dazu kommen ' +
          'Cookies, die dich über Seiten hinweg wiedererkennen.',
      },
      {
        text: 'Weil ich überall meinen echten Namen eingebe',
        ok: false,
        warum:
          'Auch ohne einen einzigen Namen bleibt die Spur: die IP-Adresse steht in jedem ' +
          'Log, ob du dich anmeldest oder nicht.',
      },
      {
        text: 'Bin ich doch — man sieht ja nur eine Zahl',
        ok: false,
        warum:
          'Genau diese Zahl ist das Problem. Beim Provider steht daneben, welcher Anschluss ' +
          'sie hatte — mit Name und Adresse.',
      },
    ],
  },
  {
    id: 'schutz',
    text: 'Was bringt wirklich etwas, wenn du weniger Spuren hinterlassen willst?',
    optionen: [
      {
        text: 'Cookies löschen, Tracker blockieren und sparsam sein mit dem, was du preisgibst',
        ok: true,
        warum:
          'Das hilft — vollständig anonym wirst du damit trotzdem nicht. Die IP-Adresse ' +
          'bleibt, und der Provider führt weiter seine Liste.',
      },
      {
        text: 'Einen anderen Browser-Namen einstellen',
        ok: false,
        warum:
          'Der Browsertyp ist nur ein kleines Detail. IP-Adresse und Cookie sind die ' +
          'Spuren, auf die es ankommt.',
      },
      {
        text: 'Gar nichts, dagegen kann man sowieso nichts machen',
        ok: false,
        warum:
          'So weit ist es nicht. Du kannst deutlich weniger Spuren hinterlassen — du ' +
          'musst nur wissen, welche es überhaupt gibt.',
      },
    ],
  },
]

export function traceFrage(id: string): TraceFrage | undefined {
  return FRAGEN.find((f) => f.id === id)
}

export function answerTrace(traces: Traces, frage: TraceFrage, option: TraceOption): Traces {
  return {
    ...traces,
    answers: { ...traces.answers, [frage.id]: option.text },
    seen: option.ok ? remember(traces.seen, `richtig:${frage.id}`) : traces.seen,
  }
}

function remember(seen: string[], ...marks: string[]): string[] {
  const next = [...seen]
  for (const m of marks) if (!next.includes(m)) next.push(m)
  return next
}
