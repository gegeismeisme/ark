-- 0013_group_tag_scope.sql
-- Allow tag categories to be scoped to specific groups and enforce membership constraints.

begin;

alter table organization_tag_categories
  add column if not exists group_id uuid references groups(id) on delete cascade;

drop index if exists idx_tag_categories_org_name;

create unique index if not exists idx_tag_categories_org_name
on organization_tag_categories (organization_id, lower(name))
where group_id is null;

create unique index if not exists idx_tag_categories_group_name
on organization_tag_categories (group_id, lower(name))
where group_id is not null;

create or replace function ensure_tag_category_scope()
returns trigger
language plpgsql
as $$
declare
  v_group_org uuid;
begin
  if new.group_id is null then
    return new;
  end if;

  select organization_id
    into v_group_org
  from groups
  where id = new.group_id;

  if v_group_org is null then
    raise exception 'Group % not found for tag category scope', new.group_id;
  end if;

  if new.organization_id <> v_group_org then
    raise exception 'Tag category organization must match scoped group organization';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tag_category_scope on organization_tag_categories;

create trigger trg_tag_category_scope
before insert or update on organization_tag_categories
for each row
execute function ensure_tag_category_scope();

create or replace function ensure_member_tag_scope()
returns trigger
language plpgsql
as $$
declare
  v_group_id uuid;
  v_user_id uuid;
begin
  select otc.group_id
    into v_group_id
  from organization_tags ot
  join organization_tag_categories otc on otc.id = ot.category_id
  where ot.id = new.tag_id;

  if v_group_id is null then
    return new;
  end if;

  select user_id
    into v_user_id
  from organization_members
  where id = new.member_id;

  if v_user_id is null then
    raise exception 'Organization member % not found for tag assignment', new.member_id;
  end if;

  if not exists (
    select 1
    from group_members gm
    where gm.group_id = v_group_id
      and gm.user_id = v_user_id
      and gm.status = 'active'
      and gm.removed_at is null
  ) then
    raise exception 'Member % is not part of group % required by tag', v_user_id, v_group_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_member_tags_scope on member_tags;

create trigger trg_member_tags_scope
before insert or update on member_tags
for each row
execute function ensure_member_tag_scope();

drop policy if exists tag_categories_manage on organization_tag_categories;

create policy tag_categories_manage on organization_tag_categories
for all
using (
  is_org_admin(organization_id, auth.uid())
  or (
    group_id is not null
    and is_group_admin(group_id, auth.uid())
  )
)
with check (
  is_org_admin(organization_id, auth.uid())
  or (
    group_id is not null
    and is_group_admin(group_id, auth.uid())
  )
);

drop policy if exists organization_tags_manage on organization_tags;

create policy organization_tags_manage on organization_tags
for all
using (
  is_org_admin(organization_id, auth.uid())
  or exists (
    select 1
    from organization_tag_categories otc
    where otc.id = organization_tags.category_id
      and otc.group_id is not null
      and is_group_admin(otc.group_id, auth.uid())
  )
)
with check (
  is_org_admin(organization_id, auth.uid())
  or exists (
    select 1
    from organization_tag_categories otc
    where otc.id = organization_tags.category_id
      and otc.group_id is not null
      and is_group_admin(otc.group_id, auth.uid())
  )
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
  or exists (
    select 1
    from organization_tags ot
    join organization_tag_categories otc on otc.id = ot.category_id
    join group_members gm_admin on gm_admin.group_id = otc.group_id
    join organization_members om_target on om_target.id = member_tags.member_id
    join group_members gm_target
      on gm_target.group_id = otc.group_id
      and gm_target.user_id = om_target.user_id
    where ot.id = member_tags.tag_id
      and otc.group_id is not null
      and gm_admin.user_id = auth.uid()
      and gm_admin.role = 'admin'
      and gm_admin.status = 'active'
      and gm_admin.removed_at is null
      and gm_target.status = 'active'
      and gm_target.removed_at is null
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
  or exists (
    select 1
    from organization_tags ot
    join organization_tag_categories otc on otc.id = ot.category_id
    join group_members gm_admin on gm_admin.group_id = otc.group_id
    join organization_members om_target on om_target.id = member_tags.member_id
    join group_members gm_target
      on gm_target.group_id = otc.group_id
      and gm_target.user_id = om_target.user_id
    where ot.id = member_tags.tag_id
      and otc.group_id is not null
      and gm_admin.user_id = auth.uid()
      and gm_admin.role = 'admin'
      and gm_admin.status = 'active'
      and gm_admin.removed_at is null
      and gm_target.status = 'active'
      and gm_target.removed_at is null
  )
);

commit;
