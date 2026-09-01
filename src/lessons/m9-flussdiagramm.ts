import type { FlowLesson } from '../model/types'
import {
  allReachableFromStart,
  everyPathEnds,
  minSteps,
  noPlaceholderText,
  requireKind,
} from '../model/flowRules'

/**
 * M9 — Flussdiagramme.
 *
 * The Quali asks for one every year and the everyday scenarios are the point:
 * 2026 wanted "morgendliches Zähneputzen", 2022 "Spülmaschine ausräumen",
 * 2023 "Zimmer aufräumen". None of them are about computers, which is exactly
 * why they work — the difficulty is breaking a familiar routine into steps
 * precise enough for a machine.
 */
export const m9Flussdiagramm: FlowLesson = {
  kind: 'flow',
  id: 'm9',
  module: 'M9',
  title: 'Flussdiagramme',
  quali:
    'In der Quali 2026 gab es 3 Punkte für ein Flussdiagramm zum Zähneputzen, ' +
    '2022 und 2023 sogar 7 bzw. 9 Punkte. Gefragt sind immer Abläufe aus dem Alltag.',
  intro: {
    heading: 'Einen Ablauf aufzeichnen',
    body: [
      'Ein Flussdiagramm zeigt einen Ablauf Schritt für Schritt. Bevor man ein Programm ' +
        'schreibt, zeichnet man auf, was in welcher Reihenfolge passieren soll.',
      'Dafür gibt es vier Symbole: der abgerundete Start ganz oben, eckige Aktionen für ' +
        'jeden Schritt, eine Raute für jede Entscheidung, und ein abgerundetes Ende.',
      'Die Kunst ist, wirklich jeden Schritt aufzuschreiben. Was dein Gehirn automatisch ' +
        'mitmacht, muss im Diagramm ausdrücklich dastehen — sonst kann eine Maschine ' +
        'es nicht nachmachen.',
    ],
  },
  tasks: [
    {
      id: 'm9-aufstehen',
      title: 'Morgens aufstehen',
      brief:
        'Zeichne den Ablauf vom Klingeln des Weckers bis zum Verlassen des Zimmers. ' +
        'Noch ohne Entscheidung — einfach der Reihe nach.',
      ziele: [
        { text: 'Ein Start', rules: [requireKind('start', 1, true)] },
        { text: 'Mindestens vier Aktionen', rules: [minSteps(4)] },
        { text: 'Ein Ende', rules: [requireKind('end', 1)] },
        {
          text: 'Alle Symbole beschriftet und mit Pfeilen verbunden',
          rules: [noPlaceholderText, allReachableFromStart, everyPathEnds],
        },
      ],
      hints: {
        stups: 'Fang beim Start an und häng Aktion für Aktion darunter.',
        hinweis:
          'Denk an die einzelnen Handgriffe: Wecker ausmachen, Augen aufmachen, aufstehen, ' +
          'anziehen. Jeder davon ist eine eigene Aktion.',
        loesung:
          'Start → "Wecker klingelt" → "Wecker ausschalten" → "Aufstehen" → "Anziehen" → ' +
          '"Zimmer verlassen" → Ende. Mit Pfeilen von oben nach unten verbunden.',
      },
    },
    {
      id: 'm9-waesche',
      title: 'Wäsche zusammenlegen',
      brief:
        'Jetzt mit einer Entscheidung: Solange noch Wäsche im Korb liegt, nimmst du ein ' +
        'Stück heraus und legst es zusammen. Ist der Korb leer, bist du fertig.',
      ziele: [
        { text: 'Ein Start und ein Ende', rules: [requireKind('start', 1, true), requireKind('end', 1)] },
        { text: 'Mindestens eine Entscheidung', rules: [requireKind('decision', 1)] },
        { text: 'Mindestens drei Aktionen', rules: [minSteps(3)] },
        {
          text: 'Alles beschriftet, verbunden und ohne Sackgasse',
          rules: [noPlaceholderText, allReachableFromStart, everyPathEnds],
        },
      ],
      hints: {
        stups:
          'Die Entscheidung heißt sinngemäß "Ist noch Wäsche im Korb?" — und sie kommt vor dem Zusammenlegen.',
        hinweis:
          'Bei "Ja" nimmst du ein Stück, legst es zusammen und gehst mit einem Pfeil zurück ' +
          'zur Entscheidung. Bei "Nein" geht es zum Ende. Ein Pfeil darf nach oben zurückzeigen — ' +
          'genau das ist eine Schleife.',
        loesung:
          'Start → "Wäschekorb öffnen" → Entscheidung "Noch Wäsche im Korb?" → Ja: ' +
          '"Wäschestück herausnehmen" → "Zusammenlegen" → zurück zur Entscheidung. ' +
          'Nein: → Ende.',
      },
    },
    {
      id: 'm9-zaehneputzen',
      title: 'Zähneputzen',
      brief:
        'Die Aufgabe aus der Quali 2026: Zeichne ein Flussdiagramm zum morgendlichen ' +
        'Zähneputzen. Am Ende prüfst du, ob die Zähne sauber sind — wenn nicht, putzt du weiter.',
      ziele: [
        { text: 'Ein Start und ein Ende', rules: [requireKind('start', 1, true), requireKind('end', 1)] },
        { text: 'Eine Entscheidung am Schluss', rules: [requireKind('decision', 1)] },
        { text: 'Mindestens fünf Aktionen', rules: [minSteps(5)] },
        {
          text: 'Alles beschriftet, verbunden und ohne Sackgasse',
          rules: [noPlaceholderText, allReachableFromStart, everyPathEnds],
        },
      ],
      hints: {
        stups: 'Geh den Ablauf in Gedanken durch, vom Betreten des Bads bis zum sauberen Mund.',
        hinweis:
          'Zahnbürste nehmen, Zahnpasta auftragen, putzen, ausspülen, Bürste reinigen. ' +
          'Danach die Entscheidung "Fertig?" — bei Nein zurück zum Putzen.',
        loesung:
          'Start → "Ins Bad gehen" → "Zahnbürste nehmen" → "Zahnpasta auftragen" → ' +
          '"Zähne putzen" → "Mund ausspülen" → "Zahnbürste reinigen" → Entscheidung "Fertig?" → ' +
          'Nein: zurück zu "Zähne putzen". Ja: → Ende.',
      },
    },
  ],
}
