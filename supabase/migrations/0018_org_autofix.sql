-- 0018_org_autofix.sql
-- Provide helper to repair orphaned organisations (missing owner membership/default group).

begin;

create or replace function heal_orphan_organizations()
returns table (
  organization_id uuid,
  fixed_owner_membership boolean,
  created_default_group boolean,
  fixed_group_membership boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org record;
  v_member_id uuid;
  v_group_id uuid;
  v_group_member_id uuid;
  v_now timestamptz := now();
  v_fixed_membership boolean;
  v_created_group boolean;
  v_fixed_group_member boolean;
begin
  for v_org in
    select o.id, o.owner_id
    from organizations o
    where o.deleted_at is null
  loop
    v_fixed_membership := false;
    v_created_group := false;
    v_fixed_group_member := false;

    select organization_members.id
    into v_member_id
    from organization_members
    where organization_members.organization_id = v_org.id
      and organization_members.user_id = v_org.owner_id
      and organization_members.status = 'active'
    limit 1;

    if v_member_id is null then
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
        v_org.id,
        v_org.owner_id,
        'owner',
        'active',
        v_org.owner_id,
        v_now,
        v_now
      )
      on conflict (organization_id, user_id) do update
        set role = excluded.role,
            status = excluded.status,
            removed_at = null,
            invited_by = excluded.invited_by,
            invited_at = excluded.invited_at,
            joined_at = excluded.joined_at,
            updated_at = v_now;
      v_fixed_membership := true;
    end if;

    select groups.id
    into v_group_id
    from groups
    where groups.organization_id = v_org.id
    order by groups.created_at asc
    limit 1;

    if v_group_id is null then
      insert into groups (organization_id, name, created_by)
      values (v_org.id, 'General', v_org.owner_id)
      returning id into v_group_id;
      v_created_group := true;
    end if;

    select group_members.id
    into v_group_member_id
    from group_members
    where group_members.group_id = v_group_id
      and group_members.user_id = v_org.owner_id
      and group_members.status = 'active'
    limit 1;

    if v_group_member_id is null then
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
        v_org.owner_id,
        'admin',
        'active',
        v_org.owner_id,
        v_now
      )
      on conflict (group_id, user_id) do update
        set role = excluded.role,
            status = excluded.status,
            removed_at = null,
            updated_at = v_now;
      v_fixed_group_member := true;
    end if;

    organization_id := v_org.id;
    fixed_owner_membership := v_fixed_membership;
    created_default_group := v_created_group;
    fixed_group_membership := v_fixed_group_member;
    return next;
  end loop;

  return;
end;
$$;

commit;
