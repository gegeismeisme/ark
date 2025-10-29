-- 0007_invites_and_join_requests.sql
-- Add organization visibility, invitation links, and join request workflow.

begin;

-- Visibility for organizations -------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type typ where typ.typname = 'organization_visibility') then
    create type organization_visibility as enum ('public', 'private');
  end if;
end $$;

alter table organizations
  add column if not exists visibility organization_visibility not null default 'public';

-- Allow public directory access while preserving owner/admin visibility.
drop policy if exists organizations_select on organizations;
create policy organizations_select on organizations
for select
using (
  visibility = 'public'
  or owner_id = auth.uid()
  or is_active_org_member(id, auth.uid())
);

-- Invitation tokens -------------------------------------------------------------

create table if not exists organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text not null unique,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  revoked_at timestamptz
);

create index if not exists organization_invites_org_idx
  on organization_invites(organization_id);

alter table organization_invites enable row level security;

drop policy if exists organization_invites_admin_select on organization_invites;
create policy organization_invites_admin_select on organization_invites
for select
using (
  is_org_admin(organization_id, auth.uid())
);

drop policy if exists organization_invites_admin_manage on organization_invites;
create policy organization_invites_admin_manage on organization_invites
for all
using (
  is_org_admin(organization_id, auth.uid())
)
with check (
  is_org_admin(organization_id, auth.uid())
);

-- Join requests -----------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type typ where typ.typname = 'join_request_status') then
    create type join_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
  end if;
end $$;

create table if not exists organization_join_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status join_request_status not null default 'pending',
  response_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists organization_join_requests_pending_unique
  on organization_join_requests(organization_id, user_id)
  where status = 'pending';

alter table organization_join_requests enable row level security;

drop policy if exists organization_join_requests_self_select on organization_join_requests;
create policy organization_join_requests_self_select on organization_join_requests
for select
using (
  user_id = auth.uid()
);

drop policy if exists organization_join_requests_admin_select on organization_join_requests;
create policy organization_join_requests_admin_select on organization_join_requests
for select
using (
  is_org_admin(organization_id, auth.uid())
);

drop policy if exists organization_join_requests_insert on organization_join_requests;
create policy organization_join_requests_insert on organization_join_requests
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from organizations o
    where o.id = organization_join_requests.organization_id
      and o.visibility = 'public'
      and o.deleted_at is null
  )
);

drop policy if exists organization_join_requests_update on organization_join_requests;
create policy organization_join_requests_update on organization_join_requests
for update
using (
  is_org_admin(organization_id, auth.uid())
)
with check (
  is_org_admin(organization_id, auth.uid())
);

-- Helper functions --------------------------------------------------------------

create or replace function is_org_public(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from organizations o
    where o.id = p_org_id
      and o.visibility = 'public'
      and o.deleted_at is null
  );
$$;

create or replace function redeem_org_invite(p_code text)
returns table (organization_id uuid, membership_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite organization_invites%rowtype;
  v_membership_id uuid;
begin
  select *
  into v_invite
  from organization_invites
  where code = p_code
    and revoked_at is null
    and (expires_at is null or expires_at > now())
    and (max_uses is null or use_count < max_uses)
  limit 1;

  if not found then
    raise exception 'Invitation is invalid or expired' using errcode = '22023';
  end if;

  insert into organization_members (organization_id, user_id, role, status, invited_by, invited_at, joined_at)
  values (v_invite.organization_id, auth.uid(), 'member', 'active', v_invite.created_by, v_invite.created_at, now())
  on conflict (organization_id, user_id)
  do update set
    status = 'active',
    removed_at = null,
    updated_at = now()
  returning id into v_membership_id;

  update organization_invites
  set use_count = use_count + 1
  where id = v_invite.id;

  return query
    select v_invite.organization_id, v_membership_id;
end;
$$;

create or replace function review_org_join_request(
  p_request_id uuid,
  p_next_status join_request_status,
  p_response_note text default null
)
returns table (request_id uuid, status join_request_status, membership_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request organization_join_requests%rowtype;
  v_membership_id uuid;
begin
  if p_next_status not in ('approved', 'rejected', 'cancelled') then
    raise exception 'Unsupported status transition' using errcode = '22023';
  end if;

  select *
  into v_request
  from organization_join_requests
  where id = p_request_id
  limit 1;

  if not found then
    raise exception 'Join request not found' using errcode = '22023';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Join request already processed' using errcode = '22023';
  end if;

  if not is_org_admin(v_request.organization_id, auth.uid()) then
    raise exception 'Unauthorized to review request' using errcode = '42501';
  end if;

  update organization_join_requests
  set status = p_next_status,
      response_note = p_response_note,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request_id;

  if p_next_status = 'approved' then
    insert into organization_members (organization_id, user_id, role, status, invited_by, invited_at, joined_at)
    values (v_request.organization_id, v_request.user_id, 'member', 'active', auth.uid(), now(), now())
    on conflict (organization_id, user_id)
    do update set
      status = 'active',
      removed_at = null,
      updated_at = now()
    returning id into v_membership_id;
  end if;

  return query
    select p_request_id, p_next_status, v_membership_id;
end;
$$;

commit;
