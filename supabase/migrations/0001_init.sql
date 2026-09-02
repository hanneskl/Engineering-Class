-- Quali Excel Trainer — classes, students, attempts.
--
-- Students sign in with a teacher-created nickname, never an email address and never their real
-- name; the nickname → pupil mapping stays on paper with the teacher. Supabase Auth is
-- email-shaped, so accounts carry a synthesised local address that no mail is ever sent to.

create table if not exists classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  teacher_id  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists students (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null unique,
  class_id    uuid references classes (id) on delete set null,
  -- Per-student data randomisation. Reserved; scenarios are not randomised yet.
  seed        integer not null default 1,
  created_at  timestamptz not null default now()
);

create table if not exists attempts (
  id          bigint generated always as identity primary key,
  student_id  uuid not null references students (id) on delete cascade,
  scenario_id text not null,
  task_id     text not null,
  -- Everything the student had entered at submission time, as raw inputs.
  inputs      jsonb not null,
  passed      boolean not null,
  points      integer not null,
  -- Skill IDs from the README catalogue, denormalised so the dashboard need not join scenarios.
  skills      text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- Append-only by design: every submission is kept, not just the passing one, so the teacher can
-- see how a student got there.
create index if not exists attempts_student_task_idx on attempts (student_id, task_id, created_at desc);

alter table classes  enable row level security;
alter table students enable row level security;
alter table attempts enable row level security;

-- A student sees only their own row.
create policy students_read_self on students
  for select using (auth.uid() = id);

create policy classes_read_own on classes
  for select using (
    teacher_id = auth.uid()
    or exists (select 1 from students s where s.id = auth.uid() and s.class_id = classes.id)
  );

create policy attempts_read_own on attempts
  for select using (student_id = auth.uid());

-- A teacher reads every attempt from their own classes.
create policy attempts_read_as_teacher on attempts
  for select using (
    exists (
      select 1
      from students s
      join classes c on c.id = s.class_id
      where s.id = attempts.student_id and c.teacher_id = auth.uid()
    )
  );

-- Deliberately NO insert/update/delete policy on attempts.
--
-- With RLS enabled and no write policy, anon and authenticated clients cannot write here at all.
-- Only the service role — which bypasses RLS and is held solely by the check-task edge function —
-- may record a result. This is what stops a student POSTing {passed: true} from devtools.

-- Per-skill progress for the teacher dashboard: which skill is a student still failing?
create or replace view student_skill_progress
with (security_invoker = true) as
select
  a.student_id,
  skill,
  count(*)                                   as attempts,
  bool_or(a.passed)                          as ever_passed,
  max(a.created_at) filter (where a.passed)  as first_passed_at
from attempts a
cross join lateral unnest(a.skills) as skill
group by a.student_id, skill;
