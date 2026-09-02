import type { TraceLesson } from '../model/types'
import {
  answeredTrace,
  markedIdentifying,
  renewedCookie,
  sawAllViews,
  trackedAcross,
  visitedAtLeast,
} from '../model/traceRules'

/**
 * M7 — Anonymität & Spuren im Internet.
 *
 * "… zu erkennen, dass es nur eine vermeintliche Anonymität in einem Netzwerk
 * gibt." The word vermeintlich is the whole lesson: students are convinced
 * they are anonymous because nobody asked for their name. So they surf, and
 * then read the three logs their clicks just wrote — including the provider's,
 * which has their name in it.
 */
export const m7Spuren: TraceLesson = {
  kind: 'traces',
  id: 'm7',
  module: 'M7',
  title: 'Spuren im Internet',
  quali:
    'Der Lehrplan verlangt zu erkennen, dass es im Netz nur eine vermeintliche Anonymität ' +
    'gibt. Gefragt wird nach den Spuren (IP-Adresse, Uhrzeit, besuchte Seite, Browser), ' +
    'danach, wo ein Cookie gespeichert wird, und danach, wer dich identifizieren kann.',
  intro: {
    heading: 'Wer schaut dir eigentlich zu?',
    body: [
      'Im Internet fragt dich niemand nach deinem Namen — deshalb fühlt es sich anonym an. ' +
        'Ist es aber nicht: Jeder Klick hinterlässt eine Zeile in irgendeinem Protokoll.',
      'Unten kannst du surfen. Danach siehst du dieselben Besuche aus drei Blickwinkeln: ' +
        'aus dem des Seitenbetreibers, aus dem eines Trackers, der auf vielen Seiten ' +
        'gleichzeitig sitzt, und aus dem deines Internet-Anbieters.',
      'Keine Sorge: Es geht nichts hinaus. Alles hier passiert in deinem eigenen Browser — ' +
        'was im echten Internet gerade nicht der Fall ist.',
    ],
  },
  tasks: [
    {
      id: 'm7-log',
      title: 'Was steht über dich im Log?',
      brief:
        'Besuch ein paar Seiten und schau dir danach an, was der Betreiber der Seite über ' +
        'deinen Besuch mitgeschrieben hat. Markier die Angaben, die zu dir führen.',
      markieren: true,
      fragen: ['ip-name'],
      ziele: [
        { text: 'Drei verschiedene Seiten besucht', rules: [visitedAtLeast(3)] },
        {
          text: 'Die zwei Angaben markiert, die zu dir führen',
          rules: [markedIdentifying()],
        },
        {
          text: 'Erklärt, wer aus einer IP-Adresse einen Namen machen kann',
          rules: [
            answeredTrace(
              'ip-name',
              'Beantworte die Frage unter dem Log.',
              'Die Seite sieht nur eine Zahl. Jemand anders weiß, wem diese Zahl gehörte.',
            ),
          ],
        },
      ],
      hints: {
        stups: 'Klick oben auf drei verschiedene Seiten und dann unten auf die Felder im Log.',
        hinweis:
          'Uhrzeit, Seite und Browser sagen etwas über den Besuch. Zwei Angaben sagen etwas ' +
          'über die Person davor — such die beiden.',
        loesung:
          'Die IP-Adresse und die Cookie-ID führen zu dir: Die IP-Adresse hat dein Provider ' +
          'vergeben und er weiß, welcher Anschluss sie hatte. Die Cookie-ID liegt in deinem ' +
          'Browser und erkennt dich beim nächsten Mal wieder.',
      },
    },
    {
      id: 'm7-cookies',
      title: 'Der Keks, der dich wiedererkennt',
      brief:
        'Schau ins Tracker-Log. Dieselbe Nummer taucht auf mehreren Seiten auf — obwohl die ' +
        'Seiten nichts miteinander zu tun haben. Lösch den Cookie und surf danach weiter.',
      fragen: ['cookie-ort', 'weiss-quer'],
      ziele: [
        {
          text: 'Denselben Cookie auf drei Seiten erwischt',
          rules: [trackedAcross(3)],
        },
        {
          text: 'Den Cookie gelöscht und danach weitergesurft',
          rules: [renewedCookie()],
        },
        {
          text: 'Erklärt, wo ein Cookie liegt und wer quer mitliest',
          rules: [
            answeredTrace(
              'cookie-ort',
              'Beantworte die Frage, wo ein Cookie gespeichert wird.',
              'Überleg, warum du ihn überhaupt löschen kannst.',
            ),
            answeredTrace(
              'weiss-quer',
              'Beantworte die Frage, wer dich auf mehreren Seiten wiedererkennt.',
              'Schau ins Tracker-Log: Welche Angabe ist auf allen drei Seiten dieselbe?',
            ),
          ],
        },
      ],
      hints: {
        stups: 'Der Knopf zum Löschen sitzt oben rechts neben der Cookie-Nummer.',
        hinweis:
          'Ein Cookie ist ein Wert, den eine Seite in deinem Browser ablegt und beim nächsten ' +
          'Besuch wieder abholt. Deshalb kannst du ihn wegwerfen — deine IP-Adresse nicht.',
        loesung:
          'Der Cookie liegt in deinem Browser. Weil dieselbe Werbefirma auf vielen Seiten ' +
          'eingebaut ist, erkennt sie ihn überall wieder und verbindet die Besuche zu einem ' +
          'Profil. Nach dem Löschen zählt sie unter einer neuen Nummer weiter — die alten ' +
          'Zeilen bleiben trotzdem stehen.',
      },
    },
    {
      id: 'm7-wer',
      title: 'Wer weiß was?',
      brief:
        'Drei Beteiligte sehen drei ganz verschiedene Dinge. Sortier, wer was mitbekommt — ' +
        'und was selbst bei https noch sichtbar bleibt.',
      fragen: ['weiss-inhalt', 'anonym', 'schutz'],
      ziele: [
        {
          text: 'Dieselben Besuche aus allen drei Blickwinkeln angeschaut',
          rules: [sawAllViews()],
        },
        {
          text: 'Geklärt, was bei https verschlüsselt ist und was nicht',
          rules: [
            answeredTrace(
              'weiss-inhalt',
              'Beantworte die Frage zum Passwort auf einer https-Seite.',
              'In M6 hast du gesehen, welche Zeile im Paket lesbar bleiben muss.',
            ),
          ],
        },
        {
          text: 'Erklärt, warum du nicht wirklich anonym bist',
          rules: [
            answeredTrace(
              'anonym',
              'Beantworte die Frage nach der Anonymität.',
              'Keiner der Beteiligten kennt dich allein. Überleg, was passiert, wenn zwei ihr Wissen zusammenlegen.',
            ),
          ],
        },
        {
          text: 'Gesagt, was wirklich hilft',
          rules: [
            answeredTrace(
              'schutz',
              'Beantworte zum Schluss, was gegen zu viele Spuren hilft.',
              'Eine Spur kannst du selbst wegwerfen, eine andere nicht.',
            ),
          ],
        },
      ],
      hints: {
        stups: 'Blätter im Log zwischen den drei Ansichten hin und her — die Antworten stehen dort.',
        hinweis:
          'Der Seitenbetreiber sieht nur seine eigene Seite. Der Tracker sieht viele Seiten, ' +
          'aber keinen Namen. Der Provider sieht keinen Inhalt, dafür deinen Namen.',
        loesung:
          'Bei https ist nur der Inhalt verschlüsselt — dass du auf einer Seite warst, sieht ' +
          'der Provider trotzdem. Anonym bist du nicht, weil jede Seite deine IP-Adresse ' +
          'bekommt und der Provider weiß, wem sie gehört. Cookies löschen und Tracker ' +
          'blockieren hilft; die IP-Adresse bleibt.',
      },
    },
  ],
}
