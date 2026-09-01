/**
 * Exam scenarios as data.
 *
 * A scenario seeds a sheet and lists its tasks. Both the browser (instant feedback) and, later,
 * the Supabase Edge Function (authoritative scoring) read the same definitions from here.
 */

import {
  Sheet,
  filledDown,
  hasAbsoluteRef,
  isFormula,
  matchesSolution,
  usesFunction,
  usesOperator,
  type Check,
} from '@quali/core'

export interface TaskDef {
  readonly id: string
  /** Skill IDs from the README catalogue — what the teacher dashboard groups by. */
  readonly skills: readonly string[]
  readonly promptDe: string
  /** Cell the student must fill. For fill-down tasks, the anchor of the range. */
  readonly target: string
  /** The answer key, as a formula. Never a stored number. */
  readonly solution?: string
  readonly checks: readonly Check[]
  readonly points: number
}

export interface Scenario {
  readonly id: string
  readonly titleDe: string
  readonly subtitleDe: string
  /** Columns and rows the grid should render. */
  readonly columns: number
  readonly rows: number
  readonly seed: () => Sheet
  readonly tasks: readonly TaskDef[]
}

/* -------------------------------------------------------------------------- */
/* SMV Wahl — Quali 2026, Prüfungsteil B, Blatt 3                              */
/* Real data and real solution formulas; the Musterlösung percentages are      */
/* 20,45 / 26,36 / 14,55 / 29,55 / 9,09 %.                                     */
/* -------------------------------------------------------------------------- */

const smvWahl: Scenario = {
  id: 'smv-wahl',
  titleDe: 'SMV-Wahl',
  subtitleDe: 'Quali 2026 · Datenverarbeitung · Blatt 3',
  columns: 5,
  rows: 10,
  seed() {
    const sheet = new Sheet('SMV Wahl')
    sheet.load({
      A1: 'Kandidat', B1: 'Stimmen', C1: 'Anteil', D1: 'Ergebnis',
      A2: 'Lukas', B2: 45,
      A3: 'Mia', B3: 58,
      A4: 'Ben', B4: 32,
      A5: 'Sina', B5: 65,
      A6: 'Noah', B6: 20,
      A8: 'Gesamt',
    })
    for (const a1 of ['A1', 'B1', 'C1', 'D1', 'A8']) sheet.setStyle(a1, { bold: true })
    for (let row = 2; row <= 6; row++) {
      sheet.setStyle(`C${row}`, { numberFormat: { kind: 'percent', decimals: 2 } })
    }
    return sheet
  },
  tasks: [
    {
      id: 'smv-gesamt',
      skills: ['N1'],
      promptDe: 'Trage in Zelle B8 die Gesamtzahl der abgegebenen Stimmen ein. Verwende die Funktion SUMME.',
      target: 'B8',
      solution: '=SUMME(B2:B6)',
      checks: [isFormula(), usesFunction('SUMME'), matchesSolution()],
      points: 2,
    },
    {
      id: 'smv-anteil',
      skills: ['C5', 'C7', 'F13'],
      promptDe:
        'Berechne in C2 den prozentualen Anteil von Lukas an allen Stimmen und ziehe die Formel bis C6 herunter. ' +
        'Der Bezug auf die Gesamtzahl muss absolut sein.',
      target: 'C2',
      solution: '=B2/$B$8',
      checks: [
        isFormula(),
        hasAbsoluteRef('B8'),
        matchesSolution(),
        filledDown('C2:C6', '=B2/$B$8'),
      ],
      points: 4,
    },
    {
      id: 'smv-gewaehlt',
      skills: ['N6'],
      promptDe:
        'Zeige in D2 mit der Funktion WENN an, ob der Kandidat gewählt ist: mehr als 50 Stimmen ergibt ' +
        '„Gewählt", sonst „Nicht gewählt". Ziehe die Formel bis D6 herunter.',
      target: 'D2',
      solution: '=WENN(B2>50;"Gewählt";"Nicht gewählt")',
      checks: [
        isFormula(),
        usesFunction('WENN'),
        matchesSolution(),
        filledDown('D2:D6', '=WENN(B2>50;"Gewählt";"Nicht gewählt")'),
      ],
      points: 3,
    },
  ],
}

/* -------------------------------------------------------------------------- */
/* Felder berechnen — the task that appears in six of the seven exam years     */
/*                                                                             */
/* The numbers are the 2025 grid. The original colour groupings are not        */
/* recoverable from the exported text, so the groups below are our own; the    */
/* expected answers come from the solution formulas rather than the paper.     */
/* The yellow pair is chosen to reproduce the Musterlösung's quotient of 28.   */
/* -------------------------------------------------------------------------- */

export const FIELD_COLOURS = {
  green: '#d9ead3',
  violet: '#d9d2e9',
  red: '#f4cccc',
  yellow: '#fff2cc',
} as const

const GREEN = ['B2', 'C2', 'D2', 'E2']
const VIOLET = ['B7', 'C7', 'D7', 'E7']
const RED = ['B4', 'E4']
const YELLOW = ['E6', 'D3']

const felderBerechnen: Scenario = {
  id: 'felder-berechnen',
  titleDe: 'Felder berechnen',
  subtitleDe: 'Kommt in sechs von sieben Quali-Jahrgängen vor',
  columns: 6,
  rows: 12,
  seed() {
    const sheet = new Sheet('Felder berechnen')
    sheet.load({
      A1: 'Berechne gleichfarbige Felder!',
      B2: 48, C2: 995, D2: 88, E2: 45,
      B3: 179, C3: 18, D3: 37, E3: 37,
      B4: 2, C4: 408, D4: 793, E4: 44,
      B5: 96, C5: 722, D5: 65, E5: 459,
      B6: 86, C6: 770, D6: 756, E6: 1036,
      B7: 333, C7: 86, D7: 511, E7: 71,
      A9: 'Summe grüne Felder:',
      A10: 'Summe violette Felder:',
      A11: 'Produkt rote Felder:',
      A12: 'Quotient gelbe Felder:',
    })
    sheet.setStyle('A1', { bold: true })
    for (const a1 of GREEN) sheet.setStyle(a1, { fill: FIELD_COLOURS.green })
    for (const a1 of VIOLET) sheet.setStyle(a1, { fill: FIELD_COLOURS.violet })
    for (const a1 of RED) sheet.setStyle(a1, { fill: FIELD_COLOURS.red })
    for (const a1 of YELLOW) sheet.setStyle(a1, { fill: FIELD_COLOURS.yellow })
    sheet.setStyle('F9', { fill: FIELD_COLOURS.green })
    sheet.setStyle('F10', { fill: FIELD_COLOURS.violet })
    sheet.setStyle('F11', { fill: FIELD_COLOURS.red })
    sheet.setStyle('F12', { fill: FIELD_COLOURS.yellow })
    return sheet
  },
  tasks: [
    {
      id: 'felder-gruen',
      skills: ['N1'],
      promptDe: 'Berechne in F9 die Summe der grünen Felder.',
      target: 'F9',
      solution: '=SUMME(B2:E2)',
      checks: [isFormula(), usesFunction('SUMME'), matchesSolution()],
      points: 2,
    },
    {
      id: 'felder-violett',
      skills: ['N1'],
      promptDe: 'Berechne in F10 die Summe der violetten Felder.',
      target: 'F10',
      solution: '=SUMME(B7:E7)',
      checks: [isFormula(), usesFunction('SUMME'), matchesSolution()],
      points: 2,
    },
    {
      id: 'felder-rot',
      skills: ['N10'],
      promptDe: 'Berechne in F11 das Produkt der roten Felder.',
      target: 'F11',
      solution: '=B4*E4',
      checks: [isFormula(), usesOperator('*'), matchesSolution()],
      points: 1,
    },
    {
      id: 'felder-gelb',
      skills: ['N11'],
      promptDe: 'Berechne in F12 den Quotienten der gelben Felder — größere Zahl zuerst.',
      target: 'F12',
      solution: '=E6/D3',
      checks: [isFormula(), usesOperator('/'), matchesSolution()],
      points: 1,
    },
  ],
}

export const SCENARIOS: readonly Scenario[] = [smvWahl, felderBerechnen]

export function scenarioById(id: string): Scenario {
  const found = SCENARIOS.find((scenario) => scenario.id === id)
  if (!found) throw new Error(`Unbekanntes Szenario „${id}".`)
  return found
}

export function totalPoints(scenario: Scenario): number {
  return scenario.tasks.reduce((sum, task) => sum + task.points, 0)
}

export * from './grade.ts'
