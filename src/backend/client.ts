/**
 * Supabase wiring, shared by every module.
 *
 * The trainer runs perfectly well with no backend at all — that is the
 * default. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to turn on
 * progress sync, presence, the teacher dashboard, and (in
 * src/spreadsheet/backend.ts) M10's server-side grading.
 *
 * This file used to live only under src/spreadsheet/ — M10 was the only
 * module with anything server-side. Progress tracking (issue #1) needs the
 * same client from the app shell and the teacher dashboard, so it moved up
 * to where both can reach it without importing across module boundaries.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const backend: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const hasBackend = backend !== null

/**
 * There is exactly one class, so this is the only place that needs to know
 * its id — not a secret, RLS is what actually protects a class's data. Used
 * by `anonAuth.ts` (assigning a new student to it) and the teacher dashboard
 * (reading its roster).
 */
export const CLASS_ID = '20af1454-52cf-4557-b438-87948ccf5ccd'
