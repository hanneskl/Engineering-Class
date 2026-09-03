/**
 * Smoke test at the package boundary: play a student working the 2026 SMV-Wahl tasks.
 *
 *   node --experimental-transform-types scripts/smoke.ts
 */

import {
  Sheet,
  filledDown,
  hasAbsoluteRef,
  isFormula,
  matchesSolution,
  runChecks,
  toText,
  usesFunction,
  type Check,
} from '../src/spreadsheet/core/index.ts'

const sheet = new Sheet('SMV Wahl')
sheet.load({
  A1: 'Lukas', B1: 45,
  A2: 'Mia', B2: 58,
  A3: 'Ben', B3: 32,
  A4: 'Sina', B4: 65,
  A5: 'Noah', B5: 20,
})

function heading(text: string): void {
  console.log(`\n\x1b[1m${text}\x1b[0m`)
}

/** One student attempt: type something, run the checks, print what they would see. */
function attempt(target: string, input: string, checks: Check[], solution?: string): void {
  sheet.setInput(target, input)
  const outcome = runChecks(checks, { sheet, target, solution })
  const mark = outcome.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
  console.log(`  ${mark} ${target} = ${input.padEnd(34)} → ${toText(sheet.getValue(target))}`)
  if (!outcome.passed) console.log(`      \x1b[33m${outcome.messages[0]}\x1b[0m`)
}

heading('Blatt „SMV Wahl" — Ausgangsdaten')
for (let row = 1; row <= 5; row++) {
  console.log(`  A${row}: ${toText(sheet.getValue(`A${row}`)).padEnd(8)} B${row}: ${toText(sheet.getValue(`B${row}`))}`)
}

heading('Aufgabe 1 — „Trage in Zelle B8 die Summe der Stimmen ein."')
const task1 = [isFormula(), usesFunction('SUMME'), matchesSolution()]
attempt('B8', '220', task1, '=SUMME(B1:B5)')
attempt('B8', '=B1+B2+B3+B4+B5', task1, '=SUMME(B1:B5)')
attempt('B8', '=SUM(B1:B5)', task1, '=SUMME(B1:B5)')
attempt('B8', '=SUMME(B1:B5)', task1, '=SUMME(B1:B5)')

heading('Aufgabe 2 — „Prozentualer Anteil. Absoluter Bezug auf $B$8 ist Pflicht."')
const task2 = [isFormula(), hasAbsoluteRef('B8'), matchesSolution()]
attempt('C1', '=B1/B8', task2, '=B1/$B$8')
attempt('C1', '=B1/$B$8', task2, '=B1/$B$8')

heading('Aufgabe 2 — heruntergezogen (C1:C5)')
console.log('  Zuerst: Ergebnisse eingetippt statt gezogen')
sheet.setInput('C2', '0,2636')
sheet.setInput('C3', '0,1455')
sheet.setInput('C4', '0,2955')
sheet.setInput('C5', '0,0909')
let outcome = runChecks([filledDown('C1:C5', '=B1/$B$8')], { sheet, target: 'C1' })
console.log(`  \x1b[31m✗\x1b[0m ${outcome.messages[0]}`)

console.log('\n  Dann: Formel korrekt heruntergezogen')
for (let row = 1; row <= 5; row++) sheet.setInput(`C${row}`, `=B${row}/$B$8`)
outcome = runChecks([filledDown('C1:C5', '=B1/$B$8')], { sheet, target: 'C1' })
console.log(`  \x1b[32m✓\x1b[0m alle Zellen tragen die richtige Formel`)
const percentages = [1, 2, 3, 4, 5]
  .map((row) => (Number(sheet.getValue(`C${row}`)) * 100).toFixed(2).replace('.', ',') + ' %')
  .join('  ')
console.log(`      ${percentages}`)
console.log('      Musterlösung:  20,45 %  26,36 %  14,55 %  29,55 %  9,09 %')

heading('Aufgabe 3 — „WENN mehr als 50 Stimmen: »Gewählt«, sonst »Nicht gewählt«"')
const task3 = [isFormula(), usesFunction('WENN'), matchesSolution()]
attempt('D1', 'Nicht gewählt', task3, '=WENN(B1>50;"Gewählt";"Nicht gewählt")')
attempt('D1', '=WENN(B1>50;"Gewählt";"Nicht gewählt")', task3, '=WENN(B1>50;"Gewählt";"Nicht gewählt")')

for (let row = 2; row <= 5; row++) {
  sheet.setInput(`D${row}`, `=WENN(B${row}>50;"Gewählt";"Nicht gewählt")`)
}
console.log('\n  Ergebnis der Wahl:')
for (let row = 1; row <= 5; row++) {
  console.log(`      ${toText(sheet.getValue(`A${row}`)).padEnd(8)} ${String(sheet.getValue(`B${row}`)).padStart(3)}  ${toText(sheet.getValue(`D${row}`))}`)
}

console.log('\n\x1b[32mSmoke test durchgelaufen.\x1b[0m\n')
