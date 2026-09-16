/**
 * manage-student — teacher-only account provisioning.
 *
 * Creating a user or resetting a password needs Supabase's Admin API, which
 * needs the service-role key — that key must never reach the browser bundle,
 * so this is the one place it's used, exactly like check-task's service-role
 * write to `attempts`. The caller is identified from their own JWT (never
 * from anything in the request body) and must actually be a teacher — the
 * same fact migration 0005's `is_teacher_of_class` encodes, checked directly
 * here since that SQL helper isn't reachable from Deno.
 */

import { createClient } from '@supabase/supabase-js'
import { emailForStudent } from '@quali/student-slug'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  // supabase-js sends `apikey` and `x-client-info` alongside `Authorization`
  // on every request (see its fetchWithAuth and FunctionsClient) — omitting
  // any of these fails the browser's CORS preflight before the request is
  // even sent, surfacing client-side as a bare network/CORS error with no
  // further detail.
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Six digits, zero-padded — never `Math.random`, this becomes a real password. */
function randomCode(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(bytes[0] % 1_000_000).padStart(6, '0')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Nur POST.' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Nicht angemeldet.' }, 401)

  const asUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  )
  const { data: auth, error: authError } = await asUser.auth.getUser()
  if (authError || !auth.user) return json({ error: 'Nicht angemeldet.' }, 401)

  const asService = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Only a real teacher may provision student accounts — anyone else,
  // including a signed-in student, gets 403.
  const { data: taughtClass } = await asService
    .from('classes')
    .select('id')
    .eq('teacher_id', auth.user.id)
    .maybeSingle()
  if (!taughtClass) return json({ error: 'Nur für Lehrkräfte.' }, 403)

  let body: { action?: string; name?: string; studentId?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Ungültige Anfrage.' }, 400)
  }

  if (body.action === 'create') {
    const name = body.name?.trim()
    if (!name) return json({ error: 'Name fehlt.' }, 400)

    const { data: existing } = await asService
      .from('students')
      .select('id')
      .eq('class_id', taughtClass.id)
      .ilike('display_name', name)
      .maybeSingle()
    if (existing) return json({ error: `"${name}" gibt es schon.` }, 409)

    const code = randomCode()
    const { data: created, error: createError } = await asService.auth.admin.createUser({
      email: emailForStudent(name),
      password: code,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'Anlegen fehlgeschlagen.' }, 500)
    }

    const { error: upsertError } = await asService.from('students').upsert({
      id: created.user.id,
      display_name: name,
      class_id: taughtClass.id,
      login_code: code,
    })
    if (upsertError) return json({ error: upsertError.message }, 500)

    return json({ studentId: created.user.id, code })
  }

  if (body.action === 'reset') {
    if (!body.studentId) return json({ error: 'studentId fehlt.' }, 400)

    // Also (re)sets the login email, not just the password — a row created
    // before this feature shipped (the old anonymous sign-in had no email at
    // all) would otherwise keep a fresh code that can never actually sign
    // in, since `signInWithPassword` looks the account up by email. Setting
    // it here every time makes a reset self-healing for exactly that case,
    // not just "forgot the code".
    const { data: student } = await asService
      .from('students')
      .select('display_name')
      .eq('id', body.studentId)
      .maybeSingle()
    if (!student?.display_name) return json({ error: 'Schüler nicht gefunden.' }, 404)

    const code = randomCode()
    const { error: updateError } = await asService.auth.admin.updateUserById(body.studentId, {
      email: emailForStudent(student.display_name),
      email_confirm: true,
      password: code,
    })
    if (updateError) return json({ error: updateError.message }, 500)

    const { error: rowError } = await asService
      .from('students')
      .update({ login_code: code })
      .eq('id', body.studentId)
    if (rowError) return json({ error: rowError.message }, 500)

    return json({ code })
  }

  return json({ error: 'Unbekannte Aktion.' }, 400)
})
