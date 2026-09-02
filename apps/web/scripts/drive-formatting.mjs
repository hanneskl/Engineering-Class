/**
 * Drives the formatting ribbon against the 2025 Vermögen scenario.
 *
 *   npm run dev --workspace @quali/web
 *   npm run drive:formatting --workspace @quali/web
 */

import { chromium } from 'playwright'

const OUT = process.env.SHOT_DIR || '/tmp/quali-shots'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.locator('select').first().selectOption('vermoegen')
await page.waitForTimeout(200)

const cell = (a1) => {
  const col = a1.match(/^[A-Z]+/)[0].charCodeAt(0) - 65
  const row = Number(a1.match(/\d+$/)[0])
  return page.locator(`table tbody tr:nth-child(${row}) td`).nth(col)
}
const fails = []
const expect = (l, a, w) => {
  const ok = a === w
  console.log(`  ${ok ? '✓' : '✗'} ${l}: ${a}${ok ? '' : `  (erwartet ${w})`}`)
  if (!ok) fails.push(l)
}
const taskClass = (i) => page.locator('.task').nth(i).getAttribute('class')
/** Assert a task's state and, when it is not what we wanted, show what the student would see. */
async function expectTask(label, index, wanted) {
  const actual = await taskClass(index)
  expect(label, actual, wanted)
  if (actual !== wanted) {
    const fb = page.locator('.task').nth(index).locator('.feedback')
    if (await fb.count()) console.log(`     Rückmeldung: ${(await fb.textContent()).trim()}`)
  }
}
const check = async (i) => {
  await page.locator('.task').nth(i).getByRole('button', { name: 'Prüfen' }).click()
  await page.waitForTimeout(120)
}
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log(`  → ${n}.png`) }

/**
 * Hover the endpoints rather than moving to pre-measured coordinates: formatting changes the
 * grid's metrics, so any box read before the drag can be stale by the time we move there.
 */
async function selectRange(from, to) {
  await cell(from).hover()
  await page.mouse.down()
  await cell(to).hover()
  await page.mouse.up()
}

async function dragFillHandle(to) {
  await page.locator('.fill-handle').hover()
  await page.mouse.down()
  await cell(to).hover()
  await page.mouse.up()
}
const tool = (title) => page.locator(`.ribbon [title="${title}"]`)

console.log('\n1. Titel: verbinden, zentrieren, hellblau füllen')
await cell('B1').click()
await page.keyboard.type('Familienvermögen')
await page.keyboard.press('Enter')
await selectRange('B1', 'H1')
await tool('Verbinden und zentrieren').click()
await tool('Hellblau').click()
await check(0)
await expectTask('Aufgabe 1 (F1+F2)', 0, 'task passed')

console.log('\n2. Gesamt je Person, heruntergezogen')
await cell('G4').click()
await page.keyboard.type('=SUMME(C4:F4)')
await page.keyboard.press('Enter')
await cell('G4').click()
await dragFillHandle('G8')
await check(1)
await expectTask('Aufgabe 2 (SUMME + Ziehen)', 1, 'task passed')
expect('Hannes Gesamt', (await cell('G5').textContent()).trim(), '5.473')

console.log('\n3. Zeile 3 fett')
await selectRange('B3', 'H3')
await tool('Fett').click()
await check(2)
await expectTask('Aufgabe 3 (F3)', 2, 'task passed')

console.log('\n4. C3:H8 zentrieren')
await selectRange('C3', 'H8')
await tool('Zentriert').click()
await check(3)
await expectTask('Aufgabe 4 (F6)', 3, 'task passed')

console.log('\n5. Gesamtvermögen')
await cell('C15').click()
await page.keyboard.type('=SUMME(G4:G8)')
await page.keyboard.press('Enter')
await check(4)
await expectTask('Aufgabe 5', 4, 'task passed')
expect('Gesamtvermögen', (await cell('C15').textContent()).trim(), '7.785')

console.log('\n6. Prozentanteil mit Prozentformat')
await cell('H4').click()
await page.keyboard.type('=G4/$C$15')
await page.keyboard.press('Enter')
await cell('H4').click()
await dragFillHandle('H8')

// still unformatted → the number-format check must fail
await check(5)
await expectTask('Aufgabe 6 ohne Prozentformat', 5, 'task failed')
const msg = (await page.locator('.task').nth(5).locator('.feedback').textContent()).trim()
console.log(`     Rückmeldung: ${msg}`)

await selectRange('H4', 'H8')
await page.locator('.ribbon select').selectOption('percent:1')
await check(5)
await expectTask('Aufgabe 6 mit Prozentformat', 5, 'task passed')
expect('Anteil Hannes', (await cell('H5').textContent()).trim(), '70,3 %')
expect('Punktestand', (await page.locator('.score').textContent()).trim(), '13 / 13 Punkte')
await shot('20-vermoegen-formatted')

console.log(errors.length ? `\nERRORS:\n${errors.join('\n')}` : '\nno console errors')
console.log(fails.length ? `\nFAILED: ${fails.join(', ')}` : '\nall formatting checks passed')
await browser.close()
process.exit(fails.length ? 1 : 0)
