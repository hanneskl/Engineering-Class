/// <reference types="vite/client" />

/**
 * Vite's own types cover import.meta.env; these two are ours. They stay
 * optional because the trainer runs with no backend by default — see
 * src/spreadsheet/backend.ts.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
