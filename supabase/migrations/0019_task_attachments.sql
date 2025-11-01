
-- 0019_task_attachments.sql
-- Add task attachments metadata table and required-attachment flag.

begin;

alter table tasks
  add column if not exists require_attachment boolean not null default false;

create table if not exists task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  file_path text not null unique,
  content_type text not null,
  size_bytes integer not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists task_attachments_task_idx on task_attachments(task_id);
create index if not exists task_attachments_org_idx on task_attachments(organization_id);

alter table task_attachments enable row level security;

drop policy if exists task_attachments_select_members on task_attachments;
create policy task_attachments_select_members
on task_attachments
for select
using (
  auth.role() = 'service_role'
  or is_active_org_member(organization_id, auth.uid())
);

drop policy if exists task_attachments_insert_members on task_attachments;
create policy task_attachments_insert_members
on task_attachments
for insert
with check (
  auth.role() = 'service_role'
  or (
    uploaded_by = auth.uid()
    and is_active_org_member(organization_id, auth.uid())
  )
);

drop policy if exists task_attachments_delete_members on task_attachments;
create policy task_attachments_delete_members
on task_attachments
for delete
using (
  auth.role() = 'service_role'
  or (
    uploaded_by = auth.uid()
    and is_active_org_member(organization_id, auth.uid())
  )
);

commit;
