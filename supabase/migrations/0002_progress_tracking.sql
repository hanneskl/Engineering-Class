-- Progress tracking + teacher dashboard, across all ten modules.
--
-- 0001_init.sql is M10-only: nickname+password accounts, and an append-only
-- `attempts` table only a service-role edge function may write, because a
-- spreadsheet grade must not be forgeable by the client. This migration is
-- for a different, weaker guarantee on purpose — see the trust-model note on
-- `task_progress` below — because M1-M9 have no server-side re-grading to
-- lean on, and the actual ask (issue #1) is visibility, not anti-cheat.
-- ARCHITECTURE.md §6 already treats this cohort as too small to need one.

-- Nickname-login is gone (Login.tsx was deleted; students now arrive via
-- anonymous auth, keyed by whatever name they typed at NameGate). No login
-- ever looks a student up BY this column any more, so it stops being an
-- identifier and just becomes a label — and a class of 6-8 can easily
-- produce two students with the same first name, so uniqueness must go.
alter table students rename column nickname to display_name;
alter table students drop constraint if exists students_nickname_key;
alter table students alter column display_name drop not null;

-- One row per (student, task), covering every module. M10 keeps grading
-- through its own `attempts` table above; this is the plain "where are they
-- now" table the dashboard reads for the other nine.
create table if not exists task_progress (
  student_id  uuid not null references students (id) on delete cascade,
  -- The module badge already shown in the UI, e.g. 'M2', 'M7' — lets the
  -- dashboard group by module without parsing task_id prefixes.
  lesson_id   text not null,
  -- Already globally unique across every module's task list; see
  -- src/progress/store.ts's `Progress.tasks`, which this table mirrors.
  task_id     text not null,
  solved      boolean not null default false,
  attempts    integer not null default 0,
  hints_used  integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (student_id, task_id)
);
create index if not exists task_progress_lesson_idx on task_progress (lesson_id);

alter table task_progress enable row level security;

-- Deliberately client-writable, unlike `attempts`: for M1-M9 the browser's
-- own verdict IS the verdict, so a student may write only their own row.
create policy task_progress_write_own on task_progress
  for insert with check (student_id = auth.uid());
create policy task_progress_update_own on task_progress
  for update using (student_id = auth.uid());
create policy task_progress_read_own on task_progress
  for select using (student_id = auth.uid());

-- A teacher reads every row from students in their own class(es) — same
-- join shape as `attempts_read_as_teacher` in 0001_init.sql.
create policy task_progress_read_as_teacher on task_progress
  for select using (
    exists (
      select 1
      from students s
      join classes c on c.id = s.class_id
      where s.id = task_progress.student_id and c.teacher_id = auth.uid()
    )
  );

-- The dashboard subscribes to both tables over Realtime so a finished task
-- appears live without a refresh. "Currently working on" is deliberately NOT
-- a table (no heartbeat/staleness column to maintain here) — it is a
-- Realtime Presence channel, which drops an entry the instant a socket
-- disconnects; see src/progress/presence.ts.
alter publication supabase_realtime add table task_progress;
alter publication supabase_realtime add table students;
