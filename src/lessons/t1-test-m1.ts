import type { TestLesson, TestTask } from '../model/types'
import type { Option } from '../model/frage'

/**
 * Test M1 — twelve questions on Geräte & Komponenten, done at the start of a
 * lesson so the teacher sees in the dashboard who got what, and which
 * questions the whole class got wrong (docs/briefing-test-m1.md).
 *
 * The device sentences are the Quali's own wording, exactly as in
 * `m1-geraete.ts`'s FUNKTIONEN; the `warum` texts for the right answers are
 * taken from there too, the ones for the wrong options written in the same
 * voice. The right option is listed first in every question — the screen
 * shuffles per student, so that's never where it shows up.
 */

const ok = (text: string, warum: string): Option => ({ text, ok: true, warum })
const no = (text: string, warum: string): Option => ({ text, ok: false, warum })

const frage = (id: string, text: string, optionen: Option[]): TestTask => ({
  id,
  frage: { id, text, optionen },
})

const TASKS: TestTask[] = [
  // Teil A — Geräte erkennen
  {
    ...frage('t1-01', 'Welches Gerät ist das?', [
      ok('Router', 'Richtig — die zwei Antennen sind das Erkennungszeichen des Routers.'),
      no('Modem', 'Das Modem ist auch ein flacher Kasten, hat aber keine Antennen — es hängt am Kabel in die Wanddose.'),
      no('Switch', 'Einen Switch erkennst du an der langen Reihe gleicher Buchsen, nicht an Antennen.'),
      no('Access Point', 'Der Access Point ist die flache Scheibe für die Decke. Ein Kasten mit Antennen ist der Router.'),
    ]),
    bild: 'router',
  },
  {
    ...frage('t1-02', 'Welches Gerät ist das?', [
      ok('Modem', 'Richtig — das Modem ist der Kasten mit dem Anschluss zur Wanddose, ohne Antennen.'),
      no('Router', 'Der Router hätte Antennen. Ohne Antennen und mit Kabel zur Dose: das Modem.'),
      no('NAS', 'Ein NAS besteht vorne aus Festplatten-Einschüben.'),
      no('Switch', 'Ein Switch hat eine lange Reihe gleicher Buchsen.'),
    ]),
    bild: 'modem',
  },
  {
    ...frage('t1-03', 'Welches Gerät ist das?', [
      ok('Switch', 'Richtig — die lange Reihe gleicher Buchsen gibt es nur beim Switch.'),
      no('Router', 'Der Router hat nur wenige Buchsen, dafür Antennen.'),
      no('Server', 'Ein Server ist der hohe Schrank mit Einschüben.'),
      no('Drucker', 'Beim Drucker kommt oben ein bedrucktes Blatt heraus.'),
    ]),
    bild: 'switch',
  },

  // Teil B — Quali-Sätze
  frage('t1-04', 'Verbindet kabellose Geräte (WLAN) mit einem kabelgebundenen Netzwerk (LAN).', [
    ok('Access Point', 'Das ist der Access Point: das Bindeglied zwischen Funk und Kabel. Er selbst hängt am Kabel.'),
    no('Switch', 'Der Switch verbindet nur per Kabel — im Satz geht es aber um Funk.'),
    no('WLAN-Repeater', 'Der Repeater hängt selbst per WLAN. Das Gerät im Satz hängt am Kabelnetz: der Access Point.'),
    no('Router', 'Der Router leitet zwischen Netzwerken weiter — hier geht es um Funk und Kabel in einem Netz.'),
  ]),
  frage('t1-05', 'Spezieller Access Point, der selbst per WLAN und nicht per Kabel mit dem Router verbunden ist.', [
    ok('WLAN-Repeater', 'Das ist der Repeater. Der Unterschied zum Access Point steckt in "selbst per WLAN verbunden".'),
    no('Access Point', 'Fast — aber der Access Point hängt per Kabel am Router. "Selbst per WLAN" ist der Repeater.'),
    no('Switch', 'Ein Switch kann gar kein WLAN.'),
    no('Modem', 'Das Modem stellt die Internetverbindung her — mit WLAN hat es nichts zu tun.'),
  ]),
  frage('t1-06', 'Authentifiziert sich beim Provider und stellt die Internetverbindung her.', [
    ok('Modem', 'Das ist das Modem. Es meldet den Anschluss beim Anbieter an — ohne das kommt gar keine Leitung zustande.'),
    no('Router', 'Der Router leitet weiter. Beim Provider anmelden tut sich das Modem.'),
    no('Firewall', 'Die Firewall schützt, sie stellt keine Verbindung her.'),
    no('Server', 'Ein Server bietet Dienste an — mit dem Provider hat er nichts zu tun.'),
  ]),
  frage('t1-07', 'Schützt einen Computer oder ein Netzwerk vor unerwünschten Zugriffen von innen oder außen.', [
    ok('Firewall', 'Das ist die Firewall. Sie transportiert nichts, sie entscheidet, was durchdarf.'),
    no('Router', 'Der Router leitet Daten weiter, er filtert sie nicht.'),
    no('Switch', 'Der Switch verteilt im LAN — schützen tut er nichts.'),
    no('NAS', 'Ein NAS ist Speicher. Abwehren kann es niemanden.'),
  ]),
  frage('t1-08', 'Leitet Daten zwischen verschiedenen Netzwerken weiter, meist zwischen Heimnetz und Internet.', [
    ok('Router', 'Das ist der Router. Das Wort "zwischen Netzwerken" ist der Hinweis: er steht an der Grenze.'),
    no('Switch', 'Der Switch bleibt innerhalb eines Netzes — nach draußen geht er nicht.'),
    no('Modem', 'Das Modem stellt die Leitung her. Zwischen den Netzwerken vermittelt der Router.'),
    no('Access Point', 'Der Access Point verbindet Funk und Kabel in einem Netz, nicht zwei Netze.'),
  ]),

  // Teil C — Client und Server
  frage('t1-09', 'Ein Netzwerkdrucker wartet darauf, dass jemand drucken will. Was ist er im Netzwerk?', [
    ok('Server – er bietet den Dienst „Drucken“ an', 'Ungewohnt, aber richtig: Er bietet den Dienst "Drucken" an und wartet darauf, dass jemand ihn nutzt.'),
    no('Client – er nutzt das Netzwerk', 'Ein Client fragt. Der Drucker wartet, bis jemand fragt — das ist genau andersherum.'),
    no('Weder noch – Drucker zählen nicht', 'Doch: Er bietet einen Dienst an, und der heißt Drucken.'),
  ]),

  // Teil D — Netzwerktypen
  frage('t1-10', 'Alle Schulen einer Stadt sind miteinander vernetzt. Welcher Netzwerktyp ist das?', [
    ok('MAN', 'Richtig. Metropolitan Area Network: eine Stadt — zum Beispiel alle Schulen einer Stadt, die zusammenhängen.'),
    no('LAN', 'Ein LAN ist ein Gebäude oder eine Wohnung. Mehrere Schulen in einer Stadt sind größer.'),
    no('WAN', 'Ein WAN reicht über Städte und Länder hinweg. Innerhalb einer Stadt: MAN.'),
    no('GAN', 'Ein GAN ist die ganze Welt — das Internet.'),
  ]),
  frage('t1-11', 'Was ist der Unterschied zwischen LAN und WLAN?', [
    ok('Ein WLAN ist ein LAN ohne Kabel', 'Richtig. Das W steht für "wireless". Größe und Zweck sind dieselben, nur die Leitung fehlt.'),
    no('Ein WLAN ist größer als ein LAN', 'Nein, mit der Größe hat es nichts zu tun — dafür sind MAN, WAN und GAN da.'),
    no('WLAN ist ein anderes Wort für Internet', 'Ein häufiger Irrtum: Das WLAN reicht nur bis zur Wohnungstür. Das Internet fängt hinter dem Router an.'),
  ]),

  // Teil E — Anschlüsse rechnen
  frage('t1-12', '5 PCs und 2 Drucker sollen per Kabel an einen Switch, der Switch selbst ans Netz. Wie viele Anschlüsse braucht der Switch mindestens?', [
    ok('8', 'Richtig gerechnet: 5 PCs + 2 Drucker + 1 Kabel zum Router = 8.'),
    no('7', 'Ein Anschluss fehlt: der Switch braucht selbst noch ein Kabel zum Router.'),
    no('6', 'Zu wenig — allein PCs und Drucker sind schon 7, und das Kabel zum Router kommt noch dazu.'),
    no('9', 'Einer zu viel: 5 + 2 + 1 = 8.'),
  ]),
]

export const t1TestM1: TestLesson = {
  kind: 'test',
  id: 't1',
  module: 'T1',
  title: 'Test M1',
  quali:
    'Genau diese Dinge — Gerät erkennen, Satz zuordnen, Netzwerktyp, Anschlüsse zählen — ' +
    'sind der erste Teil fast jeder Quali.',
  intro: {
    heading: 'Geräte & Komponenten',
    body: [
      '12 Fragen, etwa 10 Minuten. Jede Frage hat genau einen Versuch und es gibt keine Hinweise.',
      'Ob eine Antwort richtig war, siehst du erst am Ende — dann aber für jede Frage, mit Erklärung.',
    ],
  },
  tasks: TASKS,
}
