-- The teacher dashboard needs a roster — which students exist in the class
-- at all, even ones with zero task_progress rows yet ("not started"). No
-- policy grants that: `students_read_self` only ever let a student read
-- their own row. Same join shape as `attempts_read_as_teacher` (0001) and
-- `task_progress_read_as_teacher` (0002).
create policy students_read_as_teacher on students
  for select using (
    exists (
      select 1 from classes c
      where c.id = students.class_id and c.teacher_id = auth.uid()
    )
  );
