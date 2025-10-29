-- 0011_extend_task_assignment_summary.sql
-- Extend task assignment summary view with reminder statistics.

begin;

drop view if exists task_assignment_summary;

create view task_assignment_summary
with (security_barrier) as
select
  t.id as task_id,
  t.organization_id,
  t.group_id,
  count(ta.id) as assignment_count,
  count(*) filter (where ta.status = 'completed') as completed_count,
  count(*) filter (where ta.review_status = 'accepted') as accepted_count,
  count(*) filter (where ta.review_status = 'changes_requested') as changes_requested_count,
  count(*) filter (
    where ta.status <> 'archived'
      and t.due_at is not null
      and t.due_at < now()
      and ta.review_status <> 'accepted'
  ) as overdue_count,
  count(*) filter (where ta.due_reminder_sent_at is not null) as due_reminder_count,
  count(*) filter (where ta.overdue_reminder_sent_at is not null) as overdue_reminder_count,
  count(*) filter (
    where ta.due_reminder_sent_at is null
      and ta.status <> 'completed'
      and ta.review_status <> 'accepted'
      and t.due_at is not null
      and t.due_at > now()
      and t.due_at <= now() + interval '24 hours'
  ) as pending_due_reminder_count,
  count(*) filter (
    where ta.overdue_reminder_sent_at is null
      and ta.status <> 'completed'
      and ta.review_status <> 'accepted'
      and t.due_at is not null
      and t.due_at < now()
  ) as pending_overdue_reminder_count,
  min(t.due_at) as earliest_due_at,
  max(ta.completed_at) as latest_completion_at
from tasks t
left join task_assignments ta on ta.task_id = t.id
group by t.id;

commit;
