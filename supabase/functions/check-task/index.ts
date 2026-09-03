/**
 * check-task — the authoritative scorer.
 *
 * The client posts what the student typed; this function re-seeds the scenario, grades the
 * submission with the same @quali/core checker the browser uses, and writes the result. RLS
 * denies every client write to `attempts`, so this service-role path is the only way a score
 * is recorded — a student cannot POST `{ passed: true }`.
 */

import { createClient } from '@supabase/supabase-js'
import { gradeSubmission } from '@quali/scenarios'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Nur POST.' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Nicht angemeldet.' }, 401)

  // Identify the caller from their own JWT — never from anything in the request body.
  const asUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  )
  const { data: auth, error: authError } = await asUser.auth.getUser()
  if (authError || !auth.user) return json({ error: 'Nicht angemeldet.' }, 401)

  let submission: { scenarioId?: string; taskId?: string; inputs?: Record<string, string> }
  try {
    submission = await request.json()
  } catch {
    return json({ error: 'Ungültige Anfrage.' }, 400)
  }
  if (!submission.scenarioId || !submission.taskId || typeof submission.inputs !== 'object') {
    return json({ error: 'scenarioId, taskId und inputs sind erforderlich.' }, 400)
  }

  let grade
  try {
    grade = gradeSubmission({
      scenarioId: submission.scenarioId,
      taskId: submission.taskId,
      inputs: submission.inputs ?? {},
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unbekannte Aufgabe.' }, 400)
  }

  // Service role bypasses RLS; this is the only writer of `attempts`.
  const asService = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { error: insertError } = await asService.from('attempts').insert({
    student_id: auth.user.id,
    scenario_id: submission.scenarioId,
    task_id: submission.taskId,
    inputs: submission.inputs,
    passed: grade.passed,
    points: grade.points,
    skills: grade.skills,
  })
  if (insertError) return json({ error: insertError.message }, 500)

  return json(grade)
})
