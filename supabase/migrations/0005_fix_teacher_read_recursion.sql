-- 0004's students_read_as_teacher closed a cycle that had been latent since
-- 0001: classes_read_own already let a STUDENT read their own class by
-- querying `students`, and now `students` had a policy that queries
-- `classes` right back. Evaluating any select against `students` means
-- Postgres evaluates every SELECT policy on it (combined with OR) to see if
-- any grants access — so the moment `students_read_as_teacher` existed,
-- reading `students` at all (from anyone) triggered `classes`' policies,
-- which queried `students` again, forever: "infinite recursion detected in
-- policy for relation students".
--
-- That silently poisoned the two pre-existing teacher-read policies too —
-- `attempts_read_as_teacher` (0001) and `task_progress_read_as_teacher`
-- (0002) both query students-joined-with-classes the same way, so the same
-- cycle fires the instant either of them runs.
--
-- Fix: a `security definer` helper. Its own internal query runs as the
-- function's owner rather than the calling role, which Postgres does not
-- subject to RLS unless a table was explicitly put under FORCE ROW LEVEL
-- SECURITY (none here are) — so calling it instead of a plain subquery
-- breaks the cycle instead of walking straight back into it.
create or replace function is_teacher_of_student(target_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from students s
    join classes c on c.id = s.class_id
    where s.id = target_student_id and c.teacher_id = auth.uid()
  );
$$;

create or replace function is_teacher_of_class(target_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from classes c
    where c.id = target_class_id and c.teacher_id = auth.uid()
  );
$$;

drop policy if exists students_read_as_teacher on students;
create policy students_read_as_teacher on students
  for select using (is_teacher_of_class(class_id));

drop policy if exists task_progress_read_as_teacher on task_progress;
create policy task_progress_read_as_teacher on task_progress
  for select using (is_teacher_of_student(student_id));

drop policy if exists attempts_read_as_teacher on attempts;
create policy attempts_read_as_teacher on attempts
  for select using (is_teacher_of_student(student_id));
