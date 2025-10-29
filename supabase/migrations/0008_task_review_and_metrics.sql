-- 0008_task_review_and_metrics.sql
-- Introduce review workflow fields and analytics view for assignments.

begin;

do $$
begin
  if not exists (select 1 from pg_type typ where typ.typname = 'task_review_status') then
    create type task_review_status as enum ('pending', 'accepted', 'changes_requested');
  end if;
end $$;

alter table task_assignments
  add column if not exists completion_note text,
  add column if not exists review_status task_review_status not null default 'pending',
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create table if not exists task_notification_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  assignment_id uuid references task_assignments(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table task_notification_queue enable row level security;

drop policy if exists task_notification_queue_read on task_notification_queue;
create policy task_notification_queue_read on task_notification_queue
for select
using (
  organization_id is null
  or is_org_admin(organization_id, auth.uid())
);

create or replace function log_task_assignment_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task tasks%rowtype;
  v_event text;
begin
  select *
    into v_task
    from tasks
   where id = coalesce(new.task_id, old.task_id)
   limit 1;

  if tg_op = 'INSERT' then
    v_event := 'assignment_created';
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      v_event := 'status_changed';
    elsif new.review_status is distinct from old.review_status then
      v_event := 'review_updated';
    else
      return new;
    end if;
  else
    return new;
  end if;

  insert into task_notification_queue (
    organization_id,
    task_id,
    assignment_id,
    event_type,
    payload
  )
  values (
    v_task.organization_id,
    v_task.id,
    new.id,
    v_event,
    jsonb_build_object(
      'assignee_id', new.assignee_id,
      'old_status', old.status,
      'new_status', new.status,
      'old_review_status', old.review_status,
      'new_review_status', new.review_status
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_task_assignment_notify on task_assignments;
create trigger trg_task_assignment_notify
after insert or update on task_assignments
for each row
execute function log_task_assignment_event();

create or replace view task_assignment_summary
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
  min(t.due_at) as earliest_due_at,
  max(ta.completed_at) as latest_completion_at
from tasks t
left join task_assignments ta on ta.task_id = t.id
group by t.id;

drop policy if exists task_assignments_update_self on task_assignments;

create policy task_assignments_update_self on task_assignments
for update
using (assignee_id = auth.uid())
with check (
  assignee_id = auth.uid()
  and review_status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

commit;
