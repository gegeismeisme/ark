-- 20240523_bootstrap_function_fix.sql
-- Update bootstrap_organization to reference conflict targets by constraint names,
-- eliminating ambiguous column references when returning organization_id.

begin;

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
declare
  v_org_id uuid;
  v_group_id uuid;
  v_now timestamptz := now();
begin
  insert into organizations (name, slug, owner_id)
  values (p_name, p_slug, p_owner)
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
  set organization_members.role = excluded.role,
      organization_members.status = excluded.status,
      organization_members.removed_at = null,
      organization_members.invited_by = excluded.invited_by,
      organization_members.invited_at = excluded.invited_at,
      organization_members.joined_at = excluded.joined_at,
      organization_members.updated_at = v_now;

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
  set group_members.role = excluded.role,
      group_members.status = excluded.status,
      group_members.removed_at = null,
      group_members.added_by = excluded.added_by,
      group_members.added_at = excluded.added_at,
      group_members.updated_at = v_now;

  return query select v_org_id as organization_id;
end
$$;

commit;
