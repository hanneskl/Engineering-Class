/**
 * Turns a student's display name into the synthesised login address Supabase
 * Auth actually needs (it's email-shaped; students have no real one). `.invalid`
 * is the RFC 2606 TLD reserved for exactly this — guaranteed to never resolve
 * or receive mail, unlike making one up under a real domain.
 *
 * Shared by the client (src/backend/studentAuth.ts, computing the address to
 * sign in with) and the Edge Function (supabase/functions/manage-student,
 * computing the address to create) via that function's deno.json import
 * map — both must agree on the exact same slug for a name, or a student's
 * own code would sign into an address nothing was ever created under.
 *
 * The teacher is responsible for giving students distinct display names —
 * two "Lukas"es would collide here into the same login address. The
 * create action in manage-student refuses an exact duplicate rather than
 * silently overwriting one student's account with another's.
 */
export function emailForStudent(displayName: string): string {
  const slug = displayName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (ä→a, é→e, …)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'schueler'}@students.quali-trainer.invalid`
}
