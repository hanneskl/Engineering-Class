import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 820 } })
const errs = []; p.on('pageerror', e => errs.push(String(e)))
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' })

const cell = a1 => {
  const c = a1.match(/^[A-Z]+/)[0].charCodeAt(0) - 65
  const r = Number(a1.match(/\d+$/)[0])
  return p.locator(`table tbody tr:nth-child(${r}) td`).nth(c)
}
const inputOf = async a1 => { await cell(a1).click(); return (await p.locator('.formula-input').inputValue()).trim() }
const fails = []
const expect = (l, a, w) => { const ok = a === w; console.log(`  ${ok?'✓':'✗'} ${l}: ${a}${ok?'':`  (erwartet ${w})`}`); if(!ok) fails.push(l) }

// work in SMV
await cell('B8').click(); await p.keyboard.type('=SUMME(B2:B6)'); await p.keyboard.press('Enter')
await p.locator('.task').nth(0).getByRole('button', { name: 'Prüfen' }).click()
await p.waitForTimeout(150)

// switch away and back
await p.locator('select').first().selectOption('felder-berechnen'); await p.waitForTimeout(150)
await cell('F9').click(); await p.keyboard.type('=SUMME(B2:E2)'); await p.keyboard.press('Enter')
await p.locator('select').first().selectOption('smv-wahl'); await p.waitForTimeout(150)

expect('SMV-Eingabe überlebt den Wechsel', await inputOf('B8'), '=SUMME(B2:B6)')
expect('SMV-Punkte überleben', (await p.locator('.score').textContent()).trim(), '2 / 13 Punkte')

await p.locator('select').first().selectOption('felder-berechnen'); await p.waitForTimeout(150)
expect('Felder-Eingabe überlebt', await inputOf('F9'), '=SUMME(B2:E2)')

// Zurücksetzen clears only this scenario
await p.getByRole('button', { name: 'Zurücksetzen' }).click(); await p.waitForTimeout(150)
expect('Zurücksetzen leert Felder', await inputOf('F9'), '')
await p.locator('select').first().selectOption('smv-wahl'); await p.waitForTimeout(150)
expect('SMV bleibt nach Felder-Reset', await inputOf('B8'), '=SUMME(B2:B6)')

console.log(errs.length ? `ERRORS: ${errs.join('\n')}` : 'no page errors')
console.log(fails.length ? `FAILED: ${fails.join(', ')}` : 'all switch checks passed')
await b.close(); process.exit(fails.length ? 1 : 0)
