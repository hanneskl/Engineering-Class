-- Prefixes every table with engineering_class_, so this app's tables are
-- recognisable at a glance in a Supabase project other apps may share.
--
-- Policies, indexes, foreign keys and the Realtime publication all hang on
-- the table itself, not its name, so they follow the rename on their own.
-- The two security-definer helpers from 0005 are the exception: a SQL
-- function body is stored as text and still names the old tables, so both
-- are recreated here with the new names.

alter table classes       rename to engineering_class_classes;
alter table students      rename to engineering_class_students;
alter table attempts      rename to engineering_class_attempts;
alter table task_progress rename to engineering_class_task_progress;
-- The view from 0001 follows its table on its own; only its name changes.
alter view student_skill_progress rename to engineering_class_student_skill_progress;

create or replace function is_teacher_of_student(target_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from engineering_class_students s
    join engineering_class_classes c on c.id = s.class_id
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
    select 1 from engineering_class_classes c
    where c.id = target_class_id and c.teacher_id = auth.uid()
  );
$$;
