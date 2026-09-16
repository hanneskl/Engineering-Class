-- Replaces anonymous sign-in with real per-student accounts: a name plus a
-- teacher-issued 6-digit code, so a student's identity survives a different
-- browser or a different laptop — not just whichever one first typed their
-- name. See src/backend/studentAuth.ts and supabase/functions/manage-student.
--
-- Purely additive: the existing students_update_own / students_read_self /
-- students_read_as_teacher policies already cover whole rows, so these new
-- columns need no new RLS of their own.

alter table students add column if not exists login_code text;
alter table students add column if not exists progress_snapshot jsonb;
alter table students add column if not exists progress_updated_at timestamptz;

comment on column students.login_code is
  'Plaintext mirror of the student''s current Supabase Auth password, for the '
  'teacher dashboard''s own convenience (so a forgotten code can just be looked '
  'up again) — does not itself gate sign-in, Supabase Auth''s password store '
  'does. Low-stakes by design, same trust model as task_progress.';

comment on column students.progress_snapshot is
  'The student''s whole local Progress object (src/progress/store.ts), pushed '
  'on a debounce by src/progress/sync.ts''s pushProgressSnapshot. Lets a '
  'student who signs in on a different device pick up exactly where they left '
  'off — task_progress alone only carries the solved/attempts/hints summary.';
