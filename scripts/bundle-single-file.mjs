/**
 * Inlines the Vite build into a single HTML fragment.
 *
 * Used to publish a preview of the app somewhere that serves one file and no
 * assets. Emits no <html>/<head>/<body> wrapper — the host supplies those.
 *
 *   npm run build && node scripts/bundle-single-file.mjs <out.html>
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const out = process.argv[2] ?? 'dist/single.html'

const assets = readdirSync(join(dist, 'assets'))
const jsFile = assets.find((f) => f.endsWith('.js'))
const cssFile = assets.find((f) => f.endsWith('.css'))
if (!jsFile || !cssFile) throw new Error('build assets not found — run npm run build first')

const css = readFileSync(join(dist, 'assets', cssFile), 'utf8')
const js = readFileSync(join(dist, 'assets', jsFile), 'utf8')

// A literal </script> anywhere in the bundle (a string, a regex) would close
// the tag early. Breaking the sequence is safe inside JS source.
const safeJs = js.replace(/<\/script>/gi, '<\\/script>')

const html = `<title>Informatik-Trainer</title>
<style>
${css}
</style>

<div id="root"></div>

<script type="module">
${safeJs}
</script>
`

writeFileSync(out, html)
console.log(`${out} — ${(html.length / 1024).toFixed(1)} kB`)
