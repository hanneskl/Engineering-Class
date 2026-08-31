/**
 * Drives the three spreadsheet gestures: drag-to-fill, copy/paste, and click-to-add-reference.
 *
 *   npm run dev --workspace @quali/web        # in one terminal
 *   npm run drive:gestures --workspace @quali/web
 */

import { chromium } from 'playwright'

const OUT = process.env.SHOT_DIR || '/tmp/quali-shots'

const browser = await chromium.launch({
  // Set CHROMIUM_PATH when the sandbox ships a browser build Playwright did not download.
  executablePath: process.env.CHROMIUM_PATH || undefined,
})
const context = await browser.newContext({
  viewport: { width: 1280, height: 820 },
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()

const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })

const cell = (a1) => {
  const col = a1.match(/^[A-Z]+/)[0].charCodeAt(0) - 65
  const row = Number(a1.match(/\d+$/)[0])
  return page.locator(`table tbody tr:nth-child(${row}) td`).nth(col)
}

async function typeInto(a1, text) {
  await cell(a1).click()
  await page.keyboard.type(text)
  await page.keyboard.press('Enter')
}

async function centre(locator) {
  const box = await locator.boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function inputOf(a1) {
  await cell(a1).click()
  return (await page.locator('.formula-input').inputValue()).trim()
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(`  → ${name}.png`)
}

const failures = []
function expect(label, actual, wanted) {
  const ok = actual === wanted
  console.log(`  ${ok ? '✓' : '✗'} ${label}: ${actual}${ok ? '' : `  (erwartet ${wanted})`}`)
  if (!ok) failures.push(label)
}

/* ---------------------------------------------------------------- 1. fill */
console.log('\n1. drag-to-fill')
await typeInto('B8', '=SUMME(B2:B6)')
await typeInto('C2', '=B2/$B$8')

await cell('C2').click()
const handle = page.locator('.fill-handle')
const from = await centre(handle)
const to = await centre(cell('C6'))
await page.mouse.move(from.x, from.y)
await page.mouse.down()
await page.mouse.move(to.x, to.y, { steps: 12 })
await shot('10-fill-preview')
await page.mouse.up()

expect('C3 nach dem Ziehen', await inputOf('C3'), '=B3/$B$8')
expect('C6 nach dem Ziehen', await inputOf('C6'), '=B6/$B$8')

await page.locator('.task').nth(1).getByRole('button', { name: 'Prüfen' }).click()
await page.waitForTimeout(150)
expect(
  'Aufgabe 2 bestanden',
  await page.locator('.task').nth(1).getAttribute('class'),
  'task passed',
)
await shot('11-filled-and-passed')

/* --------------------------------------------------------- 2. copy/paste */
console.log('\n2. copy and paste')
await page.getByRole('button', { name: 'Zurücksetzen' }).click()
await typeInto('B8', '=SUMME(B2:B6)')
await typeInto('C2', '=B2/$B$8')

await cell('C2').click()
await page.keyboard.press('Control+c')
await shot('12-copied')

// Select C3:C6 by dragging, then paste into it.
const c3 = await centre(cell('C3'))
const c6 = await centre(cell('C6'))
await page.mouse.move(c3.x, c3.y)
await page.mouse.down()
await page.mouse.move(c6.x, c6.y, { steps: 8 })
await page.mouse.up()
await page.keyboard.press('Control+v')
await page.waitForTimeout(150)

expect('C3 nach dem Einfügen', await inputOf('C3'), '=B3/$B$8')
expect('C6 nach dem Einfügen', await inputOf('C6'), '=B6/$B$8')
await shot('13-pasted')

/* ----------------------------------------------- 3. click to add a reference */
console.log('\n3. click to add a reference')
await page.getByRole('button', { name: 'Zurücksetzen' }).click()

await cell('B8').click()
await page.keyboard.type('=SUMME(')
// Point at B2, then drag to B6 — the inserted reference should become a range.
const b2 = await centre(cell('B2'))
const b6 = await centre(cell('B6'))
await page.mouse.move(b2.x, b2.y)
await page.mouse.down()
await shot('14-pointing-single')
await page.mouse.move(b6.x, b6.y, { steps: 8 })
await shot('15-pointing-range')
await page.mouse.up()
await page.keyboard.type(')')
await page.keyboard.press('Enter')

expect('B8 per Klick zusammengesetzt', await inputOf('B8'), '=SUMME(B2:B6)')
expect(
  'B8 Ergebnis',
  (await cell('B8').textContent()).trim(),
  '220',
)
await shot('16-reference-inserted')

console.log(errors.length ? `\nCONSOLE ERRORS:\n${errors.join('\n')}` : '\nno console errors')
console.log(failures.length ? `\nFAILED: ${failures.join(', ')}` : '\nall gesture checks passed')
await browser.close()
process.exit(failures.length ? 1 : 0)
