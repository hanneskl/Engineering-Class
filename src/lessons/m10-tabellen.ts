import type { SheetLesson } from '../model/types'

/**
 * M10 — Tabellenkalkulation.
 *
 * The Quali is 90 points: Theorie 30 / Datenverarbeitung 30 / Programmieren 30.
 * M1–M9 cover the networking half of Theorie. This module is the whole
 * Datenverarbeitung part, and it is worth as much as all of them together.
 *
 * The tasks here are thin on purpose: the exam papers already live as data in
 * `src/spreadsheet/scenarios`, complete with their German prompts, answer keys
 * and checks. A task only names the scenario it opens and supplies the hint
 * ladder, which is the one thing the scenario data does not carry.
 */
export const m10Tabellen: SheetLesson = {
  id: 'm10-tabellen',
  module: 'M10',
  kind: 'sheet',
  title: 'Tabellenkalkulation',
  intro: {
    heading: 'Rechnen lassen statt selbst rechnen',
    body: [
      'Auf jedem Quali-Blatt steht derselbe Satz: „Alle Berechnungen sind mit Formeln durchzuführen!" Das ist keine Nebenbemerkung, sondern die Aufgabe. Eine richtige Zahl, die du selbst ausgerechnet und eingetippt hast, gibt null Punkte.',
      'Eine Formel beginnt immer mit einem Gleichheitszeichen. Danach schreibst du, woher die Zahlen kommen sollen — nicht die Zahlen selbst. =SUMME(C4:F4) heißt: addiere alles von C4 bis F4. Ändert sich später eine der Zahlen, rechnet die Tabelle von selbst neu.',
      'Achte auf die deutsche Schreibweise: Argumente werden mit Semikolon getrennt (=RUNDEN(A1;2)), Dezimalstellen mit Komma. SUM statt SUMME wird nicht erkannt — die Prüfung ist auf Deutsch.',
    ],
  },
  quali:
    'Datenverarbeitung ist ein volles Drittel der Prüfung, 30 von 90 Punkten. Geprüft werden fast jedes Jahr dieselben Dinge: SUMME, MITTELWERT, MAX, MIN, WENN, absolute Bezüge mit $, Prozent- und Währungsformat, Zellen verbinden, und ein Säulen- oder Kreisdiagramm.',
  tasks: [
    {
      id: 't10.1',
      scenarioId: 'felder-berechnen',
      hints: {
        stups: 'Fang mit dem Gleichheitszeichen an. Danach klickst du die Zellen an, statt ihre Zahlen abzuschreiben.',
        hinweis:
          'Für „mal" nimmst du *, für „geteilt durch" /. Ein Klick auf eine Zelle setzt ihren Bezug in die Formel ein, während du sie schreibst.',
        loesung:
          'Beispiel: Steht der erste Wert in C6 und der zweite in E6, dann ist das Produkt =C6*E6. Kein Zwischenergebnis eintippen — die Tabelle rechnet.',
      },
    },
    {
      id: 't10.2',
      scenarioId: 'smv-wahl',
      hints: {
        stups: 'Die Gesamtzahl steht in B8 — nur an dieser einen Stelle. Jede Prozentformel braucht sie.',
        hinweis:
          'Wenn du eine Formel herunterziehst, wandern ihre Bezüge mit. Der Bezug auf B8 darf das nicht, sonst rechnet Zeile 3 plötzlich durch B9. Mit Dollarzeichen frierst du ihn ein: $B$8. WENN braucht drei Angaben, durch Semikolon getrennt: Bedingung, Text wenn wahr, Text wenn falsch.',
        loesung:
          'Gesamt =SUMME(B2:B6). Anteil =B2/$B$8, dann bis C6 herunterziehen. Ergebnis =WENN(B2>50;"Gewählt";"Nicht gewählt"), ebenfalls herunterziehen. Für das Kreisdiagramm markierst du A2:B6.',
      },
    },
    {
      id: 't10.3',
      scenarioId: 'vermoegen',
      hints: {
        stups: 'Zellen verbinden und zentrieren ist ein Knopf im Menüband — markiere vorher den ganzen Bereich B1 bis H1.',
        hinweis:
          'Die Summe einer Zeile ist =SUMME(erste:letzte). Für das Gesamtvermögen addierst du die fertigen Zeilensummen in Spalte G, nicht noch einmal alle Einzelwerte. Beim Anteil muss der Bezug auf die Gesamtsumme absolut sein, sonst stimmt nur die erste Zeile.',
        loesung:
          'Pro Person =SUMME(C4:F4) in G4, dann bis G8 herunterziehen. Gesamtvermögen in C15: =SUMME(G4:G8). Anteil in H4: =G4/$C$15, herunterziehen und als Prozent mit einer Nachkommastelle formatieren.',
      },
    },
    {
      id: 't10.4',
      scenarioId: 'klima',
      hints: {
        stups: 'Den Blattnamen änderst du mit einem Doppelklick auf den Reiter unter der Tabelle. Achte darauf, in welcher Zeile Niederschlag und in welcher Temperatur steht.',
        hinweis:
          'MITTELWERT, MAX und MIN funktionieren wie SUMME: Funktionsname, Klammer, Bereich. Der Niederschlag steht in Zeile 3, die Temperatur in Zeile 4 — jeweils von Spalte B bis M. Die bedingte Formatierung findest du im Menüband; markiere vorher den Bereich, für den die Regel gelten soll.',
        loesung:
          'Niederschlag gesamt =SUMME(B3:M3), Durchschnittstemperatur =MITTELWERT(B4:M4), höchste Temperatur =MAX(B4:M4), geringster Niederschlag =MIN(B3:M3). Die beiden Farbregeln legst du für B4:M4 an: kleiner als 5 blau, größer als 15 rot.',
      },
    },
  ],
}
