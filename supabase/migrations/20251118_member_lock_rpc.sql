-- 20251118_member_lock_rpc.sql
-- Security definer helper for toggling member nickname/tag locks.

begin;

drop function if exists public.set_member_lock(uuid, boolean);

create or replace function public.set_member_lock(p_member_id uuid, p_locked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id
  into v_org_id
  from organization_members
  where id = p_member_id;

  if v_org_id is null then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;

  if not is_org_admin(v_org_id, auth.uid()) then
    raise exception 'insufficient privilege to lock member' using errcode = '42501';
  end if;

  update organization_members
    set display_name_locked = coalesce(p_locked, false)
  where id = p_member_id;
end;
$$;

grant execute on function public.set_member_lock(uuid, boolean) to authenticated;

commit;
