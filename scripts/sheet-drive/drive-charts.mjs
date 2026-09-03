/**
 * Drives chart insertion against the 2026 SMV-Wahl pie-chart task.
 *
 *   npm run dev --workspace @quali/web
 *   npm run drive:charts --workspace @quali/web
 */

import { chromium } from 'playwright'

const OUT = process.env.SHOT_DIR || '/tmp/quali-shots'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })

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
const TASK = 3 // the chart task on SMV-Wahl
async function check() {
  await page.locator('.task').nth(TASK).getByRole('button', { name: 'Prüfen' }).click()
  await page.waitForTimeout(150)
}
async function state() {
  const cls = await page.locator('.task').nth(TASK).getAttribute('class')
  const fb = page.locator('.task').nth(TASK).locator('.feedback')
  return { cls, message: (await fb.count()) ? (await fb.textContent()).trim() : '' }
}
async function selectRange(from, to) {
  await cell(from).hover(); await page.mouse.down()
  await cell(to).hover(); await page.mouse.up()
}

console.log('\n1. no chart yet')
await check()
expect('ohne Diagramm', (await state()).cls, 'task failed')
console.log(`     Rückmeldung: ${(await state()).message}`)

console.log('\n2. the wrong chart type')
await selectRange('A2', 'B6')
await page.locator('.ribbon [title="Diagrammtyp wählen"]').click()
await page.locator('.menu-item', { hasText: 'Säulendiagramm' }).click()
await page.waitForTimeout(200)
await check()
expect('falscher Diagrammtyp', (await state()).cls, 'task failed')
console.log(`     Rückmeldung: ${(await state()).message}`)
await page.locator('.chart-card .drop').first().click()

console.log('\n3. pie chart on the wrong range')
await selectRange('B2', 'B6')
await page.locator('.ribbon [title="Diagrammtyp wählen"]').click()
await page.locator('.menu-item', { hasText: 'Kreisdiagramm' }).click()
await page.waitForTimeout(200)
await check()
expect('falscher Datenbereich', (await state()).cls, 'task failed')
console.log(`     Rückmeldung: ${(await state()).message}`)
await page.locator('.chart-card .drop').first().click()

console.log('\n4. right chart, right range, no title yet')
await selectRange('A2', 'B6')
await page.locator('.ribbon [title="Diagrammtyp wählen"]').click()
await page.locator('.menu-item', { hasText: 'Kreisdiagramm' }).click()
await page.waitForTimeout(200)
await check()
expect('ohne Titel', (await state()).cls, 'task failed')
console.log(`     Rückmeldung: ${(await state()).message}`)

console.log('\n5. with the title')
await page.locator('.chart-card input').first().fill('Stimmenverteilung SMV-Wahl')
await page.waitForTimeout(200)
await check()
expect('vollständig', (await state()).cls, 'task passed')
await page.screenshot({ path: `${OUT}/40-chart.png` })
console.log(`  → 40-chart.png`)

console.log('\n6. the other chart types render')
for (const kind of ['Balkendiagramm', 'Liniendiagramm', 'Flächendiagramm']) {
  await selectRange('A2', 'B6')
  await page.locator('.ribbon [title="Diagrammtyp wählen"]').click()
  await page.locator('.menu-item', { hasText: kind }).click()
  await page.waitForTimeout(150)
}
expect('vier Diagramme', String(await page.locator('.chart-card').count()), '4')
await page.screenshot({ path: `${OUT}/41-chart-kinds.png` })
console.log(`  → 41-chart-kinds.png`)

console.log(errors.length ? `\nERRORS:\n${errors.join('\n')}` : '\nno console errors')
console.log(fails.length ? `\nFAILED: ${fails.join(', ')}` : '\nall chart checks passed')
await browser.close()
process.exit(fails.length ? 1 : 0)
