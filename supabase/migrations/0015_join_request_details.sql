-- 0015_join_request_details.sql
-- Provide a helper RPC to expose join request details (with profile info) to org admins.

begin;

create or replace function list_org_join_requests(p_org_id uuid)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  message text,
  status join_request_status,
  created_at timestamptz,
  reviewed_at timestamptz,
  response_note text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_org_admin(p_org_id, auth.uid()) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  return query
    select
      r.id,
      r.user_id,
      p.full_name,
      p.email,
      r.message,
      r.status,
      r.created_at,
      r.reviewed_at,
      r.response_note
    from organization_join_requests r
    left join profiles p on p.id = r.user_id
    where r.organization_id = p_org_id
    order by r.created_at desc;
end;
$$;

commit;
