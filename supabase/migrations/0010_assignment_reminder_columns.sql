-- 0010_assignment_reminder_columns.sql
-- Add reminder tracking fields on task assignments for due/overdue notifications.

begin;

alter table task_assignments
  add column if not exists due_reminder_sent_at timestamptz,
  add column if not exists overdue_reminder_sent_at timestamptz;

create index if not exists idx_task_assignments_due_reminder on task_assignments (due_reminder_sent_at);
create index if not exists idx_task_assignments_overdue_reminder on task_assignments (overdue_reminder_sent_at);

commit;
