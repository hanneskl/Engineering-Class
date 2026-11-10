import type { SheetLesson } from '../model/types'

/**
 * Mini-Quali Teil B — the spreadsheet half of the stocktake after the autumn
 * holidays, right after Teil A (t5). One task on the scenario `klassenfahrt`:
 * SUMME, a $-reference, WENN and conditional formatting. Its module badge
 * starts with T, which files it under Tests on the home screen, beside Teil A.
 */
export const t6MiniQuali: SheetLesson = {
  kind: 'sheet',
  id: 't6',
  module: 'T6',
  title: 'Mini-Quali Teil B',
  intro: {
    heading: 'Tabellen-Praxis',
    body: [
      'Eine Tabelle, vier Aufträge, etwa 15 Minuten.',
      'Alle Berechnungen machst du mit Formeln. Eine Zahl, die du selbst ausrechnest und eintippst, zählt nicht.',
    ],
  },
  quali:
    'SUMME, ein fester Bezug mit $, WENN und eine bedingte Formatierung — das steht so fast in jeder Quali.',
  tasks: [
    {
      id: 't6.1',
      scenarioId: 'klassenfahrt',
      hints: {
        stups: 'Die Summe zuerst – die kennst du. Beim Rest bleibt der Preis immer in derselben Zelle.',
        hinweis:
          'Dollarzeichen machen einen Bezug fest: $B$2 rutscht beim Ziehen nicht mit. WENN hat drei Teile: Bedingung; dann; sonst. Text kommt in Anführungszeichen.',
        loesung:
          'B13 =SUMME(B5:B12), nach rechts bis C13. C5 =$B$2-B5, bis C12 herunterziehen. D5 =WENN(C5>0;"offen";"bezahlt"), bis D12 herunterziehen. Bedingte Formatierung für D5:D12: Text ist gleich „offen" → Füllung hellrot.',
      },
    },
  ],
}
