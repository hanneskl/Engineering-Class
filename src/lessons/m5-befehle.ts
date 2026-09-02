import type { ConsoleLesson } from '../model/types'
import type { Plan } from '../model/plan'
import {
  comparedTwoPings,
  pingedInternet,
  pingedType,
  ranCommand,
  tracedHops,
} from '../model/consoleRules'

/**
 * M5 — Netzwerkbefehle.
 *
 * Reading an `ipconfig` output is a recurring Quali task ("Wie lautet der
 * Befehl / die eigene IP / die IP des Routers?", 2022 and 2023). Here the
 * output is not a screenshot: it comes from the network the student drew in
 * M2, so the router's address in the listing is the one they assigned.
 */

/** Used when the student has not drawn a home network yet. */
const STARTER: Plan = {
  devices: [
    { id: 's-net', type: 'internet', name: 'Internet', x: 130, y: 90 },
    { id: 's-modem', type: 'modem', name: 'Modem', x: 300, y: 90 },
    { id: 's-router', type: 'router', name: 'Router', x: 470, y: 90, ip: '192.168.178.1' },
    { id: 's-pc', type: 'pc', name: 'PC', x: 300, y: 250, ip: '192.168.178.20' },
    { id: 's-ap', type: 'accesspoint', name: 'Access Point', x: 640, y: 90, ip: '192.168.178.2' },
    { id: 's-laptop', type: 'laptop', name: 'Laptop', x: 640, y: 250, ip: '192.168.178.21' },
    { id: 's-rep', type: 'repeater', name: 'WLAN-Repeater', x: 790, y: 250, ip: '192.168.178.3' },
    { id: 's-konsole', type: 'console', name: 'Konsole', x: 790, y: 400, ip: '192.168.178.22' },
  ],
  links: [
    { id: 's-l1', from: 's-net', to: 's-modem', medium: 'cable' },
    { id: 's-l2', from: 's-modem', to: 's-router', medium: 'cable' },
    { id: 's-l3', from: 's-router', to: 's-pc', medium: 'cable' },
    { id: 's-l4', from: 's-router', to: 's-ap', medium: 'cable' },
    { id: 's-l5', from: 's-ap', to: 's-laptop', medium: 'wifi' },
    { id: 's-l6', from: 's-ap', to: 's-rep', medium: 'wifi' },
    { id: 's-l7', from: 's-rep', to: 's-konsole', medium: 'wifi' },
  ],
}

export const m5Befehle: ConsoleLesson = {
  kind: 'console',
  id: 'm5',
  module: 'M5',
  title: 'Netzwerkbefehle',
  starter: STARTER,
  quali:
    'In den Qualis 2022 und 2023 war eine ipconfig-Ausgabe abgedruckt, mit den Fragen: ' +
    'Wie lautet der Befehl? Welche IP hat der eigene Rechner? Welche der Router?',
  intro: {
    heading: 'Mit dem Netzwerk reden',
    body: [
      'Ein Netzwerk kann man nicht nur zeichnen, man kann es auch befragen. Dafür gibt es ' +
        'vier Befehle, die auf jedem Windows-Rechner in der Eingabeaufforderung laufen.',
      '"ipconfig" zeigt deine eigene Adresse und die des Routers. "arp -a" listet die ' +
        'Nachbarn im Netz. "ping" misst, wie lange ein Paket zu einem Ziel und zurück ' +
        'braucht. "tracert" zeigt jede einzelne Station auf dem Weg.',
      'Unten läuft die Kommandozeile auf deinem eigenen Netzwerkplan. Die Zeiten sind ' +
        'kein Zufall: Kabel ist am schnellsten, WLAN langsamer, und über einen Repeater ' +
        'dauert es am längsten — genau wie zu Hause.',
    ],
  },
  tasks: [
    {
      id: 'm5-ipconfig',
      title: 'Wer bin ich?',
      brief:
        'Finde heraus, welche IP-Adresse dein Rechner hat und über welches Gerät er ins ' +
        'Netz geht. Tipp: Schreib "hilfe", wenn du nicht weiterweißt.',
      ziele: [
        {
          text: 'ipconfig ausgeführt',
          rules: [
            ranCommand(
              'ipconfig',
              'ipconfig',
              'Der Befehl zeigt deine IPv4-Adresse und das Standardgateway — das ist die Adresse deines Routers.',
            ),
          ],
        },
        {
          text: 'Die Nachbargeräte aufgelistet',
          rules: [
            ranCommand(
              'arp',
              'arp -a',
              'Damit siehst du, welche Geräte im selben Netz gerade erreichbar sind.',
            ),
          ],
        },
      ],
      hints: {
        stups: 'Beide Befehle schreibst du einfach in die Zeile unten und drückst Enter.',
        hinweis: 'Der erste heißt ipconfig, der zweite arp -a.',
        loesung:
          'Tipp "ipconfig" ein. Die Zeile "IPv4-Adresse" ist deine eigene Adresse, ' +
          '"Standardgateway" die deines Routers. Danach "arp -a" für die Nachbarn.',
      },
    },
    {
      id: 'm5-ping',
      title: 'Wie schnell ist mein Netz?',
      brief:
        'Ping deinen Router und danach ein Gerät, das über WLAN oder einen Repeater hängt. ' +
        'Vergleich die Zeiten — sie sind unterschiedlich, und das hat einen Grund.',
      ziele: [
        {
          text: 'Den Router angepingt',
          rules: [pingedType('router', 'deinen Router an')],
        },
        {
          text: 'Zwei unterschiedlich schnelle Ziele verglichen',
          rules: [comparedTwoPings()],
        },
      ],
      hints: {
        stups: 'Die Adresse des Routers steht bei ipconfig unter "Standardgateway".',
        hinweis:
          'Ein Gerät am Kabel antwortet in etwa 1 ms. Über WLAN dauert es länger, ' +
          'über einen Repeater noch einmal deutlich länger.',
        loesung:
          'Zum Beispiel: "ping 192.168.178.1" für den Router, dann "ping Konsole" für ' +
          'ein Gerät hinter dem Repeater. Der Unterschied ist der Umweg.',
      },
    },
    {
      id: 'm5-tracert',
      title: 'Der Weg ins Internet',
      brief:
        'Ping google.com und verfolge die Route dorthin. Wie viele Stationen liegen ' +
        'zwischen deinem Rechner und dem Server?',
      ziele: [
        { text: 'Eine Seite im Internet angepingt', rules: [pingedInternet()] },
        {
          text: 'tracert ausgeführt',
          rules: [ranCommand('tracert', 'tracert', 'Der Befehl zeigt jede Station auf dem Weg zum Ziel.')],
        },
        { text: 'Eine Route mit mindestens vier Stationen verfolgt', rules: [tracedHops(4)] },
      ],
      hints: {
        stups: 'Probier "ping google.com" und danach "tracert google.com".',
        hinweis:
          'Der Weg führt immer zuerst über deinen Router, dann über das Modem zum ' +
          'Provider und von dort weiter durchs Internet.',
        loesung:
          '"tracert google.com" listet Router, Provider, den Knoten in Frankfurt und ' +
          'schließlich google.com. Jede Zeile ist eine Station, die dein Paket passiert.',
      },
    },
  ],
}
