import type { TestLesson, TestTask } from '../model/types'
import type { Option } from '../model/frage'

/**
 * Test M3 — twelve questions on Adressen im Netzwerk, done at the start of
 * the M5 lesson (docs/briefing-test-m3.md). Same shape as Tests M1 and M2:
 * one right option per question, listed first — the screen shuffles per
 * student — and a `warum` on every option that says, for a wrong one, what
 * is right instead.
 *
 * No pictures. t3-11 shows a piece of ipconfig output as an `ausschnitt`,
 * so it reads line for line the way the console prints it.
 */

const ok = (text: string, warum: string): Option => ({ text, ok: true, warum })
const no = (text: string, warum: string): Option => ({ text, ok: false, warum })

const frage = (id: string, text: string, optionen: Option[]): TestTask => ({
  id,
  frage: { id, text, optionen },
})

const TASKS: TestTask[] = [
  // Teil A — Die IP-Adresse
  frage('t3-01', 'Wozu braucht jedes Gerät im Netzwerk eine IP-Adresse?', [
    ok('Damit Pakete das richtige Gerät finden', 'Genau — wie eine Hausnummer: Ohne sie wüsste kein Paket, wohin es soll.'),
    no('Damit es schneller surft', 'Die Adresse macht nichts schneller. Sie sorgt dafür, dass Pakete das richtige Gerät finden.'),
    no('Damit es WLAN empfangen kann', 'Funk geht auch ohne Adresse — aber ohne Adresse kommt kein Paket bei dem Gerät an.'),
    no('Damit man es im Laden erkennt', 'Dafür wäre eher die Seriennummer da. Die IP-Adresse braucht es, damit Pakete das Gerät finden.'),
  ]),
  frage('t3-02', 'Aus wie vielen Zahlenblöcken besteht eine IPv4-Adresse?', [
    ok('4', 'Richtig — vier Blöcke, durch Punkte getrennt, zum Beispiel 192.168.178.20.'),
    no('3', 'Einer fehlt: Es sind vier Blöcke, zum Beispiel 192.168.178.20.'),
    no('6', 'Sechs Gruppen hat die MAC-Adresse. Eine IPv4-Adresse hat vier Blöcke.'),
    no('8', 'Zu viele — eine IPv4-Adresse hat vier Blöcke, durch Punkte getrennt.'),
  ]),
  frage('t3-03', 'Welche Zahlen sind in einem Block erlaubt?', [
    ok('0 bis 255', 'Genau — jeder Block geht von 0 bis 255, mehr passt nicht hinein.'),
    no('1 bis 100', 'Zu wenig: Jeder Block geht von 0 bis 255.'),
    no('0 bis 999', 'Größer als 255 geht nicht — jeder Block reicht nur von 0 bis 255.'),
    no('1 bis 1000', 'Jeder Block geht nur bis 255, und die 0 ist auch erlaubt.'),
  ]),
  frage('t3-04', 'Welche Adresse ist ungültig?', [
    ok('192.168.178.300', 'Richtig — 300 ist größer als 255, so ein Block geht nicht.'),
    no('10.0.0.1', 'Die ist gültig: Alle Blöcke liegen zwischen 0 und 255. Ungültig ist 192.168.178.300.'),
    no('84.153.12.7', 'Die ist gültig: Alle Blöcke liegen zwischen 0 und 255. Nur 300 ist zu groß.'),
    no('192.168.0.254', '254 ist gerade noch erlaubt. Ungültig ist die Adresse mit der 300.'),
  ]),

  // Teil B — Heimnetz und Internet
  frage('t3-05', 'Welche Adresse kommt aus einem Heimnetz?', [
    ok('192.168.178.34', 'Genau — Heimnetze beginnen meistens mit 192.168.'),
    no('84.153.12.7', 'Das ist eine externe Adresse vom Anbieter. Heimnetze beginnen meist mit 192.168.'),
    no('8.8.8.8', 'Das ist ein Server im Internet. Heimnetz-Adressen beginnen meist mit 192.168.'),
    no('142.250.185.78', 'Das ist ein Server von Google. Heimnetz-Adressen beginnen meist mit 192.168.'),
  ]),
  frage('t3-06', 'Laptop, Handy und Konsole surfen gleichzeitig. Welche Adresse sieht die Webseite?', [
    ok('Bei allen dreien dieselbe: die externe Adresse des Routers', 'Richtig — nach draußen spricht nur der Router, mit seiner einen externen Adresse.'),
    no('Drei verschiedene 192.168-Adressen', 'Private Adressen verlassen das Heimnetz nie. Die Webseite sieht nur die externe Adresse des Routers.'),
    no('Die MAC-Adressen der Geräte', 'Die MAC-Adressen bleiben im Heimnetz. Draußen sieht man nur die externe Adresse des Routers.'),
    no('Gar keine', 'Ohne Adresse käme keine Antwort zurück. Die Webseite sieht die externe Adresse des Routers.'),
  ]),
  frage('t3-07', 'Der Router ist wie die Rezeption eines Hotels. Was entspricht den Zimmernummern?', [
    ok('Die privaten Adressen der Geräte im Heimnetz', 'Genau — drinnen hat jedes Gerät seine eigene Nummer, wie jedes Zimmer im Hotel.'),
    no('Die externe Adresse', 'Das ist die Hoteladresse, an die die Post von draußen geht. Die Zimmernummern sind die privaten Adressen.'),
    no('Die MAC-Adressen', 'Die sind eher wie Fingerabdrücke der Gäste. Die Zimmernummern sind die privaten Adressen.'),
    no('Die Webseiten', 'Die sind draußen, nicht im Hotel. Die Zimmernummern sind die privaten Adressen im Heimnetz.'),
  ]),

  // Teil C — Die MAC-Adresse
  frage('t3-08', 'Was ist eine MAC-Adresse?', [
    ok('Die feste Nummer der Netzwerkkarte, vom Hersteller vergeben', 'Richtig — sie steckt fest in der Hardware und ändert sich nicht.'),
    no('Eine Adresse nur für Apple-Geräte', 'MAC hat nichts mit Apple zu tun. Jede Netzwerkkarte hat eine, fest vom Hersteller vergeben.'),
    no('Die Adresse, die der Router per DHCP verteilt', 'Per DHCP verteilt der Router die IP-Adresse. Die MAC-Adresse ist fest in der Netzwerkkarte.'),
    no('Die Adresse des Routers im Internet', 'Das ist die externe Adresse. Die MAC-Adresse ist die feste Nummer der Netzwerkkarte.'),
  ]),
  frage('t3-09', 'Welche dieser Angaben ist eine MAC-Adresse?', [
    ok('3C-5A-B4-1F-08-9D', 'Genau — sechs Zweiergruppen aus Ziffern und den Buchstaben A bis F.'),
    no('192.168.178.20', 'Das ist eine IP-Adresse. Eine MAC-Adresse hat sechs Zweiergruppen aus Ziffern und A–F.'),
    no('255.255.255.0', 'Das ist die Subnetzmaske. Eine MAC-Adresse hat sechs Zweiergruppen aus Ziffern und A–F.'),
    no('www.apple.com', 'Das ist der Name einer Webseite. Eine MAC-Adresse hat sechs Zweiergruppen aus Ziffern und A–F.'),
  ]),
  frage('t3-10', 'Du nimmst deinen Laptop mit in die Schule und gehst dort ins WLAN. Was passiert mit den Adressen?', [
    ok('Die IP-Adresse ändert sich, die MAC-Adresse bleibt gleich', 'Richtig — das Schul-WLAN vergibt eine neue IP, die MAC steckt fest in der Hardware.'),
    no('Beide bleiben gleich', 'Die MAC bleibt, aber das Schul-WLAN vergibt eine neue IP-Adresse.'),
    no('Beide ändern sich', 'Die IP ändert sich, die MAC aber nicht — sie steckt fest in der Hardware.'),
    no('Die MAC ändert sich, die IP bleibt', 'Genau andersherum: Die IP ändert sich, die MAC bleibt gleich.'),
  ]),

  // Teil D — ipconfig und Gateway
  {
    ...frage('t3-11', 'Ausschnitt aus ipconfig — welche IP-Adresse hat dieser Rechner?', [
      ok('192.168.0.57', 'Genau — das steht bei „IPv4-Adresse“, das ist der Rechner selbst.'),
      no('192.168.0.1', 'Das ist das Standardgateway, also der Router. Der Rechner hat 192.168.0.57.'),
      no('255.255.255.0', 'Die Subnetzmaske ist keine Adresse. Der Rechner hat 192.168.0.57.'),
      no('192.168.0.0', 'Die steht hier gar nicht. Schau bei „IPv4-Adresse“: 192.168.0.57.'),
    ]),
    ausschnitt: [
      'IPv4-Adresse . . . : 192.168.0.57',
      'Subnetzmaske . . . : 255.255.255.0',
      'Standardgateway . . : 192.168.0.1',
    ].join('\n'),
  },
  frage('t3-12', 'Dein PC schickt ein Paket an google.com. An welches Gerät geht es zuerst?', [
    ok('An das Standardgateway, also den Router', 'Richtig — alles, was das Heimnetz verlässt, geht zuerst an den Router.'),
    no('Direkt an google.com', 'Erst muss das Paket aus dem Heimnetz raus — und das geht nur über den Router.'),
    no('An den Switch des Nachbarn', 'Der hat mit deinem Netz nichts zu tun. Zuerst geht das Paket an deinen Router.'),
    no('An die MAC-Adresse von Google', 'MAC-Adressen gelten nur im eigenen Netz. Zuerst geht das Paket an den Router.'),
  ]),
]

export const t3TestM3: TestLesson = {
  kind: 'test',
  id: 't3',
  module: 'T3',
  title: 'Test M3',
  quali:
    'Adressen erkennen, ipconfig lesen, IP und MAC auseinanderhalten — ' +
    'genau so fragt die Quali nach den Adressen im Netzwerk.',
  intro: {
    heading: 'Adressen im Netzwerk',
    body: [
      '12 Fragen, etwa 10 Minuten. Es gibt keine Hinweise.',
      'Bis zur Abgabe kannst du zwischen den Fragen blättern und Antworten ändern — danach stehen sie fest.',
      'Ob eine Antwort richtig war, siehst du erst am Ende — dann aber für jede Frage, mit Erklärung.',
    ],
  },
  tasks: TASKS,
}
