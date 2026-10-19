import type { TestLesson, TestTask } from '../model/types'
import type { Option } from '../model/frage'

/**
 * Test M2 — twelve questions on Netzwerk zeichnen, done at the start of the
 * M3 lesson (docs/briefing-test-m2.md). Same shape as Test M1: one right
 * option per question, listed first — the screen shuffles per student — and
 * a `warum` on every option that says, for a wrong one, what is right instead.
 *
 * No pictures this time: everything M2 teaches is about how the devices hang
 * together, which a sentence carries as well as a photo would.
 */

const ok = (text: string, warum: string): Option => ({ text, ok: true, warum })
const no = (text: string, warum: string): Option => ({ text, ok: false, warum })

const frage = (id: string, text: string, optionen: Option[]): TestTask => ({
  id,
  frage: { id, text, optionen },
})

const TASKS: TestTask[] = [
  // Teil A — Wie das Netz zusammenhängt
  frage('t2-01', 'In welcher Reihenfolge geht ein Paket vom PC ins Internet?', [
    ok('PC → Router → Modem → Internet', 'Richtig — der Router ist das Tor deines Netzes, dahinter verbindet das Modem mit dem Provider.'),
    no('PC → Modem → Router → Internet', 'Andersherum: Erst kommt der Router, das Modem ist ganz außen die Verbindung zum Provider.'),
    no('PC → Switch → Internet', 'Der Switch verteilt nur innerhalb deines LANs. Nach draußen geht es über Router und Modem.'),
    no('PC → Internet → Router', 'Der Router steht vor dem Internet, nicht dahinter — er ist das Tor nach draußen.'),
  ]),
  frage('t2-02', 'Der Router hat 4 Anschlüsse, du willst 6 PCs per Kabel anschließen. Was brauchst du zusätzlich?', [
    ok('Einen Switch', 'Genau — der Switch hängt mit einem Kabel am Router und bringt viele neue Buchsen mit.'),
    no('Einen Access Point', 'Ein Access Point verbindet Funkgeräte. Für mehr Kabel-PCs brauchst du einen Switch.'),
    no('Einen WLAN-Repeater', 'Der Repeater verlängert nur das WLAN. Mehr Kabelanschlüsse bringt ein Switch.'),
    no('Ein zweites Modem', 'Das Modem verbindet mit dem Provider, nicht mit PCs. Mehr Anschlüsse bringt ein Switch.'),
  ]),
  frage('t2-03', 'Warum soll kein PC direkt am Modem hängen, am Router vorbei?', [
    ok('Er wäre ungeschützt – ohne Router keine Firewall, kein Tor', 'Richtig — der Router trennt dein Netz vom Internet und schützt es. Am Modem hängt man direkt draußen.'),
    no('Er wäre langsamer', 'Um Tempo geht es nicht, sondern um Schutz: Am Router vorbei fehlt die Firewall.'),
    no('Er bekäme zwei IP-Adressen', 'Nein, jedes Gerät hat eine Adresse. Das Problem ist der fehlende Schutz durch den Router.'),
    no('Das ist egal', 'Doch, das ist wichtig: Der Router trennt dein Netz vom Internet. Ohne ihn ist der PC ungeschützt.'),
  ]),

  // Teil B — Geräte ohne Kabel
  frage('t2-04', 'Ein Smartphone hat keine Netzwerkbuchse. Wie kommt es ins Netz?', [
    ok('Per WLAN über einen Access Point', 'Genau — der Access Point bringt Funkgeräte ins kabelgebundene Netz.'),
    no('Per Kabel an den Switch', 'Dafür bräuchte es eine Buchse, und die hat es nicht. Es geht per WLAN über einen Access Point.'),
    no('Direkt ans Modem', 'Das wäre am Router vorbei — und ohne Buchse geht es sowieso nicht. Richtig ist WLAN über einen Access Point.'),
    no('Gar nicht', 'Doch, per Funk: Ein Access Point bringt das Smartphone per WLAN ins Netz.'),
  ]),
  frage('t2-05', 'Wie ist ein Access Point selbst angeschlossen?', [
    ok('Per Kabel an Router oder Switch', 'Richtig — erst der Access Point hängt am Kabel, die Geräte danach gehen per WLAN.'),
    no('Per WLAN am Router', 'Ein Gerät, das selbst per WLAN hängt, ist ein Repeater. Der Access Point hängt am Kabel.'),
    no('Über das Smartphone', 'Umgekehrt: Das Smartphone kommt über den Access Point ins Netz, nicht der Access Point über das Smartphone.'),
    no('Gar nicht, er funkt einfach', 'Er braucht selbst eine Verbindung ins Netz — per Kabel an Router oder Switch.'),
  ]),
  frage('t2-06', 'In einem Netzwerkschema ist eine Linie gestrichelt. Was bedeutet das?', [
    ok('Eine WLAN-Verbindung', 'Richtig — im Schema heißt durchgezogen Kabel, gestrichelt Funk.'),
    no('Ein kaputtes Kabel', 'Kaputte Kabel zeichnet man nicht ein. Gestrichelt heißt Funk, also WLAN.'),
    no('Die Verbindung ins Internet', 'Die ist meist ein Kabel. Gestrichelt steht im Schema für eine WLAN-Verbindung.'),
    no('Ein Stromkabel', 'Strom zeichnet man im Netzwerkschema nicht. Durchgezogen = Kabel, gestrichelt = Funk.'),
  ]),

  // Teil C — IP-Adressen
  frage('t2-07', 'Wer vergibt die IP-Adressen im Heimnetz automatisch?', [
    ok('Der Router, per DHCP', 'Genau — der Router verteilt die Adressen per DHCP, so bekommt jedes Gerät eine eigene.'),
    no('Der Switch', 'Der Switch verteilt Daten, keine Adressen. Das macht der Router per DHCP.'),
    no('Das Modem', 'Das Modem spricht nur mit dem Provider. Die Adressen im Heimnetz vergibt der Router.'),
    no('Jedes Gerät sich selbst', 'Dann gäbe es schnell doppelte Adressen. Deshalb vergibt sie der Router zentral per DHCP.'),
  ]),
  frage('t2-08', 'Welche Adresse hat in einem Heimnetz meistens der Router?', [
    ok('192.168.178.1', 'Richtig — der Router bekommt meistens die 1 am Ende, er ist das erste Gerät im Netz.'),
    no('192.168.178.20', 'So fangen meist die anderen Geräte an. Der Router hat in der Regel die .1.'),
    no('8.8.8.8', 'Das ist eine Adresse draußen im Internet, nicht in deinem Heimnetz. Der Router hat meist 192.168.178.1.'),
    no('255.255.255.0', 'Das ist die Subnetzmaske, keine Geräteadresse. Der Router hat meist 192.168.178.1.'),
  ]),
  frage('t2-09', 'PC 192.168.178.20, Laptop 192.168.178.21, Smartphone 192.168.178.20. Was stimmt nicht?', [
    ok('Zwei Geräte haben dieselbe Adresse', 'Genau — PC und Smartphone teilen sich die .20. Jede Adresse darf nur einmal vorkommen.'),
    no('Der Laptop ist im falschen Netz', 'Alle drei beginnen mit 192.168.178, sind also im selben Netz. Das Problem ist die doppelte .20.'),
    no('Die Zahlen sind zu groß', 'Bis 255 ist jede Zahl gültig. Das Problem ist, dass PC und Smartphone beide .20 haben.'),
    no('Alles stimmt', 'Schau noch einmal hin: PC und Smartphone teilen sich die .20 — das gibt Ärger.'),
  ]),
  frage('t2-10', 'Im Heimnetz 192.168.178.x hat der Drucker 192.168.1.23. Was ist das Problem?', [
    ok('Er liegt in einem anderen Netz', 'Richtig — 192.168.1 statt 192.168.178: Der Drucker liegt in einem anderen Netz und ist nicht erreichbar.'),
    no('Die Adresse ist doppelt', 'Nein, keine andere Adresse ist gleich. Das Problem ist der Anfang: 192.168.1 statt 192.168.178.'),
    no('Die letzte Zahl ist zu klein', '23 ist erlaubt. Das Problem steckt vorne: 192.168.1 ist ein anderes Netz als 192.168.178.'),
    no('Kein Problem', 'Doch: Die ersten drei Zahlen müssen bei allen Geräten gleich sein. Beim Drucker steht 1 statt 178.'),
  ]),
  frage('t2-11', 'In der ipconfig-Ausgabe steht „Standardgateway“. Welches Gerät ist das?', [
    ok('Der Router', 'Genau — das Standardgateway ist das Tor nach draußen, und das ist der Router.'),
    no('Der eigene PC', 'Die eigene Adresse steht bei „IPv4-Adresse“. Das Standardgateway ist der Router.'),
    no('Der Internetanbieter', 'Der steht außerhalb des Heimnetzes. Das Gateway in deinem Netz ist der Router.'),
    no('Der Switch', 'Der Switch hat im Heimnetz keine Gateway-Rolle. Das Tor nach draußen ist der Router.'),
  ]),
  frage('t2-12', 'Welcher Teil von 192.168.178.20 unterscheidet die Geräte im Heimnetz?', [
    ok('Die letzte Zahl (20)', 'Richtig — die ersten drei Zahlen sind bei allen gleich, wie die Straße. Die letzte ist die Hausnummer.'),
    no('Die erste Zahl (192)', 'Die 192 ist bei allen Geräten im Heimnetz gleich. Unterscheiden tut sie nur die letzte Zahl.'),
    no('Die ersten drei Zahlen', 'Die sind bei allen gleich — wie die Straße. Die Hausnummer ist die letzte Zahl.'),
    no('Alle vier gleichzeitig', 'Nur die letzte Zahl unterscheidet die Geräte. Die ersten drei sind das Netz, das alle teilen.'),
  ]),
]

export const t2TestM2: TestLesson = {
  kind: 'test',
  id: 't2',
  module: 'T2',
  title: 'Test M2',
  quali:
    'Netzwerkschemata lesen, Geräte richtig anschließen, Adressen prüfen — ' +
    'genau so fragt die Quali nach dem Netzwerk.',
  intro: {
    heading: 'Netzwerk zeichnen',
    body: [
      '12 Fragen, etwa 10 Minuten. Es gibt keine Hinweise.',
      'Bis zur Abgabe kannst du zwischen den Fragen blättern und Antworten ändern — danach stehen sie fest.',
      'Ob eine Antwort richtig war, siehst du erst am Ende — dann aber für jede Frage, mit Erklärung.',
    ],
  },
  tasks: TASKS,
}
