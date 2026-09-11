-- Anonymous sign-in (src/progress/anonAuth.ts) needs to write its own
-- `students` row on first sign-in, and again whenever the typed name
-- changes. 0001_init.sql only ever gave `students` a read-own policy
-- (students_read_self) — nothing let a student insert or update their own
-- row, so with RLS enabled that upsert was silently rejected every time.
-- Same self-service shape as task_progress's write policies in 0002.
create policy students_write_own on students
  for insert with check (id = auth.uid());
create policy students_update_own on students
  for update using (id = auth.uid());
