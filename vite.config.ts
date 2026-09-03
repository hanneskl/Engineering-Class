import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * `@quali/core` and `@quali/scenarios` were npm workspace packages before the
 * Excel trainer moved in here. They stay import aliases rather than becoming
 * relative paths for one reason: the Supabase edge function resolves the same
 * two names through its own Deno import map, so the checker's ~25 source files
 * read identically in the browser and on the server.
 */
const alias = {
  '@quali/core': fileURLToPath(new URL('./src/spreadsheet/core/index.ts', import.meta.url)),
  '@quali/scenarios': fileURLToPath(
    new URL('./src/spreadsheet/scenarios/index.ts', import.meta.url),
  ),
}

// The app is served from https://<user>.github.io/Engineering-Class/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/Engineering-Class/',
  resolve: { alias },
})
