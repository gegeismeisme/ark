-- 20251119_fix_member_lock_check.sql
-- Relax admin check to ensure owners/admins can toggle locks reliably.

begin;

create or replace function public.set_member_lock(p_member_id uuid, p_locked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_admin_role text;
begin
  select organization_id
  into v_org_id
  from organization_members
  where id = p_member_id;

  if v_org_id is null then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;

  select role
  into v_admin_role
  from organization_members
  where organization_id = v_org_id
    and user_id = auth.uid()
    and status = 'active'
    and removed_at is null
  limit 1;

  if v_admin_role is distinct from 'owner' and v_admin_role is distinct from 'admin' then
    raise exception 'insufficient privilege to lock member' using errcode = '42501';
  end if;

  update organization_members
    set display_name_locked = coalesce(p_locked, false)
  where id = p_member_id;
end;
$$;

commit;
