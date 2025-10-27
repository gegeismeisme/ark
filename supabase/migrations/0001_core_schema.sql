-- 0001_core_schema.sql
-- Core schema, plan enforcement, and baseline RLS policies.

begin;

create extension if not exists "pgcrypto";

create type plan_tier as enum ('free', 'pro', 'enterprise');
create type organization_member_role as enum ('owner', 'admin', 'member');
create type membership_status as enum ('invited', 'active', 'suspended');
create type group_role as enum ('admin', 'publisher', 'member');
create type task_assignment_status as enum ('sent', 'received', 'completed', 'archived');

create table plan_limits (
  plan_tier plan_tier primary key,
  max_orgs_per_user integer,
  max_groups_per_organization integer,
  max_members_per_organization integer,
  max_group_admin_roles_per_user integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into plan_limits (
  plan_tier,
  max_orgs_per_user,
  max_groups_per_organization,
  max_members_per_organization,
  max_group_admin_roles_per_user
) values
  ('free', 1, 5, 50, 10),
  ('pro', 10, 25, 250, 50),
  ('enterprise', null, null, null, null)
on conflict (plan_tier) do update
set
  max_orgs_per_user = excluded.max_orgs_per_user,
  max_groups_per_organization = excluded.max_groups_per_organization,
  max_members_per_organization = excluded.max_members_per_organization,
  max_group_admin_roles_per_user = excluded.max_group_admin_roles_per_user,
  updated_at = now();

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  plan_tier plan_tier not null default 'free',
  plan_expires_at timestamptz,
  locale text default 'zh-CN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deletion_requested_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  erasure_reason text,
  constraint profiles_deletion_requires_request check (
    deleted_at is null or deletion_requested_at is not null
  )
);

create trigger trg_profiles_updated_at
before update on profiles
for each row
execute function set_updated_at();

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, plan_tier)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function handle_new_user();

create table organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_tier plan_tier not null default 'free',
  name text not null,
  slug text unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  erasure_requested_at timestamptz
);

create index organizations_owner_id_idx on organizations(owner_id);

create trigger trg_organizations_updated_at
before update on organizations
for each row
execute function set_updated_at();

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role organization_member_role not null default 'member',
  status membership_status not null default 'active',
  invited_by uuid references auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx on organization_members(user_id);
create index organization_members_org_idx on organization_members(organization_id);

create trigger trg_organization_members_updated_at
before update on organization_members
for each row
execute function set_updated_at();

create table groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, lower(name))
);

create index groups_org_idx on groups(organization_id);

create trigger trg_groups_updated_at
before update on groups
for each row
execute function set_updated_at();

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role group_role not null default 'member',
  status membership_status not null default 'active',
  added_by uuid references auth.users(id),
  added_at timestamptz default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index group_members_user_idx on group_members(user_id);
create index group_members_group_idx on group_members(group_id);

create trigger trg_group_members_updated_at
before update on group_members
for each row
execute function set_updated_at();

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index tasks_group_idx on tasks(group_id);
create index tasks_org_idx on tasks(organization_id);

create trigger trg_tasks_updated_at
before update on tasks
for each row
execute function set_updated_at();

create table task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  assignee_id uuid not null references auth.users(id) on delete cascade,
  status task_assignment_status not null default 'sent',
  received_at timestamptz,
  completed_at timestamptz,
  submitted_at timestamptz,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, assignee_id)
);

create index task_assignments_assignee_idx on task_assignments(assignee_id);

create trigger trg_task_assignments_updated_at
before update on task_assignments
for each row
execute function set_updated_at();

create table task_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references task_assignments(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  content jsonb,
  storage_paths text[],
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_idx on audit_logs(organization_id);

-- Helper predicates
create or replace function is_active_org_member(p_org_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from organization_members om
    where om.organization_id = p_org_id
      and om.user_id = p_user_id
      and om.status = 'active'
      and om.removed_at is null
  );
$$;

create or replace function is_active_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
      and gm.status = 'active'
      and gm.removed_at is null
  );
$$;

create or replace function is_group_admin(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
      and gm.status = 'active'
      and gm.removed_at is null
      and gm.role = 'admin'
  );
$$;

create or replace function is_org_admin(p_org_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from organization_members om
    where om.organization_id = p_org_id
      and om.user_id = p_user_id
      and om.status = 'active'
      and om.removed_at is null
      and om.role in ('owner', 'admin')
  );
$$;

-- Plan limit enforcement
create or replace function enforce_user_org_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_plan plan_tier;
  effective_plan plan_tier;
  max_orgs integer;
  active_count integer;
begin
  select plan_tier
  into owner_plan
  from profiles
  where id = new.owner_id;

  if owner_plan is null then
    owner_plan := 'free';
  end if;

  effective_plan := coalesce(new.plan_tier, owner_plan);

  select max_orgs_per_user
  into max_orgs
  from plan_limits
  where plan_tier = effective_plan;

  if max_orgs is not null then
    select count(*)
    into active_count
    from organizations
    where owner_id = new.owner_id
      and deleted_at is null;

    if active_count >= max_orgs then
      raise exception 'plan_limit_organizations_exceeded' using errcode = 'P0001';
    end if;
  end if;

  new.plan_tier := effective_plan;
  return new;
end;
$$;

create trigger trg_enforce_user_org_limit
before insert on organizations
for each row
execute function enforce_user_org_limit();

create or replace function enforce_org_group_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_plan plan_tier;
  max_groups integer;
  active_count integer;
begin
  select plan_tier
  into org_plan
  from organizations
  where id = new.organization_id;

  select max_groups_per_organization
  into max_groups
  from plan_limits
  where plan_tier = org_plan;

  if max_groups is not null then
    select count(*)
    into active_count
    from groups
    where organization_id = new.organization_id
      and deleted_at is null;

    if active_count >= max_groups then
      raise exception 'plan_limit_groups_exceeded' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_org_group_limit
before insert on groups
for each row
execute function enforce_org_group_limit();

create or replace function enforce_org_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_plan plan_tier;
  max_members integer;
  active_count integer;
begin
  select plan_tier
  into org_plan
  from organizations
  where id = new.organization_id;

  select max_members_per_organization
  into max_members
  from plan_limits
  where plan_tier = org_plan;

  if max_members is not null then
    select count(*)
    into active_count
    from organization_members
    where organization_id = new.organization_id
      and status = 'active'
      and removed_at is null;

    if active_count >= max_members then
      raise exception 'plan_limit_members_exceeded' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_org_member_limit
before insert on organization_members
for each row
execute function enforce_org_member_limit();

create or replace function enforce_group_admin_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_plan plan_tier;
  admin_cap integer;
  current_admins integer;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  select plan_tier
  into user_plan
  from profiles
  where id = new.user_id;

  if user_plan is null then
    user_plan := 'free';
  end if;

  select max_group_admin_roles_per_user
  into admin_cap
  from plan_limits
  where plan_tier = user_plan;

  if admin_cap is null then
    return new;
  end if;

  select count(*)
  into current_admins
  from group_members gm
  where gm.user_id = new.user_id
    and gm.role = 'admin'
    and gm.status = 'active'
    and gm.removed_at is null;

  if tg_op = 'UPDATE' and old.role = 'admin' and old.status = 'active' and old.removed_at is null then
    current_admins := current_admins - 1;
  end if;

  if new.role = 'admin' and new.status = 'active' and new.removed_at is null then
    current_admins := current_admins + 1;
  end if;

  if current_admins > admin_cap then
    raise exception 'plan_limit_group_admin_roles_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_group_admin_limit
before insert or update on group_members
for each row
execute function enforce_group_admin_limit();

-- Account erasure helper
create or replace function purge_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from audit_logs where actor_id = p_user_id;
  delete from task_submissions where submitted_by = p_user_id;
  delete from task_assignments where assignee_id = p_user_id;
  delete from group_members where user_id = p_user_id;
  delete from organization_members where user_id = p_user_id;
  delete from organizations where owner_id = p_user_id;
  delete from profiles where id = p_user_id;
end;
$$;

create or replace function handle_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform purge_user(old.id);
  return old;
end;
$$;

create trigger trg_auth_user_deleted
after delete on auth.users
for each row
execute function handle_user_deleted();

-- Row Level Security
alter table plan_limits enable row level security;
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table tasks enable row level security;
alter table task_assignments enable row level security;
alter table task_submissions enable row level security;
alter table audit_logs enable row level security;

create policy plan_limits_read on plan_limits
for select
using (true);

create policy profile_read on profiles
for select
using (id = auth.uid());

create policy profile_update on profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy organizations_select on organizations
for select
using (
  is_active_org_member(id, auth.uid())
);

create policy organizations_insert on organizations
for insert
with check (owner_id = auth.uid());

create policy organizations_modify on organizations
for update
using (
  is_active_org_member(id, auth.uid())
  and is_org_admin(id, auth.uid())
)
with check (
  is_org_admin(id, auth.uid())
);

create policy organization_members_select on organization_members
for select
using (
  is_active_org_member(organization_id, auth.uid())
);

create policy organization_members_manage_self on organization_members
for delete
using (user_id = auth.uid());

create policy groups_select on groups
for select
using (
  is_active_org_member(organization_id, auth.uid())
);

create policy groups_insert on groups
for insert
with check (
  is_active_org_member(organization_id, auth.uid())
  and is_org_admin(organization_id, auth.uid())
);
-- Insert policy relies on application to attach creator as admin subsequently.

create policy group_members_select on group_members
for select
using (
  is_active_group_member(group_id, auth.uid())
);

create policy group_members_manage_self on group_members
for delete
using (user_id = auth.uid());

create policy tasks_select on tasks
for select
using (
  is_active_group_member(group_id, auth.uid())
);

create policy tasks_admin_manage on tasks
for all
using (
  is_group_admin(group_id, auth.uid())
)
with check (
  is_group_admin(group_id, auth.uid())
);

create policy task_assignments_read on task_assignments
for select
using (
  assignee_id = auth.uid()
  or exists (
    select 1
    from tasks t
    where t.id = task_assignments.task_id
      and is_group_admin(t.group_id, auth.uid())
  )
);

create policy task_assignments_update_self on task_assignments
for update
using (assignee_id = auth.uid())
with check (assignee_id = auth.uid());

create policy task_assignments_admin_manage on task_assignments
for all
using (
  exists (
    select 1
    from tasks t
    where t.id = task_assignments.task_id
      and is_group_admin(t.group_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from tasks t
    where t.id = task_assignments.task_id
      and is_group_admin(t.group_id, auth.uid())
  )
);

create policy task_submissions_select on task_submissions
for select
using (
  submitted_by = auth.uid()
  or exists (
    select 1
    from task_assignments ta
    join tasks t on t.id = ta.task_id
    where ta.id = task_submissions.assignment_id
      and (ta.assignee_id = auth.uid() or is_group_admin(t.group_id, auth.uid()))
  )
);

create policy task_submissions_manage on task_submissions
for all
using (
  submitted_by = auth.uid()
  or exists (
    select 1
    from task_assignments ta
    join tasks t on t.id = ta.task_id
    where ta.id = task_submissions.assignment_id
      and is_group_admin(t.group_id, auth.uid())
  )
)
with check (
  submitted_by = auth.uid()
  or exists (
    select 1
    from task_assignments ta
    join tasks t on t.id = ta.task_id
    where ta.id = task_submissions.assignment_id
      and is_group_admin(t.group_id, auth.uid())
  )
);

create policy audit_logs_select on audit_logs
for select
using (
  organization_id is null
  or is_active_org_member(organization_id, auth.uid())
);

commit;
