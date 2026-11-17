import type { TestLesson, TestTask } from '../model/types'
import type { Option } from '../model/frage'

/**
 * Test M5 — twelve questions on Netzwerkbefehle, done at the start of the M6
 * lesson (docs/briefing-test-m5.md). Same shape as Tests M1–M3: one right
 * option per question, listed first — the screen shuffles per student — and a
 * `warum` on every option that says, for a wrong one, what is right instead.
 *
 * No pictures. t4-07 and t4-08 show a console printout as an `ausschnitt`,
 * line for line, the way the Eingabeaufforderung prints it.
 */

const ok = (text: string, warum: string): Option => ({ text, ok: true, warum })
const no = (text: string, warum: string): Option => ({ text, ok: false, warum })

const frage = (id: string, text: string, optionen: Option[]): TestTask => ({
  id,
  frage: { id, text, optionen },
})

const TASKS: TestTask[] = [
  // Teil A — Die Befehle
  frage('t4-01', 'Wie öffnest du unter Windows die Eingabeaufforderung?', [
    ok('Windows-Taste, cmd eintippen, Enter', 'Genau — cmd ist das Befehlsfenster, in das du alle Netzwerkbefehle tippst.'),
    no('Rechtsklick auf den Desktop', 'Dort gibt es keine Eingabeaufforderung. Du öffnest sie mit Windows-Taste, cmd, Enter.'),
    no('Im Browser cmd eingeben', 'Der Browser ist kein Befehlsfenster. Richtig ist Windows-Taste, cmd, Enter.'),
    no('Strg + Alt + Entf', 'Das öffnet den Sperrbildschirm. Die Eingabeaufforderung kommt mit Windows-Taste, cmd, Enter.'),
  ]),
  frage('t4-02', 'Welcher Befehl zeigt deine eigene IP-Adresse und das Standardgateway?', [
    ok('ipconfig', 'Richtig — ipconfig zeigt die Einstellungen des eigenen PCs: IPv4-Adresse, Maske, Gateway.'),
    no('ping', 'ping testet nur, ob jemand antwortet. Die eigene Adresse zeigt ipconfig.'),
    no('tracert', 'tracert zeigt den Weg ins Internet. Die eigene Adresse zeigt ipconfig.'),
    no('arp -a', 'arp -a zeigt die Nachbarn im Netz. Die eigene Adresse zeigt ipconfig.'),
  ]),
  frage('t4-03', 'Welcher Befehl listet die anderen Geräte im Netz mit ihrer MAC-Adresse?', [
    ok('arp -a', 'Genau — arp -a zeigt die Nachbarn im Netz, jeweils mit IP- und MAC-Adresse.'),
    no('ipconfig', 'ipconfig zeigt nur das eigene Gerät. Die Nachbarn zeigt arp -a.'),
    no('ping', 'ping fragt ein einzelnes Ziel. Die Liste der Nachbarn zeigt arp -a.'),
    no('tracert', 'tracert zeigt die Stationen auf dem Weg ins Internet. Die Nachbarn zeigt arp -a.'),
  ]),

  // Teil B — ping
  frage('t4-04', 'Was macht der Befehl ping 192.168.178.1?', [
    ok('Er schickt ein kleines Testpaket an den Router und wartet auf eine Antwort', 'Richtig — ping fragt „Bist du da?“ und misst, wie lange die Antwort braucht.'),
    no('Er startet den Router neu', 'ping fragt nur, er ändert nichts. Er schickt ein Testpaket und wartet auf die Antwort.'),
    no('Er zeigt alle Geräte im Netz', 'Das ist arp -a. ping fragt ein einzelnes Ziel.'),
    no('Er misst die Internetgeschwindigkeit in Mbit/s', 'ping misst die Antwortzeit in ms, nicht die Geschwindigkeit.'),
  ]),
  frage('t4-05', 'Was bedeutet die Angabe „Zeit=1ms“ bei ping?', [
    ok('Hin- und Rückweg haben eine Tausendstel Sekunde gedauert', 'Genau — ms heißt Millisekunde, also eine Tausendstel Sekunde für hin und zurück.'),
    no('Die Seite lädt in 1 Minute', 'ms heißt Millisekunde, nicht Minute. Hin und zurück hat eine Tausendstel Sekunde gedauert.'),
    no('Es wurde 1 MB übertragen', 'Das ist keine Datenmenge, sondern eine Zeit: eine Tausendstel Sekunde.'),
    no('Das Gerät ist 1 Meter entfernt', 'ping misst Zeit, keine Entfernung: hin und zurück eine Tausendstel Sekunde.'),
  ]),
  frage('t4-06', 'Welches Gerät antwortet bei ping meistens am schnellsten?', [
    ok('Ein PC, der per Kabel am Router hängt', 'Richtig — Kabel ist schneller als Funk, und es gibt keinen Umweg.'),
    no('Ein Laptop im WLAN', 'Funk ist langsamer als Kabel. Am schnellsten antwortet der PC am Kabel.'),
    no('Ein Fernseher hinter dem WLAN-Repeater', 'Zweimal Funk, ein Umweg mehr. Am schnellsten antwortet der PC am Kabel.'),
    no('Ein Server im Internet', 'Bis dahin liegen viele Stationen dazwischen. Am schnellsten antwortet der PC am Kabel.'),
  ]),
  {
    ...frage('t4-07', 'ping zeigt diese Ausgabe. Was heißt das?', [
      ok('Das Ziel hat nicht geantwortet – es ist gerade nicht erreichbar', 'Genau — ping hat viermal gefragt und nie eine Antwort bekommen.'),
      no('Alles ist in Ordnung', 'Keine Antwort ist ein Problem: Das Ziel ist gerade nicht erreichbar.'),
      no('Der eigene PC hat keine IP-Adresse mehr', 'Das würde ipconfig zeigen. Hier hat das Ziel nicht geantwortet.'),
      no('Das Internet ist zu schnell', 'Das gibt es nicht. Zeitüberschreitung heißt: Das Ziel hat nicht geantwortet.'),
    ]),
    ausschnitt: [
      'C:\\> ping 192.168.178.20',
      '',
      'Ping wird ausgeführt für 192.168.178.20 mit 32 Bytes Daten:',
      'Zeitüberschreitung der Anforderung.',
      'Zeitüberschreitung der Anforderung.',
      'Zeitüberschreitung der Anforderung.',
      'Zeitüberschreitung der Anforderung.',
    ].join('\n'),
  },

  // Teil C — tracert
  {
    ...frage('t4-08', 'Was zeigt der Befehl tracert google.com?', [
      ok('Jede Station, über die das Paket bis google.com läuft', 'Richtig — jede Zeile ist eine Station auf dem Weg, mit ihrer Antwortzeit.'),
      no('Die IP-Adresse des eigenen PCs', 'Das ist ipconfig. tracert zeigt die Stationen auf dem Weg.'),
      no('Den Inhalt der Seite google.com', 'Das macht der Browser. tracert zeigt nur den Weg dorthin.'),
      no('Alle Geräte im Heimnetz', 'Das ist arp -a. tracert zeigt die Stationen bis zum Ziel.'),
    ]),
    ausschnitt: [
      'C:\\> tracert google.com',
      '',
      'Routenverfolgung zu google.com [142.250.185.78]',
      '  1     1 ms     1 ms     1 ms  192.168.178.1',
      '  2    12 ms    11 ms    12 ms  62.155.243.94',
      '  3    14 ms    13 ms    14 ms  142.250.185.78',
      '',
      'Ablaufverfolgung beendet.',
    ].join('\n'),
  },
  frage('t4-09', 'Welche Station steht bei tracert immer ganz oben, also an Nummer 1?', [
    ok('Der eigene Router, das Standardgateway', 'Genau — jedes Paket nach draußen geht zuerst an den eigenen Router.'),
    no('google.com', 'Das Ziel steht ganz unten. An Nummer 1 steht der eigene Router.'),
    no('Der DNS-Server', 'Der taucht bei tracert nicht auf. An Nummer 1 steht der eigene Router.'),
    no('Der Switch', 'Switches haben keine Station mit Zeit. An Nummer 1 steht der eigene Router.'),
  ]),

  // Teil D — Fehlersuche
  frage('t4-10', '„Das Internet geht nicht!“ Womit fängt der Profi an?', [
    ok('ipconfig: Habe ich überhaupt eine Adresse?', 'Richtig — erst das eigene Gerät prüfen, dann den Weg nach draußen.'),
    no('Sofort tracert google.com', 'Erst das eigene Gerät prüfen: ipconfig. Der Weg nach draußen kommt danach.'),
    no('Router wegwerfen', 'Erst prüfen, dann handeln. Angefangen wird mit ipconfig.'),
    no('Den Browser neu installieren', 'Der Fehler liegt meist im Netz. Angefangen wird mit ipconfig.'),
  ]),
  frage('t4-11', 'ping 192.168.178.1 klappt, ping google.com nicht. Wo liegt das Problem wahrscheinlich?', [
    ok('Zwischen Router und Internet – beim Router oder beim Anbieter', 'Genau — bis zum Router geht es, erst dahinter hakt es.'),
    no('Am eigenen PC', 'Der Router antwortet ja, also geht es vom PC aus. Das Problem liegt hinter dem Router.'),
    no('Am WLAN-Kabel', 'Bis zum Router geht es. Das Problem liegt dahinter, zum Internet hin.'),
    no('An der Tastatur', 'Die Befehle kommen ja an. Das Problem liegt hinter dem Router.'),
  ]),
  frage('t4-12', 'Was gehört zusammen?', [
    ok('ipconfig – Wer bin ich? · arp -a – Wer ist noch da? · ping – Bist du da? · tracert – Welcher Weg?', 'Richtig — jeder Befehl beantwortet genau eine dieser Fragen.'),
    no('ipconfig – Wer ist noch da? · arp -a – Wer bin ich? · ping – Bist du da? · tracert – Welcher Weg?', 'ipconfig und arp -a sind vertauscht: ipconfig zeigt dich selbst, arp -a die anderen.'),
    no('ipconfig – Wer bin ich? · arp -a – Wer ist noch da? · ping – Welcher Weg? · tracert – Bist du da?', 'ping und tracert sind vertauscht: ping fragt „Bist du da?“, tracert zeigt den Weg.'),
    no('ipconfig – Wer bin ich? · arp -a – Bist du da? · ping – Wer ist noch da? · tracert – Welcher Weg?', 'arp -a und ping sind vertauscht: arp -a zeigt alle anderen, ping fragt ein einzelnes Ziel.'),
  ]),
]

export const t4TestM5: TestLesson = {
  kind: 'test',
  id: 't4',
  module: 'T4',
  title: 'Test M5',
  quali:
    'ipconfig lesen, ping und tracert deuten, den richtigen Befehl wählen — ' +
    'genau so fragt die Quali nach den Netzwerkbefehlen.',
  intro: {
    heading: 'Netzwerkbefehle',
    body: [
      'Etwa 15 Minuten. Es gibt keine Hinweise.',
      'Bis zur Abgabe kannst du zwischen den Fragen blättern und Antworten ändern — danach stehen sie fest.',
      'Ob eine Antwort richtig war, siehst du erst am Ende — dann aber für jede Frage, mit Erklärung.',
    ],
  },
  tasks: TASKS,
}
