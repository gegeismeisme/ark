-- 0004_harden_membership_predicates.sql
-- Ensure membership helper predicates execute with elevated privileges to avoid recursive RLS evaluation.

begin;

create or replace function is_active_org_member(p_org_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
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

commit;
