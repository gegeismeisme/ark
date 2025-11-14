-- 20240525_bootstrap_function_mux.sql
-- Introduce bootstrap_organization_extended (with description & visibility)
-- and restore the legacy bootstrap_organization signature as a wrapper.

begin;

drop function if exists bootstrap_organization(text, text, uuid, text, organization_visibility);

create or replace function bootstrap_organization_extended(
  p_name text,
  p_slug text,
  p_owner uuid,
  p_description text default null,
  p_visibility organization_visibility default 'public'
)
returns table (new_organization_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_group_id uuid;
  v_now timestamptz := now();
begin
  insert into organizations (name, slug, owner_id, description, visibility)
  values (p_name, p_slug, p_owner, p_description, coalesce(p_visibility, 'public'))
  returning id into v_org_id;

  insert into organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_by,
    invited_at,
    joined_at
  )
  values (
    v_org_id,
    p_owner,
    'owner',
    'active',
    p_owner,
    v_now,
    v_now
  )
  on conflict on constraint organization_members_organization_id_user_id_key do update
  set role = excluded.role,
      status = excluded.status,
      removed_at = null,
      invited_by = excluded.invited_by,
      invited_at = excluded.invited_at,
      joined_at = excluded.joined_at,
      updated_at = v_now;

  insert into groups (organization_id, name, created_by)
  values (v_org_id, 'General', p_owner)
  returning id into v_group_id;

  insert into group_members (
    group_id,
    user_id,
    role,
    status,
    added_by,
    added_at
  )
  values (
    v_group_id,
    p_owner,
    'admin',
    'active',
    p_owner,
    v_now
  )
  on conflict on constraint group_members_group_id_user_id_key do update
  set role = excluded.role,
      status = excluded.status,
      removed_at = null,
      added_by = excluded.added_by,
      added_at = excluded.added_at,
      updated_at = v_now;

  return query select v_org_id as new_organization_id;
end
$$;

create or replace function bootstrap_organization(
  p_name text,
  p_slug text,
  p_owner uuid
)
returns table (organization_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select new_organization_id as organization_id
    from bootstrap_organization_extended(p_name, p_slug, p_owner, null, 'public');
end
$$;

commit;
