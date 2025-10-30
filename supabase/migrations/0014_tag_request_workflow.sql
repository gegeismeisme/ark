-- 0014_tag_request_workflow.sql
-- Member self-service tag requests with approval workflow.

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tag_request_status') then
    create type tag_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
  end if;
end
$$;

create table if not exists tag_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references organization_members(id) on delete cascade,
  tag_id uuid not null references organization_tags(id) on delete cascade,
  status tag_request_status not null default 'pending',
  reason text,
  admin_note text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tag_requests_member on tag_requests(member_id);
create index if not exists idx_tag_requests_tag on tag_requests(tag_id);

create unique index if not exists idx_tag_requests_pending_unique
on tag_requests(member_id, tag_id)
where status = 'pending';

drop trigger if exists trg_tag_requests_updated_at on tag_requests;
create trigger trg_tag_requests_updated_at
before update on tag_requests
for each row
execute function set_updated_at();

create or replace function ensure_tag_request_consistency()
returns trigger
language plpgsql
as $$
declare
  v_tag record;
  v_member_org uuid;
begin
  select ot.organization_id, otc.group_id
    into v_tag
  from organization_tags ot
  join organization_tag_categories otc on otc.id = ot.category_id
  where ot.id = new.tag_id;

  if v_tag is null then
    raise exception 'Tag % not found for request', new.tag_id;
  end if;

  if new.organization_id <> v_tag.organization_id then
    raise exception 'Tag % does not belong to organization %', new.tag_id, new.organization_id;
  end if;

  select organization_id
    into v_member_org
  from organization_members
  where id = new.member_id;

  if v_member_org is null then
    raise exception 'Organization member % not found', new.member_id;
  end if;

  if v_member_org <> new.organization_id then
    raise exception 'Member % does not belong to organization %', new.member_id, new.organization_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tag_requests_consistency on tag_requests;
create trigger trg_tag_requests_consistency
before insert or update on tag_requests
for each row
execute function ensure_tag_request_consistency();

create or replace function apply_tag_request_outcome()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' and (old is null or old.status <> 'approved') then
    insert into member_tags (organization_id, member_id, tag_id)
    values (new.organization_id, new.member_id, new.tag_id)
    on conflict (member_id, tag_id) do nothing;

    if new.resolved_at is null then
      new.resolved_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tag_requests_apply_outcome on tag_requests;
create trigger trg_tag_requests_apply_outcome
before update on tag_requests
for each row
execute function apply_tag_request_outcome();

alter table tag_requests enable row level security;

drop policy if exists tag_requests_select on tag_requests;
create policy tag_requests_select on tag_requests
for select using (
  is_org_admin(organization_id, auth.uid())
  or exists (
    select 1
    from organization_members om
    where om.id = tag_requests.member_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.removed_at is null
  )
  or exists (
    select 1
    from organization_tags ot
    join organization_tag_categories otc on otc.id = ot.category_id
    where ot.id = tag_requests.tag_id
      and otc.group_id is not null
      and is_group_admin(otc.group_id, auth.uid())
  )
);

drop policy if exists tag_requests_insert on tag_requests;
create policy tag_requests_insert on tag_requests
for insert with check (
  is_org_admin(organization_id, auth.uid())
  or exists (
    select 1
    from organization_members om
    where om.id = tag_requests.member_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.removed_at is null
  )
  or exists (
    select 1
    from organization_tags ot
    join organization_tag_categories otc on otc.id = ot.category_id
    where ot.id = tag_requests.tag_id
      and otc.group_id is not null
      and is_group_admin(otc.group_id, auth.uid())
  )
);

drop policy if exists tag_requests_update on tag_requests;
create policy tag_requests_update on tag_requests
for update using (
  is_org_admin(organization_id, auth.uid())
  or exists (
    select 1
    from organization_members om
    where om.id = tag_requests.member_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.removed_at is null
  )
  or exists (
    select 1
    from organization_tags ot
    join organization_tag_categories otc on otc.id = ot.category_id
    where ot.id = tag_requests.tag_id
      and otc.group_id is not null
      and is_group_admin(otc.group_id, auth.uid())
  )
)
with check (
  (
    is_org_admin(organization_id, auth.uid())
    or exists (
      select 1
      from organization_tags ot
      join organization_tag_categories otc on otc.id = ot.category_id
      where ot.id = tag_requests.tag_id
        and otc.group_id is not null
        and is_group_admin(otc.group_id, auth.uid())
    )
  )
  or (
    status = 'cancelled'
    and exists (
      select 1
      from organization_members om
      where om.id = tag_requests.member_id
        and om.user_id = auth.uid()
        and om.status = 'active'
        and om.removed_at is null
    )
  )
);

drop policy if exists tag_requests_delete on tag_requests;
create policy tag_requests_delete on tag_requests
for delete using (
  is_org_admin(organization_id, auth.uid())
  or exists (
    select 1
    from organization_tags ot
    join organization_tag_categories otc on otc.id = ot.category_id
    where ot.id = tag_requests.tag_id
      and otc.group_id is not null
      and is_group_admin(otc.group_id, auth.uid())
  )
);

commit;
