-- 0012_organization_tags.sql
-- Tag categories, tags, and member assignments for organization-level filtering.

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tag_selection_type') then
    create type tag_selection_type as enum ('single', 'multiple');
  end if;
end
$$;

create table if not exists organization_tag_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  is_required boolean not null default false,
  selection_type tag_selection_type not null default 'single',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category_id uuid not null references organization_tag_categories(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists member_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references organization_members(id) on delete cascade,
  tag_id uuid not null references organization_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, tag_id)
);

create index if not exists idx_tag_categories_org on organization_tag_categories (organization_id);
create unique index if not exists idx_tag_categories_org_name on organization_tag_categories (organization_id, lower(name));
create index if not exists idx_organization_tags_category on organization_tags (category_id);
create unique index if not exists idx_organization_tags_category_name on organization_tags (category_id, lower(name));
create index if not exists idx_member_tags_member on member_tags (member_id);
create index if not exists idx_member_tags_tag on member_tags (tag_id);

drop trigger if exists trg_organization_tag_categories_updated_at on organization_tag_categories;
create trigger trg_organization_tag_categories_updated_at
before update on organization_tag_categories
for each row
execute function set_updated_at();

drop trigger if exists trg_organization_tags_updated_at on organization_tags;
create trigger trg_organization_tags_updated_at
before update on organization_tags
for each row
execute function set_updated_at();

drop trigger if exists trg_member_tags_updated_at on member_tags;
create trigger trg_member_tags_updated_at
before update on member_tags
for each row
execute function set_updated_at();

alter table organization_tag_categories enable row level security;
alter table organization_tags enable row level security;
alter table member_tags enable row level security;

drop policy if exists tag_categories_select on organization_tag_categories;
create policy tag_categories_select on organization_tag_categories
for select
using (
  exists (
    select 1
    from organization_members om
    where om.organization_id = organization_tag_categories.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.removed_at is null
  )
);

drop policy if exists tag_categories_manage on organization_tag_categories;
create policy tag_categories_manage on organization_tag_categories
for all
using (is_org_admin(organization_id, auth.uid()))
with check (is_org_admin(organization_id, auth.uid()));

drop policy if exists organization_tags_select on organization_tags;
create policy organization_tags_select on organization_tags
for select
using (
  exists (
    select 1
    from organization_members om
    where om.organization_id = organization_tags.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.removed_at is null
  )
);

drop policy if exists organization_tags_manage on organization_tags;
create policy organization_tags_manage on organization_tags
for all
using (is_org_admin(organization_id, auth.uid()))
with check (is_org_admin(organization_id, auth.uid()));

drop policy if exists member_tags_select on member_tags;
create policy member_tags_select on member_tags
for select
using (
  exists (
    select 1
    from organization_members om
    where om.id = member_tags.member_id
      and om.organization_id = member_tags.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.removed_at is null
  )
  or is_org_admin(member_tags.organization_id, auth.uid())
);

drop policy if exists member_tags_manage on member_tags;
create policy member_tags_manage on member_tags
for all
using (
  is_org_admin(member_tags.organization_id, auth.uid())
  or exists (
    select 1
    from organization_members om
    where om.id = member_tags.member_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.removed_at is null
  )
)
with check (
  is_org_admin(member_tags.organization_id, auth.uid())
  or exists (
    select 1
    from organization_members om
    where om.id = member_tags.member_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.removed_at is null
  )
);

commit;
